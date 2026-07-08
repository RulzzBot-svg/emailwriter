import fs from 'node:fs/promises';
import path from 'node:path';
import { Redis } from '@upstash/redis';
import { getCurrentMonthKey, PLANS } from './plans.js';

const STORE_VERSION = 1;
const memoryStore = {
  clients: {},
  usage: {},
};

let redisClient = null;
let fileStorePath = null;
let fileStoreLoaded = false;

function getRedis() {
  if (redisClient !== null) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    redisClient = new Redis({ url, token });
    return redisClient;
  }

  redisClient = false;
  return redisClient;
}

function resolveFileStorePath() {
  if (fileStorePath) {
    return fileStorePath;
  }

  fileStorePath = process.env.PRODRAFT_STORE_PATH
    || path.join(process.cwd(), 'data', 'prodraft-store.json');
  return fileStorePath;
}

async function ensureFileStoreLoaded() {
  if (fileStoreLoaded || getRedis()) {
    return;
  }

  const target = resolveFileStorePath();
  try {
    const raw = await fs.readFile(target, 'utf8');
    const parsed = JSON.parse(raw);
    memoryStore.clients = parsed.clients || {};
    memoryStore.usage = parsed.usage || {};
  } catch {
    memoryStore.clients = {};
    memoryStore.usage = {};
  }

  fileStoreLoaded = true;
}

async function persistFileStore() {
  if (getRedis()) {
    return;
  }

  await ensureFileStoreLoaded();
  const target = resolveFileStorePath();
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify({
    version: STORE_VERSION,
    clients: memoryStore.clients,
    usage: memoryStore.usage,
  }, null, 2));
}

function usageKey(clientId, monthKey = getCurrentMonthKey()) {
  return `usage:${clientId}:${monthKey}`;
}

function clientKey(clientId) {
  return `client:${clientId}`;
}

async function readJson(key) {
  const redis = getRedis();
  if (redis) {
    return redis.get(key);
  }

  await ensureFileStoreLoaded();
  if (key.startsWith('client:')) {
    const clientId = key.slice('client:'.length);
    return memoryStore.clients[clientId] || null;
  }

  if (key.startsWith('usage:')) {
    return memoryStore.usage[key] || 0;
  }

  return null;
}

async function writeJson(key, value) {
  const redis = getRedis();
  if (redis) {
    await redis.set(key, value);
    return;
  }

  await ensureFileStoreLoaded();
  if (key.startsWith('client:')) {
    const clientId = key.slice('client:'.length);
    memoryStore.clients[clientId] = value;
  } else if (key.startsWith('usage:')) {
    memoryStore.usage[key] = value;
  }

  await persistFileStore();
}

export async function getClientRecord(clientId) {
  const record = await readJson(clientKey(clientId));
  if (!record) {
    return {
      clientId,
      planId: 'free',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      email: null,
      updatedAt: null,
    };
  }

  return record;
}

export async function saveClientRecord(record) {
  await writeJson(clientKey(record.clientId), {
    ...record,
    updatedAt: new Date().toISOString(),
  });
}

export async function getMonthlyUsage(clientId, monthKey = getCurrentMonthKey()) {
  const value = await readJson(usageKey(clientId, monthKey));
  return Number(value || 0);
}

export async function incrementMonthlyUsage(clientId, monthKey = getCurrentMonthKey()) {
  const current = await getMonthlyUsage(clientId, monthKey);
  const next = current + 1;
  await writeJson(usageKey(clientId, monthKey), next);
  return next;
}

export async function getUsageSummary(clientId) {
  const monthKey = getCurrentMonthKey();
  const client = await getClientRecord(clientId);
  const used = await getMonthlyUsage(clientId, monthKey);
  const planId = client.planId === 'pro' ? 'pro' : 'free';
  const limit = PLANS[planId].monthlyLimit;

  return {
    clientId,
    planId,
    planName: PLANS[planId].name,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    monthKey,
    email: client.email || null,
    canGenerate: used < limit,
  };
}

export async function setClientPlan(clientId, planId, extras = {}) {
  const existing = await getClientRecord(clientId);
  await saveClientRecord({
    ...existing,
    clientId,
    planId: planId === 'pro' ? 'pro' : 'free',
    ...extras,
  });
}

export async function findClientIdByStripeCustomer(stripeCustomerId) {
  const redis = getRedis();
  if (redis) {
    const keys = await redis.keys('client:*');
    for (const key of keys) {
      const record = await redis.get(key);
      if (record?.stripeCustomerId === stripeCustomerId) {
        return record.clientId;
      }
    }
    return null;
  }

  await ensureFileStoreLoaded();
  const match = Object.values(memoryStore.clients).find(
    (record) => record.stripeCustomerId === stripeCustomerId,
  );
  return match?.clientId || null;
}

export async function assertCanGenerate(clientId) {
  const summary = await getUsageSummary(clientId);
  if (summary.canGenerate) {
    return summary;
  }

  const error = new Error(summary.planId === 'pro'
    ? `Pro plan limit reached (${summary.used}/${summary.limit}).`
    : `Free plan limit reached (${summary.used}/${summary.limit}). Upgrade to Pro for more polishes.`);
  error.code = 'USAGE_LIMIT';
  error.statusCode = 402;
  error.summary = summary;
  throw error;
}
