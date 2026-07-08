import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {
  handleCreateCheckoutRequest,
  handleGenerateEmailRequest,
  handlePortalRequest,
  handleStripeWebhook,
  handleSuggestionsRequest,
  handleUsageRequest,
} from './server/handlers.js'
import { getClientIdFromRequest } from './server/billing.js'

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const SUGGESTION_RATE_LIMIT_MAX = 10;
const rateBuckets = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(key, maxRequests = RATE_LIMIT_MAX_REQUESTS) {
  const now = Date.now();
  const bucket = rateBuckets.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now >= bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  bucket.count += 1;
  rateBuckets.set(key, bucket);

  if (bucket.count > maxRequests) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload, headers = {}) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ProDraft-Client-Id');
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.end(JSON.stringify(payload));
}

function createApiMiddleware({ apiKey }) {
  return async (req, res) => {
    const url = req.url?.split('?')[0];

    if (req.method === 'OPTIONS' && url?.startsWith('/api/')) {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ProDraft-Client-Id');
      res.end();
      return true;
    }

    if (req.method === 'GET' && url === '/api/usage') {
      try {
        const result = await handleUsageRequest(req);
        sendJson(res, result.status, result.body);
      } catch (error) {
        sendJson(res, 500, { error: { message: error.message || 'Could not load usage.' } });
      }
      return true;
    }

    if (req.method === 'POST' && url === '/api/billing/create-checkout') {
      try {
        const body = await readJsonBody(req);
        const result = await handleCreateCheckoutRequest(req, body);
        sendJson(res, result.status, result.body);
      } catch (error) {
        sendJson(res, 500, { error: { message: error.message || 'Could not start checkout.' } });
      }
      return true;
    }

    if (req.method === 'POST' && url === '/api/billing/portal') {
      try {
        const result = await handlePortalRequest(req);
        sendJson(res, result.status, result.body);
      } catch (error) {
        sendJson(res, 500, { error: { message: error.message || 'Could not open billing portal.' } });
      }
      return true;
    }

    if (req.method === 'POST' && url === '/api/billing/webhook') {
      try {
        const rawBody = await readRawBody(req);
        const signature = req.headers['stripe-signature'];
        const result = await handleStripeWebhook(rawBody, signature);
        sendJson(res, result.status, result.body);
      } catch (error) {
        sendJson(res, 400, { error: { message: error.message || 'Webhook error.' } });
      }
      return true;
    }

    if (req.method === 'POST' && url === '/api/generate-email') {
      const clientId = getClientIdFromRequest(req);
      const rateLimit = checkRateLimit(`generate:${getClientIp(req)}:${clientId || 'anon'}`);
      if (!rateLimit.allowed) {
        sendJson(res, 429, { error: { message: 'Too many requests. Please wait and try again.' } }, {
          'Retry-After': String(rateLimit.retryAfterSeconds),
        });
        return true;
      }

      try {
        const body = await readJsonBody(req);
        const result = await handleGenerateEmailRequest(req, body, apiKey);
        sendJson(res, result.status, result.body);
      } catch (error) {
        sendJson(res, 500, { error: { message: error.message || 'Proxy request failed.' } });
      }
      return true;
    }

    if (req.method === 'POST' && url === '/api/suggestions') {
      const rateLimit = checkRateLimit(`suggestions:${getClientIp(req)}`, SUGGESTION_RATE_LIMIT_MAX);
      if (!rateLimit.allowed) {
        sendJson(res, 429, { error: { message: 'Too many requests. Please wait and try again.' } }, {
          'Retry-After': String(rateLimit.retryAfterSeconds),
        });
        return true;
      }

      try {
        const body = await readJsonBody(req);
        const result = await handleSuggestionsRequest(body);
        sendJson(res, result.status, result.body);
      } catch (error) {
        sendJson(res, 500, { error: { message: error.message || 'Could not save suggestion.' } });
      }
      return true;
    }

    return false;
  };
}

function apiPlugin(options) {
  const handler = createApiMiddleware(options);

  const attach = (server) => {
    server.middlewares.use(async (req, res, next) => {
      try {
        const handled = await handler(req, res);
        if (!handled) {
          next();
        }
      } catch (error) {
        next(error);
      }
    });
  };

  return {
    name: 'prodraft-api-plugin',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      apiPlugin({ apiKey: env.GEMINI_API_KEY }),
    ],
  };
});
