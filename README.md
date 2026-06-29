# ProDraft

ProDraft turns messy notes and rough email drafts into polished, professional messages.

## What's in this repo

| Folder | Purpose |
|--------|---------|
| `extension/` | Chrome extension — inline compose assistant for Gmail, Outlook, Yahoo |
| `prodraft/` | Marketing site, live demo, API routes, and optional Electron desktop app |
| `shared/` | Shared prompt/tone/API client logic used by the extension and web app |

## Quick start (web + demo)

```bash
cd prodraft
npm install
cp .env.example .env   # add your GEMINI_API_KEY
npm run dev
```

Open the local URL, try the demo, and load the extension from `extension/` in Chrome.

## Extension setup

1. Set `PRODRAFT_API_BASE_URL` in `prodraft/.env` (defaults to `http://localhost:5173`).
2. Run `npm run sync:extension-config` from `prodraft/` (runs automatically before `npm run dev`).
3. Load `extension/` as an unpacked extension in Chrome.
4. Before publishing, set `PRODRAFT_API_BASE_URL` to your deployed site and re-sync so `manifest.json` includes the production host.

The extension calls your backend — it does **not** embed a Gemini API key.

## Deploy (Vercel)

Deploy the `prodraft` folder. Set environment variables:

- `GEMINI_API_KEY` — your Gemini key (server-side only)
- `FEEDBACK_WEBHOOK_URL` — optional Discord/Slack webhook for suggestion form
- `VITE_CHROME_STORE_URL` — optional real Chrome Web Store listing URL

See `prodraft/README.md` for full details.

## Security note

Never commit real API keys. Use `.env` locally and platform secrets in production. If a key was ever committed, rotate it in Google AI Studio.
