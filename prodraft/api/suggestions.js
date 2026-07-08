import {
  clampText,
  isAllowedWebhookUrl,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_SUGGESTION_LENGTH,
} from '../server/request-limits.js';

const buckets = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const SUGGESTION_RATE_LIMIT_MAX = 10;

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

  if (bucket.count > SUGGESTION_RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed.' } });
    return;
  }

  const rateLimit = checkRateLimit(getClientIp(req));
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
    res.status(429).json({ error: { message: 'Too many requests. Please wait and try again.' } });
    return;
  }

  try {
    const { name = '', email = '', suggestion = '' } = req.body || {};
    const safeSuggestion = clampText(suggestion, MAX_SUGGESTION_LENGTH);

    if (!safeSuggestion) {
      res.status(400).json({ error: { message: 'Suggestion is required.' } });
      return;
    }

    const payload = {
      name: clampText(name, MAX_NAME_LENGTH),
      email: clampText(email, MAX_EMAIL_LENGTH),
      suggestion: safeSuggestion,
      receivedAt: new Date().toISOString(),
    };

    const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL;
    if (webhookUrl) {
      if (!isAllowedWebhookUrl(webhookUrl)) {
        res.status(500).json({ error: { message: 'FEEDBACK_WEBHOOK_URL must be a valid https URL.' } });
        return;
      }

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: [
            '**New ProDraft suggestion**',
            payload.name ? `From: ${payload.name}` : null,
            payload.email ? `Email: ${payload.email}` : null,
            payload.suggestion,
          ].filter(Boolean).join('\n'),
        }),
      });
    } else {
      console.log('[ProDraft suggestion]', JSON.stringify(payload));
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: { message: error?.message || 'Could not save suggestion.' } });
  }
}
