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

// SQL database service layer (Neon/PostgreSQL with in-memory fallback)
const db = require('./db/service.js');

// server.js is at project root locally (/var/task on Vercel)
// public/ is at ./public locally (/var/task/public on Vercel via includeFiles)
const PUBLIC_ROOT = path.join(__dirname, 'public');
const PORT = process.env.PORT || 5173;
const HOST = process.env.HOST || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'production';
const IS_DEV = NODE_ENV !== 'production';

const app = express();

// ---------------------------------------------------------------------------
// Load .env (dotenv is not a dependency; parse manually so VAPID keys and
// other env vars are available without installing the package).
// ---------------------------------------------------------------------------
(function loadDotEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    const text = fs.readFileSync(envPath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = val;
    }
  } catch (e) { /* .env absent or unreadable; rely on process environment */ }
})();

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

// Push subscription store — backed by SQL service layer (with in-memory fallback)
const PUSH_SUBS_ENABLED = true;

async function loadPushSubs() {
  // DB service handles its own persistence; nothing to preload here.
  return [];
}

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
  const subs = await db.getPushSubscriptions();
  return subs.map(s => ({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth }, username: s.username }));
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

app.post('/__sb__/push/subscribe', requireWebpush, express.json(), async (req, res) => {
  const { subscription, username } = req.body || {};
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }
  try {
    await db.savePushSubscription({ endpoint: subscription.endpoint, keys: subscription.keys, username: username || 'unknown' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

app.post('/__sb__/push/unsubscribe', requireWebpush, express.json(), async (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });
  await db.removePushSubscription(endpoint);
  res.json({ ok: true });
});

app.post('/__sb__/push/test', requireWebpush, express.json(), async (req, res) => {
  const webpush = require('web-push');
  webpush.setVapidDetails('mailto:safebeef@localhost', vapidKeys.publicKey, vapidKeys.privateKey);
  const all = await db.getPushSubscriptions();
  let sent = 0;
  for (const sub of all) {
    try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title: '🔔 SafeBeef test', body: 'Push is working!', tag: 'safebeef-test' })); sent++; }
    catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) { await db.removePushSubscription(sub.endpoint); } }
  }
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
    const wsSub = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh || sub.keys?.p256dh, auth: sub.auth || sub.keys?.auth } };
    try {
      await webpush.sendNotification(wsSub, JSON.stringify(payload));
      return { ok: true };
    } catch (e) {
      // 404/410 mean the subscription is gone — drop it so the store stays clean.
      if (e && (e.statusCode === 404 || e.statusCode === 410)) {
        try { await db.removePushSubscription(sub.endpoint); } catch (_) {}
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
    const targets = (await db.getPushSubscriptions(targetUsername))
      .filter(s => s.username === targetUsername);
    if (!targets.length) {
      return res.json({ ok: true, sent: 0, failed: 0, targeted: true });
    }
    const results = await Promise.all(targets.map(sendOne));
    const sent = results.filter(r => r.ok).length;
    return res.json({ ok: sent > 0, sent, failed: results.length - sent, targeted: true });
  }

  // 3) Broadcast to every stored subscription.
  const all = await db.getPushSubscriptions();
  if (!all.length) {
    return res.json({ ok: true, sent: 0, failed: 0, broadcast: true });
  }
  const results = await Promise.all(all.map(sendOne));
  const sent = results.filter(r => r.ok).length;
  res.json({ ok: sent > 0, sent, failed: results.length - sent, broadcast: true });
});

app.get('/__sb__/push/subscriptions', requireWebpush, async (req, res) => {
  const all = await db.getPushSubscriptions();
  res.json({ count: all.length, subs: all });
});

// ---------------------------------------------------------------------------
// Auth & moderation API (SQL-backed via db/service.js; in-memory fallback)
// Localhost dev tool — endpoints are open by design.
// ---------------------------------------------------------------------------

// Normalize a ban/mute record from the DB layer into the shape auth.js expects.
function normalizeBan(b) {
  if (!b) return null;
  return {
    reason: b.reason || 'Violation of terms',
    bannedAt: b.created_at || b.bannedAt || 0,
    bannedBy: b.banned_by || 'system',
    expiresAt: b.expires_at ?? null,
    permanent: b.is_permanent || b.expires_at == null,
    automated: b.automated || false,
    appealable: b.appealable !== false,
    fingerprint: b.fingerprint || null,
  };
}
function normalizeMute(m) {
  if (!m) return null;
  return {
    reason: m.reason || 'Muted by moderator',
    mutedAt: m.created_at || 0,
    mutedBy: m.muted_by || 'system',
    until: m.expires_at ?? null,
    permanent: m.expires_at == null,
  };
}

