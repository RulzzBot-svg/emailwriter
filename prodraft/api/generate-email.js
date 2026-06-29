import { handleGenerateEmailRequest } from './handlers.js';

const buckets = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(key) {
  const now = Date.now();
  const bucket = buckets.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now >= bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count > RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed.' } });
    return;
  }

  const clientId = req.headers['x-prodraft-client-id'] || req.headers['X-ProDraft-Client-Id'];
  const rateLimit = checkRateLimit(`generate:${getClientIp(req)}:${clientId || 'anon'}`);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
    res.status(429).json({ error: { message: 'Too many requests. Please wait and try again.' } });
    return;
  }

  try {
    const result = await handleGenerateEmailRequest(req, req.body || {}, process.env.GEMINI_API_KEY);
    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(500).json({ error: { message: error?.message || 'Server request failed.' } });
  }
}
