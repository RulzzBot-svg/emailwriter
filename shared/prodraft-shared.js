(function (global) {
  const DEFAULT_MODEL = 'gemini-2.5-flash';
  const MAX_RETRIES = 5;

  const TONES = [
    ['professional', 'Professional', 'Use a polished, business-professional tone.'],
    ['casual', 'Casual', 'Use a relaxed, natural conversational tone while staying clear.'],
    ['formal', 'Formal', 'Use a formal, precise, and respectful corporate tone.'],
    ['friendly', 'Friendly', 'Use a warm, approachable, and positive tone.'],
    ['confident', 'Confident', 'Use a clear, assured, and decisive tone.'],
    ['empathetic', 'Empathetic', 'Use a considerate and understanding tone.'],
    ['concise', 'Concise', 'Use a concise, efficient tone with short, clear sentences.'],
    ['persuasive', 'Persuasive', 'Use a compelling tone that highlights benefits and next steps.'],
  ];

  function getToneInstruction(toneId) {
    const match = TONES.find(([id]) => id === toneId);
    return match?.[2] || TONES[0][2];
  }

  function buildEmailPrompt({ draftNotes, tone = 'professional', shortSimple = false }) {
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

  function getGeminiErrorMessage(payload) {
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

  function extractUsageLimit(payload) {
    return payload?.error?.usage || null;
  }

  function isExtensionRuntime() {
    return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
  }

  function extensionFetch(url, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ type: 'prodraft:fetch', url, options }, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!result) {
            reject(new TypeError('Failed to fetch'));
            return;
          }
          if (result.networkError) {
            reject(new TypeError(result.message || 'Failed to fetch'));
            return;
          }
          resolve({
            ok: result.ok,
            status: result.status,
            json: () => Promise.resolve(JSON.parse(result.body || '{}')),
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  function prodraftFetch(url, options) {
    if (isExtensionRuntime()) {
      return extensionFetch(url, options);
    }
    return fetch(url, options);
  }

  async function generateEmail({
    apiBase,
    prompt,
    modelName = DEFAULT_MODEL,
    maxRetries = MAX_RETRIES,
    clientId = '',
  }) {
    const base = String(apiBase || '').replace(/\/$/, '');
    if (!base) {
      throw new Error('ProDraft API URL is not configured.');
    }

    if (!clientId) {
      throw new Error('ProDraft client ID is missing.');
    }

    let lastError = 'Failed to connect to ProDraft.';
    let lastUsage = null;
    let delay = 1000;

    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      try {
        const response = await prodraftFetch(`${base}/api/generate-email`, {
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
        lastUsage = extractUsageLimit(payload);

        if (response.status === 402 || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
          break;
        }
      } catch (error) {
        if (error?.name === 'TypeError' && /fetch|network/i.test(error?.message || '')) {
          const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(base);
          lastError = isLocal
            ? 'Cannot reach ProDraft at localhost. Start `npm run dev` in prodraft/, or point PRODRAFT_API_BASE_URL to your live Vercel site and reload the extension.'
            : `Cannot reach ProDraft API at ${base}. Reload the extension at chrome://extensions and try again.`;
        } else {
          lastError = error?.message || lastError;
        }
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

  async function fetchUsage({ apiBase, clientId }) {
    const base = String(apiBase || '').replace(/\/$/, '');
    const response = await prodraftFetch(`${base}/api/usage`, {
      headers: {
        'X-ProDraft-Client-Id': clientId,
      },
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error?.message || 'Could not load usage.');
    }

    return payload;
  }

  async function startCheckout({ apiBase, clientId, email = '' }) {
    const base = String(apiBase || '').replace(/\/$/, '');
    const response = await prodraftFetch(`${base}/api/billing/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ProDraft-Client-Id': clientId,
      },
      body: JSON.stringify({ email }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error?.message || 'Could not start checkout.');
    }

    return payload.url;
  }

  async function openBillingPortal({ apiBase, clientId }) {
    const base = String(apiBase || '').replace(/\/$/, '');
    const response = await prodraftFetch(`${base}/api/billing/portal`, {
      method: 'POST',
      headers: {
        'X-ProDraft-Client-Id': clientId,
      },
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error?.message || 'Could not open billing portal.');
    }

    return payload.url;
  }

  global.ProDraftShared = {
    DEFAULT_MODEL,
    MAX_RETRIES,
    TONES,
    getToneInstruction,
    buildEmailPrompt,
    getGeminiErrorMessage,
    extractGeneratedText,
    generateEmail,
    fetchUsage,
    startCheckout,
    openBillingPortal,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
