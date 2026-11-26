/* ==========================================================================
   SafeBeef v83 — Localhost development/production server
   Serves the static SafeBeef site on http://localhost:<PORT>
   ========================================================================== */
'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');

// On Vercel, server.js is at /var/task/server.js (project root)
// api/index.js requires '../server.js' from /var/task/api, so __dirname in server.js is /var/task
// Static files (index.html, styles.css, etc.) are at /var/task/public
const IS_VERCEL = !!process.env.VERCEL;
const APP_ROOT = path.resolve(__dirname); // server.js is at project root
const PUBLIC_ROOT = path.join(APP_ROOT, 'public'); // static files in public/
const PORT = process.env.PORT || 5173;
const HOST = process.env.HOST || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'production';
const IS_DEV = NODE_ENV !== 'production';

const app = express();

// Trust proxy (useful behind load balancers / when revealing real client IPs)
app.set('trust proxy', 1);

// ---------------------------------------------------------------------------
// Security / CORS headers (safe defaults for a local dev/prod server)
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Allow the page to use modern features on localhost.
  res.setHeader('Cross-Origin-Opener-Policy', IS_DEV ? 'unsafe-none' : 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', IS_DEV ? 'unsafe-none' : 'same-origin');
  next();
});

// ---------------------------------------------------------------------------
// Body parsing (JSON for push subscription API)
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '1mb' }));

// ---------------------------------------------------------------------------
// Compression (smaller transfers, faster page loads)
// ---------------------------------------------------------------------------
try {
  const compression = require('compression');
  app.use(compression());
} catch (e) {
  // compression is optional; the server works without it.
}

// ---------------------------------------------------------------------------
// VAPID key pair for push notifications (generated once per server start)
// ---------------------------------------------------------------------------
let vapidKeys = null;
try {
  const webpush = require('web-push');
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    vapidKeys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  } else {
    vapidKeys = webpush.generateVAPIDKeys();
    if (IS_DEV) console.warn('[push] VAPID keys generated at runtime. Set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY env vars so push works across serverless instances/restarts.');
  }
} catch (e) {
  // web-push optional; push API endpoints will be disabled if missing.
}

// Push subscription store. Persisted to disk so restarts don't lose them.
// On Vercel the bundle dir is read-only, so use the writable temp dir there.
const pushSubscriptions = new Map(); // endpoint -> { endpoint, keys, username }
const PUSH_SUBS_FILE = process.env.PUSH_SUBS_FILE
  || (IS_VERCEL ? path.join(require('os').tmpdir(), 'safebeef-push-subs.json') : path.join(APP_ROOT, 'push-subs.json'));
function saveSubs() {
  const arr = Array.from(pushSubscriptions.values());
  try {
    fs.writeFileSync(PUSH_SUBS_FILE, JSON.stringify(arr));
  } catch (e) { /* ignore */ }
  redisSet(arr);
}
function loadSubs() {
  try {
    const arr = JSON.parse(fs.readFileSync(PUSH_SUBS_FILE, 'utf8') || '[]');
    if (Array.isArray(arr)) arr.forEach(s => { if (s && s.endpoint) pushSubscriptions.set(s.endpoint, s); });
  } catch (e) { /* none yet */ }
}
loadSubs();

// Optional shared store (Upstash Redis REST) so subscriptions survive Vercel
// cold starts and are visible across instances. Falls back to disk/memory.
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_KEY = process.env.PUSH_SUBS_REDIS_KEY || 'safebeef:push-subs';

async function redisSet(arr) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  try {
    await fetch(`${REDIS_URL}/set/${encodeURIComponent(REDIS_KEY)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      body: JSON.stringify(arr),
    });
  } catch (e) { /* best effort */ }
}

async function redisGet() {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(REDIS_KEY)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
    const j = await r.json();
    if (j && typeof j.result === 'string') return JSON.parse(j.result);
    return null;
  } catch (e) { return null; }
}

// Merge remote subscriptions into the local cache and return the full list.
async function syncSubs() {
  const remote = await redisGet();
  if (Array.isArray(remote)) {
    remote.forEach(s => {
      if (s && s.endpoint && !pushSubscriptions.has(s.endpoint)) {
        pushSubscriptions.set(s.endpoint, s);
      }
    });
  }
  return Array.from(pushSubscriptions.values());
}

function requireWebpush(req, res, next) {
  if (!vapidKeys) {
    return res.status(503).json({ error: 'Push notifications not available on this server' });
  }
  next();
}

// ---------------------------------------------------------------------------
// API / health endpoints
// ---------------------------------------------------------------------------
app.get('/__sb__/health', (req, res) => {
  res.json({ ok: true, service: 'safebeef', version: '83.0.0', env: NODE_ENV });
});

app.get('/__sb__/info', (req, res) => {
  res.json({
    name: 'SafeBeef',
    version: '83.0.0',
    url: `http://${HOST}:${PORT}`,
    env: NODE_ENV,
    push: !!vapidKeys,
  });
});

// ---------------------------------------------------------------------------
// Push notification API
// ---------------------------------------------------------------------------
app.get('/__sb__/push/vapid-public-key', (req, res) => {
  if (!vapidKeys) return res.status(503).json({ error: 'Push not available' });
  res.json({ publicKey: vapidKeys.publicKey });
});

app.post('/__sb__/push/subscribe', requireWebpush, express.json(), (req, res) => {
  const { subscription, username } = req.body || {};
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }
  try {
    pushSubscriptions.set(subscription.endpoint, {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      username: username || 'unknown',
      subscribedAt: Date.now(),
    });
    saveSubs();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

app.post('/__sb__/push/unsubscribe', requireWebpush, express.json(), (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });
  pushSubscriptions.delete(endpoint);
  saveSubs();
  res.json({ ok: true });
});

