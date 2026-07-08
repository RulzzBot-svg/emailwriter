import Stripe from 'stripe';
import { normalizeClientId } from './plans.js';

let stripeClient = null;

export function isBillingEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID_PRO);
}

export function getStripe() {
  if (!isBillingEnabled()) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

export function getAppBaseUrl(fallback = 'http://localhost:5173') {
  if (process.env.PRODRAFT_APP_URL) {
    return String(process.env.PRODRAFT_APP_URL).replace(/\/$/, '');
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '');
  }

  return String(fallback).replace(/\/$/, '');
}

export function getClientIdFromRequest(req) {
  const headerValue = req.headers['x-prodraft-client-id'] || req.headers['X-ProDraft-Client-Id'];
  return normalizeClientId(headerValue);
}

export async function createCheckoutSession({ clientId, email = '' }) {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Billing is not configured on the server.');
  }

  const baseUrl = getAppBaseUrl();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID_PRO,
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/?checkout=success#pricing`,
    cancel_url: `${baseUrl}/?checkout=cancel#pricing`,
    client_reference_id: clientId,
    metadata: {
      clientId,
    },
    subscription_data: {
      metadata: {
        clientId,
      },
    },
    ...(email ? { customer_email: email } : {}),
  });

  return session;
}

export async function createPortalSession(stripeCustomerId) {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Billing is not configured on the server.');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${getAppBaseUrl()}/#pricing`,
  });

  return session;
}

export function constructStripeEvent(rawBody, signature) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    throw new Error('Stripe webhook is not configured.');
  }

  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

export async function retrieveSubscription(subscriptionId) {
  const stripe = getStripe();
  if (!stripe) {
    return null;
  }

  return stripe.subscriptions.retrieve(subscriptionId);
}