app.post('/__sb__/auth/register', express.json(), async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  try {
    const existing = await db.getUser(username);
    if (existing) return res.status(409).json({ error: 'Username already exists' });
    const user = await db.createUser({ username, email, password, avatar: username.slice(0, 2).toUpperCase(), color: '#4d9dff' });
    res.json({ ok: true, user: { username: user.username, display: user.display_name, email: user.email, role: user.role || 'user', avatar: user.avatar, color: user.color, createdAt: user.created_at } });
  } catch (e) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/__sb__/auth/login', express.json(), async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  try {
    const user = await db.verifyUser(username, password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ban = await db.getActiveBan(user.username);
    if (ban) {
      return res.status(403).json({ banned: true, info: normalizeBan(ban) });
    }
    res.json({ ok: true, user: { username: user.username, display: user.display_name, email: user.email, role: user.role || 'user', avatar: user.avatar, color: user.color, createdAt: user.created_at } });
  } catch (e) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/__sb__/auth/users', async (req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json({ users: users.map(u => ({ username: u.username, display: u.display_name, email: u.email, role: u.role || 'user', avatar: u.avatar, color: u.color, createdAt: u.created_at })) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// Get/update the signed-in user's profile (SQL-backed, localStorage-compatible)
app.get('/__sb__/auth/me', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username required' });
  try {
    const user = await db.getUser(username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { username: user.username, display: user.display_name, email: user.email, role: user.role || 'user', avatar: user.avatar, color: user.color, nameColor: user.name_color, avatarShape: user.avatar_shape, fontStyle: user.font_style, bannerPattern: user.banner_pattern, profileEffect: user.profile_effect, presence: user.presence, statusText: user.status_text, statusExpires: user.status_expires, statusExpiresAt: user.status_expires_at, bio: user.bio, pronouns: user.pronouns, bioVisibility: user.bio_visibility, showOnline: user.show_online, showLastSeen: user.show_last_seen, allowModDMs: user.allow_mod_dms, createdAt: user.created_at } });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

app.patch('/__sb__/auth/me', express.json(), async (req, res) => {
  const { username } = req.query;
  const updates = req.body || {};
  if (!username) return res.status(400).json({ error: 'Username required' });
  // Never let anyone else edit your profile via this endpoint (cookie/session auth not enforced on localhost; keep it simple but guarded).
  try {
    const user = await db.updateUser(username, updates);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, user });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.post('/__sb__/auth/ban', express.json(), async (req, res) => {
  const { username, reason, durationKey, durationMs, bannedBy } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Username required' });
  const me = bannedBy || 'system';
  // Never ban yourself.
  if (username.toLowerCase() === me.toLowerCase()) return res.status(403).json({ error: 'Cannot ban yourself' });
  const BAN_DURATIONS = { '1h': 3600000, '6h': 21600000, '12h': 43200000, '1d': 86400000, '3d': 259200000, '7d': 604800000, '30d': 2592000000 };
  const isPerm = durationKey === 'perm' || durationKey === 'permanent';
  const ms = isPerm ? null : (durationMs || BAN_DURATIONS[durationKey] || BAN_DURATIONS['1d']);
  try {
    const ban = await db.banUser({ username, reason, bannedBy: me, durationMs: ms, isPermanent: isPerm });
    res.json({ ok: true, ban: normalizeBan(ban) });
  } catch (e) {
    res.status(500).json({ error: 'Ban failed' });
  }
});

app.post('/__sb__/auth/unban', express.json(), async (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Username required' });
  await db.unbanUser(username);
  res.json({ ok: true });
});

app.get('/__sb__/auth/bans', async (req, res) => {
  try {
    const bans = await db.getAllBans();
    res.json({ bans: bans.map(normalizeBan) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load bans' });
  }
});

app.get('/__sb__/auth/bans/:username', async (req, res) => {
  try {
    const ban = await db.getActiveBan(req.params.username);
    res.json({ ban: ban ? normalizeBan(ban) : null });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load ban info' });
  }
});

app.post('/__sb__/auth/mute', express.json(), async (req, res) => {
  const { username, reason, durationMs, mutedBy } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Username required' });
  const me = mutedBy || 'system';
  if (username.toLowerCase() === me.toLowerCase()) return res.status(403).json({ error: 'Cannot mute yourself' });
  const isPerm = !durationMs;
  const ms = isPerm ? null : (durationMs || 0);
  try {
    // Store mute as a warning-like record in the warnings table via a dedicated
    // column is not available; use warnings table with a type marker instead.
    await db.addWarning({ username, reason: `[MUTE] ${reason || 'Muted by moderator'}`, warned_by: me, expiresAt: isPerm ? null : ms ? Date.now() + ms : null });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Mute failed' });
  }
});

app.post('/__sb__/auth/unmute', express.json(), async (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Username required' });
  await db.clearWarnings(username);
  res.json({ ok: true });
});

app.get('/__sb__/auth/mutes', async (req, res) => {
  try {
    const { username } = req.query;
    const warns = username ? await db.getWarnings(username) : [];
    res.json({ mutes: warns.filter(w => (w.reason || '').startsWith('[MUTE]')).map(normalizeMute) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load mutes' });
  }
});

app.post('/__sb__/auth/warn', express.json(), async (req, res) => {
  const { username, reason, warnedBy, automated } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Username required' });
  const me = warnedBy || 'system';
  if (username.toLowerCase() === me.toLowerCase()) return res.status(403).json({ error: 'Cannot warn yourself' });
  try {
    const warning = await db.addWarning({ username, reason, warned_by: me, expiresAt: null });
    const recent = await db.getWarnings(username);
    const count = recent.filter(w => w.created_at >= Date.now() - 86400000).length;
    res.json({ ok: true, count, warning: warning });
  } catch (e) {
    res.status(500).json({ error: 'Warn failed' });
  }
});

app.get('/__sb__/auth/warnings/:username', async (req, res) => {
  try {
    const warnings = await db.getWarnings(req.params.username);
    res.json({ warnings, count: warnings.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load warnings' });
  }
});

app.post('/__sb__/auth/warnings/:username/clear', express.json(), async (req, res) => {
  await db.clearWarnings(req.params.username);
  res.json({ ok: true });
});

app.post('/__sb__/auth/freeze', express.json(), async (req, res) => {
  const { username, reason, frozenBy } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Username required' });
  const me = frozenBy || 'system';
  if (username.toLowerCase() === me.toLowerCase()) return res.status(403).json({ error: 'Cannot freeze yourself' });
  try {
    await db.freezeUser({ username, frozenBy: me, reason });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Freeze failed' });
  }
});

app.post('/__sb__/auth/unfreeze', express.json(), async (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Username required' });
  await db.unfreezeUser(username);
  res.json({ ok: true });
});

app.get('/__sb__/auth/frozen/:username', async (req, res) => {
  try {
    const frozen = await db.getFrozenUser(req.params.username);
    res.json({ frozen: frozen || null });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load freeze status' });
  }
});

// ---------------------------------------------------------------------------
// IP / Hardware ban API (SQL-backed)
// ---------------------------------------------------------------------------

app.post('/__sb__/ip-ban/ban', express.json(), async (req, res) => {
  const { ip, fingerprint, reason, durationKey, durationMs, bannedBy, force } = req.body || {};
  if (!ip) return res.status(400).json({ error: 'IP required' });
  const me = bannedBy || 'system';
  const selfIP = req.ip || req.connection?.remoteAddress || '';
  const selfFP = fingerprint;
  // Normalize localhost representations for self-protection
  const isLocalhost = (addr) => addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1' || addr === 'localhost';
  const selfIpMatches = isLocalhost(ip) && isLocalhost(selfIP);
  if (!force && (ip === selfIP || selfIpMatches || (selfFP && fingerprint === selfFP))) {
    return res.status(403).json({ error: 'Refusing to ban own device. Pass { force: true } to override.' });
  }
  const BAN_DURATIONS = { '1h': 3600000, '6h': 21600000, '12h': 43200000, '1d': 86400000, '3d': 259200000, '7d': 604800000, '30d': 2592000000 };
  const isPerm = durationKey === 'perm' || durationKey === 'permanent';
  const ms = isPerm ? null : (durationMs || BAN_DURATIONS[durationKey] || 0);
  try {
    const ban = await db.banIP({ ip, fingerprint, reason, bannedBy: me, durationMs: ms, isPermanent: isPerm });
    res.json({ ok: true, ban });
  } catch (e) {
    res.status(500).json({ error: 'IP ban failed' });
  }
});

app.post('/__sb__/ip-ban/unban', express.json(), async (req, res) => {
  const { ip } = req.body || {};
  if (!ip) return res.status(400).json({ error: 'IP required' });
  await db.unbanIP(ip);
  res.json({ ok: true });
});

app.get('/__sb__/ip-ban/list', async (req, res) => {
  try {
    const bans = await db.getAllIPBans();
    res.json({ bans });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load IP bans' });
  }
});

app.get('/__sb__/ip-ban/check-self', async (req, res) => {
  // Client sends its fingerprint via query; server checks against IP bans.
  const { fingerprint } = req.query;
  const ip = req.ip || req.connection?.remoteAddress || '';
  try {
    const ban = await db.checkIPBan(ip, fingerprint || null);
    res.json({ banned: !!ban, entry: ban || null });
  } catch (e) {
    res.status(500).json({ error: 'Failed to check IP ban' });
  }
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

