export const MAX_PROMPT_LENGTH = 10_000;
export const MAX_SUGGESTION_LENGTH = 2_000;
export const MAX_NAME_LENGTH = 120;
export const MAX_EMAIL_LENGTH = 254;

export const ALLOWED_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.0-flash',
]);

export function normalizeModel(modelName, defaultModel) {
  if (typeof modelName === 'string' && ALLOWED_MODELS.has(modelName)) {
    return modelName;
  }
  return defaultModel;
}

export function validatePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return { ok: false, message: 'Missing prompt in request body.' };
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return {
      ok: false,
      message: `Prompt is too long. Maximum length is ${MAX_PROMPT_LENGTH} characters.`,
    };
  }

  return { ok: true };
}

export function clampText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

export function isAllowedWebhookUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}
