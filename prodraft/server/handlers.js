import {
  normalizeModel,
  validatePrompt,
} from './request-limits.js';
import {
  assertCanGenerate,
  getUsageSummary,
  incrementMonthlyUsage,
  saveClientRecord,
  setClientPlan,
  getClientRecord,
} from './storage.js';
import {
  constructStripeEvent,
  createCheckoutSession,
  createPortalSession,
  getClientIdFromRequest,
  isBillingEnabled,
  retrieveSubscription,
} from './billing.js';
import { clampText, MAX_EMAIL_LENGTH, MAX_NAME_LENGTH, MAX_SUGGESTION_LENGTH } from './request-limits.js';
import { isAllowedWebhookUrl } from './request-limits.js';

const DEFAULT_MODEL = 'gemini-2.5-flash';

export async function handleGenerateEmailRequest(req, body, apiKey) {
  const clientId = getClientIdFromRequest(req);
  if (!clientId) {
    return {
      status: 400,
      body: { error: { message: 'Missing or invalid X-ProDraft-Client-Id header.' } },
    };
  }

  const { prompt, modelName = DEFAULT_MODEL } = body || {};
  const validation = validatePrompt(prompt);
  const activeApiKey = String(apiKey || '').trim();

  if (!activeApiKey) {
    return { status: 500, body: { error: { message: 'Server is missing GEMINI_API_KEY.' } } };
  }

  if (!validation.ok) {
    return { status: 400, body: { error: { message: validation.message } } };
  }

  try {
    await assertCanGenerate(clientId);
  } catch (error) {
    if (error.code === 'USAGE_LIMIT') {
      return {
        status: 402,
        body: {
          error: {
            message: error.message,
            code: 'USAGE_LIMIT',
            usage: error.summary,
          },
        },
      };
    }
    throw error;
  }

  const safeModel = normalizeModel(modelName, DEFAULT_MODEL);
  const upstreamResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${safeModel}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': activeApiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  const payload = await upstreamResponse.json();

  if (upstreamResponse.ok) {
    await incrementMonthlyUsage(clientId);
  }

  return { status: upstreamResponse.status, body: payload };
}

export async function handleUsageRequest(req) {
  const clientId = getClientIdFromRequest(req);
  if (!clientId) {
    return {
      status: 400,
      body: { error: { message: 'Missing or invalid X-ProDraft-Client-Id header.' } },
    };
  }

  const usage = await getUsageSummary(clientId);
  return {
    status: 200,
    body: {
      ...usage,
      billingEnabled: isBillingEnabled(),
      proPriceUsd: 7,
    },
  };
}

export async function handleCreateCheckoutRequest(req, body) {
  const clientId = getClientIdFromRequest(req);
  if (!clientId) {
    return {
      status: 400,
      body: { error: { message: 'Missing or invalid X-ProDraft-Client-Id header.' } },
    };
  }

  if (!isBillingEnabled()) {
    return {
      status: 503,
      body: { error: { message: 'Billing is not configured yet.' } },
    };
  }

  const email = clampText(body?.email || '', MAX_EMAIL_LENGTH);
  const session = await createCheckoutSession({ clientId, email });

  return {
    status: 200,
    body: { url: session.url },
  };
}

export async function handlePortalRequest(req) {
  const clientId = getClientIdFromRequest(req);
  if (!clientId) {
    return {
      status: 400,
      body: { error: { message: 'Missing or invalid X-ProDraft-Client-Id header.' } },
    };
  }

  if (!isBillingEnabled()) {
    return {
      status: 503,
      body: { error: { message: 'Billing is not configured yet.' } },
    };
  }

  const client = await getClientRecord(clientId);
  if (!client.stripeCustomerId) {
    return {
      status: 400,
      body: { error: { message: 'No active subscription found for this device yet.' } },
    };
  }

  const session = await createPortalSession(client.stripeCustomerId);
  return { status: 200, body: { url: session.url } };
}

async function activateProFromSubscription({ clientId, stripeCustomerId, stripeSubscriptionId, email }) {
  if (!clientId) {
    return;
  }

  await setClientPlan(clientId, 'pro', {
    stripeCustomerId: stripeCustomerId || null,
    stripeSubscriptionId: stripeSubscriptionId || null,
    email: email || null,
  });
}

async function deactivatePro(clientId) {
  if (!clientId) {
    return;
  }

  const existing = await getClientRecord(clientId);
  await saveClientRecord({
    ...existing,
    clientId,
    planId: 'free',
    stripeSubscriptionId: null,
  });
}

export async function handleStripeWebhook(rawBody, signature) {
  const event = constructStripeEvent(rawBody, signature);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const clientId = session.metadata?.clientId || session.client_reference_id;
    await activateProFromSubscription({
      clientId,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      email: session.customer_details?.email || session.customer_email || null,
    });
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const clientId = subscription.metadata?.clientId;
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';

    if (isActive) {
      await activateProFromSubscription({
        clientId,
        stripeCustomerId: subscription.customer,
        stripeSubscriptionId: subscription.id,
        email: null,
      });
    } else if (clientId) {
      await deactivatePro(clientId);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const clientId = subscription.metadata?.clientId;
    if (clientId) {
      await deactivatePro(clientId);
    }
  }

  return { status: 200, body: { received: true } };
}

export async function handleSuggestionsRequest(body) {
  const { name = '', email = '', suggestion = '' } = body || {};
  const safeSuggestion = clampText(suggestion, MAX_SUGGESTION_LENGTH);

  if (!safeSuggestion) {
    return { status: 400, body: { error: { message: 'Suggestion is required.' } } };
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
      return { status: 500, body: { error: { message: 'FEEDBACK_WEBHOOK_URL must be a valid https URL.' } } };
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

  return { status: 200, body: { ok: true } };
}

export async function restoreProFromStripeSubscription(clientId, subscriptionId) {
  const subscription = await retrieveSubscription(subscriptionId);
  if (!subscription) {
    return false;
  }

  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  if (!isActive) {
    return false;
  }

  await activateProFromSubscription({
    clientId,
    stripeCustomerId: subscription.customer,
    stripeSubscriptionId: subscription.id,
    email: null,
  });
  return true;
}
