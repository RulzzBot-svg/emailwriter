## Monetization setup

ProDraft ships with a side-income friendly billing model:

| Plan | Limit | Price |
|------|-------|-------|
| Free | 20 polishes / month | $0 |
| Pro | 500 polishes / month | $7 / month |

Usage is tracked per device via an anonymous client ID (`X-ProDraft-Client-Id`).

### Local development

Without Stripe configured, the free tier still works. Usage is stored in `data/prodraft-store.json`.

### Stripe setup

1. Create a product in [Stripe Dashboard](https://dashboard.stripe.com/) with a **$7/month** recurring price.
2. Add these env vars locally and on Vercel:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_ID_PRO`
   - `STRIPE_WEBHOOK_SECRET`
   - `PRODRAFT_APP_URL` (your public site URL)
3. Create a webhook endpoint pointing to:
   - `https://your-domain.com/api/billing/webhook`
4. Subscribe to these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Enable the Stripe customer portal in Stripe settings (for “Manage billing”).

### Production storage (recommended)

On Vercel, use Upstash Redis so usage survives serverless restarts:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Create a free database at [upstash.com](https://upstash.com).

### API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/usage` | GET | Current plan + monthly usage |
| `/api/billing/create-checkout` | POST | Start Stripe Checkout |
| `/api/billing/portal` | POST | Open Stripe customer portal |
| `/api/billing/webhook` | POST | Stripe webhook handler |
| `/api/generate-email` | POST | Generate + enforce usage limits |

All billing/user routes require `X-ProDraft-Client-Id`.
