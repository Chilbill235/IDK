# SafeBeef v83 — Localhost Server

Browser-based pentest simulator for education. Now runs on `http://localhost` instead of only as raw `file://` files.

## Quick start

```bash
# 1. Install dependencies (Node 18+ required)
npm install

# 2. Start the server
npm start          # production mode (caches assets for 7 days)
# or
npm run dev        # dev mode (auto-restarts on file changes via nodemon, no caching)
```

Then open the URL printed in the terminal:

- **Local:**  `http://localhost:5173`
- **Network:** `http://127.0.0.1:5173`
- **Health:**  `http://localhost:5173/__sb__/health`

Change the port with `PORT=3000 npm start` or `PORT=3000 npm run dev`.

## What changed

| Area | Before | After |
|------|--------|-------|
| Localhost | No server — had to open `file://` | Express server on `http://localhost:5173` |
| Caching | N/A | Dev: no-cache (refresh = latest); Prod: 7-day cache + gzip |
| Modern browser features | Restricted on `file://` | Work on `http://localhost` (BroadcastChannel, Service Workers, notifications, camera/mic) |
| Console noise | `app.js` threw `Error('Not logged in')` after redirect | Removed the throw — clean redirect to `auth.html` |
| Legal pages | `openLegalPage` referenced undefined `window.Router` | Falls back to navigating directly to `about.html`, `terms.html`, `privacy.html`, `help.html` |

## Scripts

- `npm start` — run the server (`node server.js`)
- `npm run dev` — run with auto-restart on changes (`nodemon server.js`)
- `npm install` — install dependencies

## Notes

- All user data still lives in `localStorage` (per-browser, per-origin). Switching between `file://` and `http://localhost` counts as a different origin, so saved accounts from `file://` won't carry over to `localhost` and vice-versa — this is expected browser behaviour.
- To reset the site data, clear `localStorage` for `localhost:5173` in DevTools (Application → Storage → Clear site data) or open in an incognito window.