app.post('/__sb__/push/test', requireWebpush, express.json(), async (req, res) => {
  const webpush = require('web-push');
  webpush.setVapidDetails('mailto:safebeef@localhost', vapidKeys.publicKey, vapidKeys.privateKey);
  const all = await syncSubs();
  let sent = 0;
  for (const sub of all) {
    try { await webpush.sendNotification(sub, JSON.stringify({ title: '🔔 SafeBeef test', body: 'Push is working!', tag: 'safebeef-test' })); sent++; }
    catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) { pushSubscriptions.delete(sub.endpoint); } }
  }
  saveSubs();
  res.json({ ok: true, sent, total: all.length });
});

app.post('/__sb__/push/send', requireWebpush, express.json(), async (req, res) => {
  const { subscription, payload, targetUsername } = req.body || {};
  if (!payload) {
    return res.status(400).json({ error: 'Missing payload' });
  }

  const webpush = require('web-push');
  webpush.setVapidDetails(
    'mailto:safebeef@localhost',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );

  const sendOne = async (sub) => {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
      return { ok: true };
    } catch (e) {
      // 404/410 mean the subscription is gone — drop it so the store stays clean.
      if (e && (e.statusCode === 404 || e.statusCode === 410)) {
        try { pushSubscriptions.delete(sub.endpoint); saveSubs(); } catch (_) {}
      }
      return { ok: false, error: e.message };
    }
  };

  // 1) Explicit single subscription (legacy path).
  if (subscription && subscription.endpoint) {
    const result = await sendOne(subscription);
    return res.status(result.ok ? 200 : 502).json(result);
  }

  // 2) Targeted send to every endpoint registered for a username.
  if (targetUsername) {
    const targets = (await syncSubs())
      .filter(s => s.username === targetUsername);
    if (!targets.length) {
      return res.json({ ok: true, sent: 0, failed: 0, targeted: true });
    }
    const results = await Promise.all(targets.map(sendOne));
    const sent = results.filter(r => r.ok).length;
    return res.json({ ok: sent > 0, sent, failed: results.length - sent, targeted: true });
  }

  // 3) Broadcast to every stored subscription.
  const all = await syncSubs();
  if (!all.length) {
    return res.json({ ok: true, sent: 0, failed: 0, broadcast: true });
  }
  const results = await Promise.all(all.map(sendOne));
  const sent = results.filter(r => r.ok).length;
  res.json({ ok: sent > 0, sent, failed: results.length - sent, broadcast: true });
});

app.get('/__sb__/push/subscriptions', requireWebpush, async (req, res) => {
  const all = await syncSubs();
  res.json({ count: all.length, subs: all });
});

// ---------------------------------------------------------------------------
// Static assets (HTML, JS, CSS, images, manifest, sw)
// ---------------------------------------------------------------------------
const staticOptions = {
  extensions: ['html', 'htm'], // serve /auth as /auth.html
  index: 'index.html',
  // In dev, never cache so every refresh picks up edits immediately.
  cacheControl: IS_DEV ? false : true,
  maxAge: IS_DEV ? 0 : '7d',
};
app.use(express.static(PUBLIC_ROOT, staticOptions));

// Set explicit, sensible Content-Type for key file types (Express handles most,
// but this guarantees correct MIME even if the system mime database is stale).
app.use((req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  const mime = {
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.html': 'text/html; charset=utf-8',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
  }[ext];
  if (mime && !res.getHeader('Content-Type')) {
    res.setHeader('Content-Type', mime);
  }
  next();
});

// ---------------------------------------------------------------------------
// SPA-ish fallback: if a path has no extension and isn't a real file,
// serve index.html so direct refreshes don't 404.
// Auth/legal pages (auth.html, banned.html, etc.) are still served as files
// because they exist on disk.
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  // Skip API and already-handled static paths.
  if (req.path.startsWith('/__sb__')) return next();
  if (path.extname(req.path)) return next();

  const candidate = path.join(PUBLIC_ROOT, req.path);
  try {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return res.sendFile(candidate);
    }
  } catch (e) {
    // fall through to index.html
  }
  res.sendFile(path.join(PUBLIC_ROOT, 'index.html'));
});

// ---------------------------------------------------------------------------
// 404
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).type('text').send('404 — Not found (SafeBeef)');
});

// ---------------------------------------------------------------------------
// Start (only when run directly — Vercel imports `app` as a serverless handler)
// ---------------------------------------------------------------------------
if (require.main === module) {
  const server = http.createServer(app);
  server.listen(PORT, () => {
    const urls = [
      `http://${HOST}:${PORT}`,
      `http://127.0.0.1:${PORT}`,
    ];
    console.log('');
    console.log('=============================================================================');
    console.log(' SafeBeef — localhost server');
    console.log('=============================================================================');
    console.log(`  Environment : ${NODE_ENV}`);
    console.log(`  Serving     : ${PUBLIC_ROOT}`);
    console.log(`  Local       : ${urls[0]}`);
    console.log(`  Network     : ${urls[1]}`);
    console.log(`  Health      : ${urls[0]}/__sb__/health`);
    console.log('-----------------------------------------------------------------------------');
    console.log('  Open the "Local" URL in your browser. If you edit any .html/.js/.css file,');
    console.log('  just refresh the page (dev mode disables caching).');
    console.log('=============================================================================');
    console.log('');
  });

  function onClose() {
    console.log('\n[SafeBeef] Shutting down localhost server…');
    server.close(() => process.exit(0));
  }
  process.on('SIGTERM', onClose);
  process.on('SIGINT', onClose);
}

module.exports = app;
module.exports.app = app;

