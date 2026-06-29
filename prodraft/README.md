# ProDraft Web App

ProDraft turns messy notes into polished email drafts using Gemini.

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`:

```bash
GEMINI_API_KEY=your_key_here
PRODRAFT_API_BASE_URL=http://localhost:5173
```

3. Start development server:

```bash
npm run dev
```

4. Open the local URL shown in terminal and try the **Try ProDraft** demo.

## Extension sync

Before loading the extension, sync its config (also runs automatically before dev/build):

```bash
npm run sync:extension-config
```

This copies shared logic into `extension/` and sets `PRODRAFT_API_BASE_URL` so the extension calls this server instead of Gemini directly.

## Share As A Public App (Recommended: Vercel)

1. Push the `prodraft` folder to GitHub.
2. In Vercel, create a new project from that repository/folder.
3. Set build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variables in Vercel:
   - `GEMINI_API_KEY` = your Gemini key
   - `FEEDBACK_WEBHOOK_URL` = optional webhook for the suggestion form
   - `VITE_CHROME_STORE_URL` = your Chrome Web Store listing URL
5. Set `PRODRAFT_API_BASE_URL` to your Vercel URL in `.env`, run `npm run sync:extension-config`, and repackage the extension with the updated `manifest.json` host permissions.
6. Deploy and share the Vercel URL.

The frontend and extension call `/api/generate-email`, and the API key stays server-side.

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/generate-email` | POST | `{ prompt, modelName? }` → Gemini proxy (rate limited) |
| `/api/suggestions` | POST | `{ name?, email?, suggestion }` → logs or webhook |

## Why This Is Shareable

- Users do not need their own API key.
- Your Gemini key is not shipped in browser JavaScript or the extension.
- Local dev and production both use the same API route path.

## Optional: Share as a Chrome Extension

Package the `extension` folder and publish via Chrome Web Store. Point `PRODRAFT_API_BASE_URL` at your deployed backend before syncing config.

## Desktop App (.exe) With Electron

1. Install dependencies and set `GEMINI_API_KEY` in `.env`.
2. Run `npm run dev` for development.
3. Build Windows installer: `npm run dist:win`
4. Portable build: `npm run dist:portable`

The desktop app hosts the built frontend locally and serves `/api/generate-email` from the Electron main process.

## Security

See [MONETIZATION.md](./MONETIZATION.md) for Stripe + Upstash setup.

See [SECURITY.md](./SECURITY.md) for hardening details and deployment checklist.
