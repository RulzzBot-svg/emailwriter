export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    monthlyLimit: 20,
    priceLabel: '$0',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyLimit: 500,
    priceLabel: '$7/mo',
  },
};

export const PRO_PRICE_USD = 7;

export function getCurrentMonthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function getPlanLimit(planId) {
  return PLANS[planId]?.monthlyLimit ?? PLANS.free.monthlyLimit;
}

export function normalizeClientId(value) {
  const id = String(value || '').trim();
  if (!/^[a-f0-9-]{16,64}$/i.test(id)) {
    return null;
  }
  return id.toLowerCase();
}

export function buildUsageDeniedMessage({ planId, used, limit }) {
  if (planId === 'pro') {
    return `You reached this month's Pro limit (${limit} polishes). Your allowance resets next month.`;
  }

  return `Free plan limit reached (${used}/${limit} polishes this month). Upgrade to Pro for more.`;
}
