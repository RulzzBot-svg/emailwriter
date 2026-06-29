import { getClientId } from './billing.js';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_RETRIES = 5;

export const TONES = [
  ['professional', 'Professional', 'Use a polished, business-professional tone.'],
  ['casual', 'Casual', 'Use a relaxed, natural conversational tone while staying clear.'],
  ['formal', 'Formal', 'Use a formal, precise, and respectful corporate tone.'],
  ['friendly', 'Friendly', 'Use a warm, approachable, and positive tone.'],
  ['confident', 'Confident', 'Use a clear, assured, and decisive tone.'],
  ['empathetic', 'Empathetic', 'Use a considerate and understanding tone.'],
  ['concise', 'Concise', 'Use a concise, efficient tone with short, clear sentences.'],
  ['persuasive', 'Persuasive', 'Use a compelling tone that highlights benefits and next steps.'],
];

export function getToneInstruction(toneId) {
  const match = TONES.find(([id]) => id === toneId);
  return match?.[2] || TONES[0][2];
}

export function buildEmailPrompt({ draftNotes, tone = 'professional', shortSimple = false }) {
  return [
    'You are a professional email copywriter.',
    'Rewrite the following draft into a polished email body.',
    getToneInstruction(tone),
    shortSimple
      ? 'Keep the result short, simple, and easy to understand.'
      : 'Include enough detail to be clear while staying concise.',
    'Do not include a subject line. Return only the email body.',
    `Draft: ${draftNotes}`,
  ].join(' ');
}

export function getGeminiErrorMessage(payload) {
  const message = payload?.error?.message;
  if (!message) {
    return 'Unknown API error.';
  }
  if (payload?.error?.code === 'USAGE_LIMIT') {
    return message;
  }
  if (/API key not valid/i.test(message)) {
    return 'Server API key is invalid. Check GEMINI_API_KEY on the backend.';
  }
  if (/quota|rate|429/i.test(message)) {
    return 'Rate limited or quota exceeded. Try again shortly.';
  }
  return message;
}

function extractGeneratedText(payload) {
  return payload?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

export async function generateEmail({
  apiBase = '',
  prompt,
  modelName = DEFAULT_MODEL,
  maxRetries = MAX_RETRIES,
  clientId = getClientId(),
}) {
  const base = String(apiBase || '').replace(/\/$/, '');
  const endpoint = base ? `${base}/api/generate-email` : '/api/generate-email';

  let lastError = 'Failed to connect to ProDraft.';
  let lastUsage = null;
  let delay = 1000;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ProDraft-Client-Id': clientId,
        },
        body: JSON.stringify({ prompt, modelName }),
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (response.ok) {
        const text = extractGeneratedText(payload);
        if (!text) {
          throw new Error('ProDraft returned an empty response.');
        }
        return text;
      }

      lastError = getGeminiErrorMessage(payload);
      lastUsage = payload?.error?.usage || null;

      if (response.status === 402 || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
        break;
      }
    } catch (error) {
      lastError = error?.message || lastError;
    }

    if (attempt < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  const error = new Error(lastError);
  if (lastUsage) {
    error.usage = lastUsage;
    error.code = 'USAGE_LIMIT';
  }
  throw error;
}
