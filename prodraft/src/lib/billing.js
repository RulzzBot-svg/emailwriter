const CLIENT_STORAGE_KEY = 'prodraft-client-id';

function createClientId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === 'x' ? rand : ((rand & 0x3) | 0x8);
    return value.toString(16);
  });
}

export function getClientId() {
  try {
    const existing = window.localStorage.getItem(CLIENT_STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const next = createClientId();
    window.localStorage.setItem(CLIENT_STORAGE_KEY, next);
    return next;
  } catch {
    return createClientId();
  }
}

export async function fetchUsage() {
  const clientId = getClientId();
  const response = await fetch('/api/usage', {
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

export async function startCheckout(email = '') {
  const clientId = getClientId();
  const response = await fetch('/api/billing/create-checkout', {
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

export async function openBillingPortal() {
  const clientId = getClientId();
  const response = await fetch('/api/billing/portal', {
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
