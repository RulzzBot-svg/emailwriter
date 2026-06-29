# ProDraft Security Notes

## What is protected today

- **Gemini API key** stays server-side (`.env` / Vercel secrets). The extension and website call `/api/generate-email` only.
- **Rate limiting** on generate (20/min/IP) and suggestions (10/min/IP).
- **Input limits** on prompts and suggestion fields.
- **Model allowlist** — only approved Gemini model names are forwarded upstream.
- **Webhook hardening** — `FEEDBACK_WEBHOOK_URL` must be `https://`.

## Residual risks (know these before going public)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Public `/api/generate-email` can be abused if someone finds your URL | Medium | Rate limits help; add Vercel WAF, auth token, or Cloudflare in front for production |
| Email content sent to Gemini | Expected | Disclose in privacy policy; users choose what to polish |
| Electron desktop app uses `nodeIntegration: true` on launcher | Medium | Acceptable for local-only launcher; avoid loading remote content there |
| In-memory rate limits reset on serverless cold starts | Low | Upgrade to Redis/KV for strict quotas at scale |
| Suggestion form can receive spam | Low | Rate limited; add CAPTCHA if abused |

## Operator checklist

1. Never commit real keys — use `.env` locally and platform secrets in production.
2. Rotate any key that was ever committed to git.
3. Set `FEEDBACK_WEBHOOK_URL` only to trusted HTTPS endpoints you control.
4. Monitor Gemini usage/billing in Google AI Studio.
5. Before wide release, point extension `PRODRAFT_API_BASE_URL` at production and re-run `npm run sync:extension-config`.
