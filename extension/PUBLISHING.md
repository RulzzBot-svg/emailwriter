# Publish ProDraft to the Chrome Web Store

## Fix "Failed to fetch" first (required before publish)

The extension does **not** call Gemini directly. It calls **your website API**:

```
https://https://emailwriter-zeta.vercel.app/api/generate-email
```

Right now `extension/extension-config.js` points at **`http://localhost:5173`**. Gmail cannot reach your laptop unless the dev server is running — that causes **Failed to fetch**.

### Fix in 3 steps

1. **Deploy the website to Vercel** (see `prodraft/README.md` or below).
2. In `prodraft/.env`, set:
   ```bash
   PRODRAFT_API_BASE_URL=https://YOUR-PROJECT.vercel.app
   PRODRAFT_APP_URL=https://YOUR-PROJECT.vercel.app
   GEMINI_API_KEY=your_key_here
   ```
3. From `prodraft/`, run:
   ```bash
   npm run sync:extension-config
   ```
4. Reload the extension at `chrome://extensions`.

Verify: open your **live site** demo → polish works. Then try the extension on Gmail.

---

## Before you submit

### 1. Chrome Web Store developer account
- Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- Pay the **one-time $5** registration fee

### 2. Production API on Vercel
Required env vars on Vercel:

| Variable | Required |
|----------|----------|
| `GEMINI_API_KEY` | Yes |
| `PRODRAFT_APP_URL` | Yes (your Vercel URL) |
| `UPSTASH_REDIS_REST_URL` | Strongly recommended (usage limits) |
| `UPSTASH_REDIS_REST_TOKEN` | Strongly recommended |
| `STRIPE_*` | No (add later) |

### 3. Point extension at production (not localhost)

```bash
cd prodraft
# .env must have PRODRAFT_API_BASE_URL=https://your-project.vercel.app
npm run sync:extension-config
npm run pack:extension
```

This creates `extension/prodraft-extension.zip` ready to upload.

**Do not publish** with `localhost` in `extension-config.js`.

### 4. Store assets you need

| Asset | Size | Notes |
|-------|------|-------|
| Extension icon | 128×128 PNG | Required in ZIP + store listing |
| Screenshots | 1280×800 or 640×400 | At least 1, up to 5 |
| Privacy policy URL | — | Use `https://YOUR-SITE.vercel.app/privacy.html` |

Optional: 16×16 and 48×48 PNG icons in `extension/icons/` and add to `manifest.json`.

### 5. Privacy policy

Hosted at `/privacy.html` on your deployed site after Vercel deploy.

---

## Upload to Chrome Web Store

1. Run `npm run pack:extension` from `prodraft/`
2. Open [Developer Dashboard](https://chrome.google.com/webstore/devconsole) → **New item**
3. Upload `extension/prodraft-extension.zip`
4. Fill in listing:
   - **Name:** ProDraft Email Polisher
   - **Summary:** Polish messy email drafts in Gmail and Outlook
   - **Description:** Explain compose-box assistant, tones, free tier
   - **Category:** Productivity
   - **Privacy policy:** `https://https://emailwriter-zeta.vercel.app/.vercel.app/privacy.html`
5. **Privacy practices** questionnaire:
   - Collects: email draft content (user-initiated)
   - Purpose: AI rewriting
   - Shared with: your backend + Google Gemini
6. Submit for review (usually a few days to 2 weeks)

---

## After approval

1. Copy the store URL
2. In Vercel env vars, set:
   ```bash
   VITE_CHROME_STORE_URL=https://chromewebstore.google.com/detail/YOUR-EXTENSION-ID
   ```
3. Redeploy the website so the Install button uses the real link

---

## Quick Vercel deploy recap

1. Push repo to GitHub
2. [vercel.com](https://vercel.com) → Import project → Root Directory: `prodraft`
3. Add `GEMINI_API_KEY` (+ Upstash vars)
4. Deploy → copy URL → update `.env` → `npm run sync:extension-config`

---

## Checklist

- [ ] Vercel site live and demo works
- [ ] `GEMINI_API_KEY` set on Vercel
- [ ] Extension synced to production URL (not localhost)
- [ ] Extension works on Gmail against live API
- [ ] `privacy.html` loads on live site
- [ ] 128×128 icon + screenshots ready
- [ ] ZIP built with `npm run pack:extension`
- [ ] Chrome developer account created
- [ ] Submitted for review
