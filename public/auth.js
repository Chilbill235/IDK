/* auth.js — SafeBeef v70 */
'use strict';

window.Auth = (function () {
  const USERS_KEY = 'sb26_users';
  const SESSION_KEY = 'sb26_session';
  const REMEMBER_KEY = 'sb26_remember';
  const LOCK_PREFIX = 'sb26_lock_';
  const LOCK_BC = 'sb26_locks';
  const BANS_KEY = 'sb26_bans';
  const MUTES_KEY = 'sb44_mutes';
  const WARN_KEY = 'sb26_warnings';
  const AC_KEY = 'sb26_anticheat';
  const WL_KEY = 'sb26_whitelist';
  const SLOW_KEY = 'sb26_slowmode';
  const INVALIDATED_KEY = 'sb26_session_invalidated';
  const HEARTBEAT_MS = 3000;
  const STALE_MS = 8000;
  const ROLES = { OWNER: 'owner', MOD: 'mod', USER: 'user' };
  const API_BASE = '/__sb__';

  /* ---------- SQL API sync layer (with localStorage fallback) ---------- */
  async function apiRequest(method, path, body) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'same-origin',
      });
      if (!res.ok) return { error: res.statusText, status: res.status };
      return await res.json();
    } catch (e) {
      return { error: e.message };
    }
  }

  async function syncUsersFromServer() {
    const r = await apiRequest('GET', '/auth/users');
    if (!r.error && r.users) {
      const users = {};
      for (const u of r.users) users[u.username] = u;
      saveUsers(users);
    }
  }

  async function syncBansFromServer() {
    const r = await apiRequest('GET', '/auth/bans');
    if (!r.error && r.bans) {
      const bans = { users: {}, ips: {}, history: [] };
      for (const b of r.bans) {
        if (b.username && !b.username.startsWith('FP:') && !b.username.startsWith('ip:')) {
          bans.users[b.username] = { ...b, bannedAt: b.bannedAt || Date.now(), expiresAt: b.expiresAt ?? null };
        }
      }
      saveBans(bans);
    }
  }

  async function syncMutesFromServer() {
    const r = await apiRequest('GET', '/auth/mutes');
    if (!r.error && r.mutes) {
      const mutes = {};
      for (const [username, entry] of Object.entries(r.mutes)) {
        mutes[username] = { ...entry, mutedAt: entry.mutedAt || Date.now(), until: entry.until ?? null };
      }
      saveMutes(mutes);
    }
  }

  async function syncFrozenFromServer() {
    const r = await apiRequest('GET', '/auth/frozen/all');
    if (!r.error && r.frozen) {
      const frozen = {};
      for (const [username, entry] of Object.entries(r.frozen)) {
        frozen[username] = { ...entry, at: entry.created_at || entry.at || Date.now() };
      }
      saveFrozen(frozen);
    }
  }

  async function syncSlowModeFromServer() {
    const r = await apiRequest('GET', '/auth/slowmode/all');
    if (!r.error && r.slowmode) {
      const slow = {};
      for (const [username, entry] of Object.entries(r.slowmode)) {
        slow[username] = { ...entry, since: entry.created_at || entry.since || Date.now() };
      }
      saveSlowMode(slow);
    }
  }

  async function syncWarningsFromServer(username) {
    const r = await apiRequest('GET', '/auth/warnings/' + (username || (window.ME ? window.ME.username : '')));
    if (!r.error && r.warnings) {
      const all = {};
      all[username || window.ME?.username] = r.warnings.map(w => ({ reason: w.reason, at: w.created_at || Date.now(), by: w.warned_by || 'system', automated: w.automated }));
      saveWarnings(all);
    }
  }

  async function syncAllFromServer(username) {
    await Promise.allSettled([
      syncUsersFromServer(),
      syncBansFromServer(),
      syncMutesFromServer(),
      syncFrozenFromServer(),
      syncSlowModeFromServer(),
      syncWarningsFromServer(username),
    ]);
  }

  // Push local changes to server
  async function pushBansToServer(bans) {
    // Individual ban/unban calls are made at time of action; this is for bulk sync if needed
    return true;
  }

  async function pushMutesToServer(mutes) {
    return true;
  }

  async function pushFrozenToServer(frozen) {
    return true;
  }

  async function pushSlowModeToServer(slow) {
    return true;
  }

  function hash(str) {
    let h = 0x811c9dc5;
    for (let iter = 0; iter < 3; iter++) {
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i) + iter;
        h = Math.imul(h, 0x01000193);
      }
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }
  function hashPassword(password, salt) { return hash(salt + '::' + password + '::sb44'); }

  function getUsers() { try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); } catch (e) { return {}; } }
  function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

  function sessionUser() {
    try { const sid = sessionStorage.getItem(SESSION_KEY); if (!sid) return null; return getUsers()[sid] || null; }
    catch (e) { return null; }
  }
  function current() { return sessionUser(); }

  function getTabId() {
    let tid = sessionStorage.getItem('sb26_tabid');
    if (!tid) { tid = 'TAB-' + Math.random().toString(36).slice(2, 10).toUpperCase(); sessionStorage.setItem('sb26_tabid', tid); }
    return tid;
  }

  function isOwner(username) { const u = getUsers()[username]; return u && u.role === ROLES.OWNER; }
  function isMod(username) { const u = getUsers()[username]; return u && (u.role === ROLES.MOD || u.role === ROLES.OWNER); }
  function isPrivileged(username) { return isOwner(username) || isMod(username); }

  function setRole(username, role) {
    const users = getUsers();
    if (!users[username]) return false;
    const me = current();
    if (!me || me.role !== ROLES.OWNER) return false;
    if (username === me.username) return false;
    const oldRole = users[username].role;
    users[username].role = role;
    saveUsers(users);
    try { window.RT?.roleChanged(username, role); } catch (e) {}
    try {
      const bans = getBans();
      bans.history = bans.history || [];
      bans.history.push({ action: role === 'mod' ? 'promote' : 'demote', username, by: me.username, at: Date.now(), oldRole, newRole: role });
      saveBans(bans);
    } catch (e) {}
    return true;
  }

  function ensureDefaultOwner() {
    const users = getUsers();
    const ownerExists = Object.values(users).some(u => u.role === ROLES.OWNER);
    if (!ownerExists && Object.keys(users).length > 0) {
      const firstUser = Object.values(users)[0];
      if (firstUser) { firstUser.role = ROLES.OWNER; saveUsers(users); }
    }
  }

  function getWhitelist() { try { return JSON.parse(localStorage.getItem(WL_KEY) || '[]') || []; } catch (e) { return []; } }
  function isWhitelisted(username) { return getWhitelist().includes(username); }
  function getSlowMode() { try { return JSON.parse(localStorage.getItem(SLOW_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function getSlowModeFor(username) { const m = getSlowMode(); return m[username] || null; }

  function getBans() {
    try {
      const raw = JSON.parse(localStorage.getItem(BANS_KEY) || '{}');
      return { users: raw.users || {}, ips: raw.ips || {}, history: raw.history || [] };
    } catch (e) { return { users: {}, ips: {}, history: [] }; }
  }
  function saveBans(bans) { localStorage.setItem(BANS_KEY, JSON.stringify(bans)); }

  const BAN_DURATIONS = { '1h': 3600000, '6h': 21600000, '12h': 43200000, '1d': 86400000, '3d': 259200000, '7d': 604800000, '30d': 2592000000, 'perm': null };

  function formatDuration(ms) {
    if (ms == null) return 'Permanent';
    if (ms <= 0) return 'Expired';
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const parts = [];
    if (d) parts.push(d + 'd');
    if (h) parts.push(h + 'h');
    if (m) parts.push(m + 'm');
    if (!d && !h && sec) parts.push(sec + 's');
    return parts.join(' ') || '0s';
  }

  function isUserBanned(username) {
    if (isPrivileged(username)) return false;
    const bans = getBans();
    const entry = bans.users[username];
    if (!entry) return false;
    if (entry.expiresAt == null) return true;
    if (Date.now() >= entry.expiresAt) {
      delete bans.users[username];
      saveBans(bans);
      try { window.RT?.banCleared(username); } catch (e) {}
      return false;
    }
    return true;
  }

  function getBanInfo(username) {
    if (isPrivileged(username)) return null;
    const bans = getBans();
    const entry = bans.users[username];
    if (!entry) return null;
    if (entry.expiresAt != null && Date.now() >= entry.expiresAt) {
      delete bans.users[username];
      saveBans(bans);
      return null;
    }
    const remaining = entry.expiresAt == null ? null : entry.expiresAt - Date.now();
    return { ...entry, remaining, remainingLabel: remaining == null ? 'Permanent' : formatDuration(remaining), permanent: entry.expiresAt == null };
  }

  function banUser(username, reason, durationKeyOrMs, opts = {}) {
    if (isPrivileged(username)) return null;
    // Never ban yourself.
    const me = current()?.username;
    if (username.toLowerCase() === (me || '').toLowerCase()) return null;
    const bans = getBans();
    const durationMs = typeof durationKeyOrMs === 'number' ? durationKeyOrMs : (BAN_DURATIONS[durationKeyOrMs] !== undefined ? BAN_DURATIONS[durationKeyOrMs] : BAN_DURATIONS['1d']);
    const expiresAt = durationMs == null ? null : Date.now() + durationMs;
    const entry = {
      reason: reason || 'Violation of terms', bannedAt: Date.now(),
      bannedBy: current()?.username || opts.system || 'system',
      expiresAt, durationKey: typeof durationKeyOrMs === 'string' ? durationKeyOrMs : null,
      permanent: expiresAt == null, automated: !!opts.automated, appealable: opts.appealable !== false,
      fingerprint: (window.IPBan && IPBan.lookupUser) ? ((IPBan.lookupUser(username) || {}).fp || (IPBan.lookupUser(username) || {}).fingerprint) || null : null,
    };
    bans.users[username] = entry;
    bans.history = bans.history || [];
    bans.history.push({ action: 'ban', username, reason: entry.reason, bannedBy: entry.bannedBy, at: entry.bannedAt, expiresAt, automated: entry.automated });
    if (bans.history.length > 500) bans.history = bans.history.slice(-500);
    saveBans(bans);
    // Sync to SQL server (fire and forget)
    apiRequest('POST', '/auth/ban', { username, reason: entry.reason, durationKey: entry.durationKey, durationMs, bannedBy: entry.bannedBy }).catch(() => {});
    if (sessionStorage.getItem(SESSION_KEY) === username) sessionStorage.removeItem(SESSION_KEY);
    try { window.RT?.banChanged(username, entry); } catch (e) {}
    try {
      const bc = new BroadcastChannel('sb26_bans_v64');
      bc.postMessage({ action: 'account-ban', username, entry });
      bc.close();
    } catch (e) {}
    return entry;
  }

  function unbanUser(username) {
    const bans = getBans();
    delete bans.users[username];
    bans.history = bans.history || [];
    bans.history.push({ action: 'unban', username, by: current()?.username || 'system', at: Date.now() });
    if (bans.history.length > 500) bans.history = bans.history.slice(-500);
    saveBans(bans);
    apiRequest('POST', '/auth/unban', { username }).catch(() => {});
    try { window.RT?.banCleared(username); } catch (e) {}
    try {
      const bc = new BroadcastChannel('sb26_bans_v64');
      bc.postMessage({ action: 'account-unban', username });
      bc.close();
    } catch (e) {}
    return true;
  }

  const MUTE_DURATIONS = { '5m': 5*60000, '15m': 15*60000, '1h': 3600000, '6h': 21600000, '1d': 86400000, '7d': 604800000, 'perm': null };

  function getMutes() { try { return JSON.parse(localStorage.getItem(MUTES_KEY) || '{}'); } catch (e) { return {}; } }
  function saveMutes(m) { localStorage.setItem(MUTES_KEY, JSON.stringify(m)); }

  function isUserMuted(username) {
    if (isPrivileged(username)) return false;
    const mutes = getMutes();
    const entry = mutes[username];
    if (!entry) return false;
    if (entry.until == null) return true;
    if (Date.now() >= entry.until) {
      delete mutes[username];
      saveMutes(mutes);
      try { window.RT?.unmute(username); } catch (e) {}
      return false;
    }
    return true;
  }

  function getMuteInfo(username) {
    if (isPrivileged(username)) return null;
    const mutes = getMutes();
    const entry = mutes[username];
    if (!entry) return null;
    if (entry.until != null && Date.now() >= entry.until) { delete mutes[username]; saveMutes(mutes); return null; }
    const remaining = entry.until == null ? null : entry.until - Date.now();
    return { ...entry, remaining, remainingLabel: remaining == null ? 'Permanent' : formatDuration(remaining), permanent: entry.until == null };
  }

  function muteUser(username, reason, durationKeyOrMs) {
    if (isPrivileged(username)) return null;
    const me = current()?.username;
    if (username.toLowerCase() === (me || '').toLowerCase()) return null;
    const mutes = getMutes();
    const durationMs = typeof durationKeyOrMs === 'number' ? durationKeyOrMs : (MUTE_DURATIONS[durationKeyOrMs] !== undefined ? MUTE_DURATIONS[durationKeyOrMs] : MUTE_DURATIONS['15m']);
    const until = durationMs == null ? null : Date.now() + durationMs;
    const entry = { reason: reason || 'Muted by moderator', mutedAt: Date.now(), mutedBy: current()?.username || 'system', until, permanent: until == null };
    mutes[username] = entry;
    saveMutes(mutes);
    apiRequest('POST', '/auth/mute', { username, reason: entry.reason, durationMs, mutedBy: entry.mutedBy }).catch(() => {});
    try { window.RT?.mute(username, until, entry.reason); } catch (e) {}
    return entry;
  }

  function unmuteUser(username) {
    const mutes = getMutes();
    delete mutes[username];
    saveMutes(mutes);
    apiRequest('POST', '/auth/unmute', { username }).catch(() => {});
    try { window.RT?.unmute(username); } catch (e) {}
    return true;
  }

  function freezeUser(username, reason) {
    if (isPrivileged(username)) return null;
    const frozen = getFrozen();
    frozen[username] = { reason: reason || 'Frozen by auto-mod', at: Date.now(), by: current()?.username || 'system' };
    saveFrozen(frozen);
    apiRequest('POST', '/auth/freeze', { username, reason: frozen[username].reason, frozenBy: frozen[username].by }).catch(() => {});
    try { window.RT?.emit?.('freeze', { username, reason: frozen[username].reason }); } catch (e) {}
    sessionStorage.setItem('sb26_frozen', '1');
    return frozen[username];
  }

  function unfreezeUser(username) {
    const frozen = getFrozen();
    delete frozen[username];
    saveFrozen(frozen);
    apiRequest('POST', '/auth/unfreeze', { username }).catch(() => {});
    try { window.RT?.emit?.('unfreeze', { username }); } catch (e) {}
    sessionStorage.removeItem('sb26_frozen');
    return true;
  }

  function getFrozen() { try { return JSON.parse(localStorage.getItem('sb26_frozen_users') || '{}'); } catch (e) { return {}; } }
  function saveFrozen(f) { localStorage.setItem('sb26_frozen_users', JSON.stringify(f)); }

  function setSlowMode(username, seconds, setBy) {
    const slow = getSlowMode();
    slow[username] = { seconds, since: Date.now(), by: setBy || current()?.username || 'system' };
    saveSlowMode(slow);
    apiRequest('POST', '/auth/slowmode', { username, seconds, setBy: slow[username].by }).catch(() => {});
    return slow[username];
  }

  function clearSlowMode(username) {
    const slow = getSlowMode();
    delete slow[username];
    saveSlowMode(slow);
    apiRequest('POST', '/auth/slowmode/clear', { username }).catch(() => {});
  }

  function canSendMessages(username) {
    if (isPrivileged(username)) return null;
    if (isUserBanned(username)) {
      const info = getBanInfo(username);
      return { reason: 'banned', label: 'You are banned', detail: info?.reason || 'Account suspended', until: info?.expiresAt ?? null, remaining: info?.remaining ?? null, remainingLabel: info?.remainingLabel || 'Permanent', permanent: info?.permanent };
    }
    if (isUserMuted(username)) {
      const info = getMuteInfo(username);
      return { reason: 'muted', label: 'You are muted', detail: info?.reason || 'Muted by moderator', until: info?.until ?? null, remaining: info?.remaining ?? null, remainingLabel: info?.remainingLabel || 'Permanent', permanent: info?.permanent };
    }
    if (sessionStorage.getItem('sb26_frozen') === '1') {
      return { reason: 'frozen', label: 'Your account is frozen', detail: 'A moderator has frozen your access', until: null, remaining: null, remainingLabel: 'Until unfrozen', permanent: false };
    }
    return null;
  }

  function canSendAtSlowMode(username) {
    const slow = getSlowModeFor(username);
    if (!slow || slow.seconds <= 0) return { ok: true };
    const lastKey = 'sb26_last_msg_' + username;
    const last = parseInt(localStorage.getItem(lastKey) || '0', 10);
    const wait = slow.seconds * 1000;
    const now = Date.now();
    const remaining = (last + wait) - now;
    if (remaining > 0) return { ok: false, remaining, seconds: slow.seconds };
    return { ok: true };
  }
  function markMessageSent(username) {
    const slow = getSlowModeFor(username);
    if (!slow || slow.seconds <= 0) return;
    const lastKey = 'sb26_last_msg_' + username;
    localStorage.setItem(lastKey, String(Date.now()));
  }

  const WARN_THRESHOLDS = { 
    windowMs: 86400000, 
    // Graduated response thresholds (warnings in 24h)
    warnMute: 2,        // 2 warnings -> mute
    warnFreeze: 3,      // 3 warnings -> freeze
    warnSlowMode: 4,    // 4 warnings -> slow mode
    warnBan: 5,         // 5 warnings -> temp ban (1h)
    warnBan2: 6,        // 6 warnings -> temp ban (6h)
    warnBan3: 7,        // 7 warnings -> temp ban (1d)
    warnBanHard: 8,     // 8 warnings -> temp ban (7d)
    warnBanMax: 10,     // 10 warnings -> perm ban
    // Action durations
    muteDuration: '1h',
    freezeDuration: '6h',
    slowModeSeconds: 30,
    banDurations: { 5: '1h', 6: '6h', 7: '1d', 8: '7d', 10: 'perm' }
  };

  function getWarnings() { try { return JSON.parse(localStorage.getItem(WARN_KEY) || '{}'); } catch (e) { return {}; } }
  function saveWarnings(w) { localStorage.setItem(WARN_KEY, JSON.stringify(w)); }

  function getRecentWarnings(username) {
    const all = getWarnings();
    const list = all[username] || [];
    const cutoff = Date.now() - WARN_THRESHOLDS.windowMs;
    return list.filter(w => w.at >= cutoff);
  }

  function warnUser(username, reason, opts = {}) {
    if (isPrivileged(username)) return { count: 0, recent: [], actions: [], ignored: true };
    if (isWhitelisted(username)) return { count: 0, recent: [], actions: [], ignored: true };
    const me = current()?.username;
    if (username.toLowerCase() === (me || '').toLowerCase()) return { count: 0, recent: [], actions: [], ignored: true };
    const all = getWarnings();
    all[username] = all[username] || [];
    all[username].push({ reason: reason || 'Warning', at: Date.now(), by: current()?.username || 'system', automated: !!opts.automated });
    if (all[username].length > 100) all[username] = all[username].slice(-100);
    saveWarnings(all);
    const recent = getRecentWarnings(username);
    const count = recent.length;
    try { window.RT?.warn(username, { count, reason, automated: !!opts.automated }); } catch (e) {}
    apiRequest('POST', '/auth/warn', { username, reason, warnedBy: current()?.username || 'system', automated: !!opts.automated }).catch(() => {});
    
    const actions = [];
    let banResult = null;
    
    // Graduated auto-mod responses
    if (count === WARN_THRESHOLDS.warnMute) {
      const muteResult = muteUser(username, `Auto-mute: ${count} warnings in 24h`, WARN_THRESHOLDS.muteDuration);
      if (muteResult) actions.push({ type: 'mute', duration: WARN_THRESHOLDS.muteDuration, reason: `Auto-mute at ${count} warnings` });
    }
    if (count === WARN_THRESHOLDS.warnFreeze) {
      const freezeResult = freezeUser(username, `Auto-freeze: ${count} warnings in 24h`);
      if (freezeResult) actions.push({ type: 'freeze', duration: WARN_THRESHOLDS.freezeDuration, reason: `Auto-freeze at ${count} warnings` });
    }
    if (count === WARN_THRESHOLDS.warnSlowMode) {
      setSlowMode(username, WARN_THRESHOLDS.slowModeSeconds, current()?.username || 'system');
      actions.push({ type: 'slowmode', seconds: WARN_THRESHOLDS.slowModeSeconds, reason: `Auto-slowmode at ${count} warnings` });
    }
    if (count >= WARN_THRESHOLDS.warnBan) {
      const durationKey = WARN_THRESHOLDS.banDurations[count] || '1h';
      banResult = banUser(username, `Auto-ban: ${count} warnings in 24h`, durationKey, { automated: true, appealable: true });
      actions.push({ type: 'ban', duration: durationKey, reason: `Auto-ban at ${count} warnings` });
    }
    
    return { count, recent, actions, ban: banResult };
  }

  function clearWarnings(username) {
    const all = getWarnings();
    delete all[username];
    saveWarnings(all);
    apiRequest('POST', `/auth/warnings/${encodeURIComponent(username)}/clear`).catch(() => {});
    try { window.RT?.warn(username, { count: 0, cleared: true }); } catch (e) {}
  }

  function getWarningInfo(username) {
    if (isPrivileged(username)) return { count: 0, warnings: [], nextBanAt: 0, privileged: true };
    const recent = getRecentWarnings(username);
    return { count: recent.length, warnings: recent, nextBanAt: Math.max(0, WARN_THRESHOLDS.warnBan - recent.length) };
  }

  function getAntiCheatState() { try { return JSON.parse(localStorage.getItem(AC_KEY) || '{}'); } catch (e) { return {}; } }
  function saveAntiCheatState(s) { localStorage.setItem(AC_KEY, JSON.stringify(s)); }

  function reportSuspiciousAction(username, actionType) {
    if (isPrivileged(username)) return { action: 'none', privileged: true };
    if (isWhitelisted(username)) return { action: 'none', whitelisted: true };
    const state = getAntiCheatState();
    state[username] = state[username] || { strikes: {}, lastAt: 0 };
    const now = Date.now();
    state[username].strikes[actionType] = state[username].strikes[actionType] || [];
    state[username].strikes[actionType].push(now);
    const cutoff = now - WARN_THRESHOLDS.windowMs;
    state[username].strikes[actionType] = state[username].strikes[actionType].filter(t => t >= cutoff);
    state[username].lastAt = now;
    saveAntiCheatState(state);
    const thresholds = { 'hook-spam': 3, 'module-spam': 8, 'media-capture': 5, 'fake-module-spam': 6, 'message-spam': 20, 'remote-module-abuse': 4 };
    const trigger = thresholds[actionType] || 999;
    const count = state[username].strikes[actionType].length;
    if (count >= trigger) {
      state[username].strikes[actionType] = [];
      saveAntiCheatState(state);
      const w = warnUser(username, `Automated: ${actionType} (${count} in 24h)`, { automated: true });
      return { action: w.ban ? 'ban' : 'warn', warning: w, trigger, count };
    }
    return { action: 'none', count, trigger };
  }

  let _lockChannel = null;
  function getLock(username) { try { const raw = localStorage.getItem(LOCK_PREFIX + username); if (!raw) return null; return JSON.parse(raw); } catch (e) { return null; } }
  function setLock(username, tabId) { const payload = { tabId, ts: Date.now() }; localStorage.setItem(LOCK_PREFIX + username, JSON.stringify(payload)); return payload; }
  function clearLock(username) { localStorage.removeItem(LOCK_PREFIX + username); }
  function isStale(lock) { return !lock || (Date.now() - (lock.ts || 0) > STALE_MS); }
  function broadcast(action, username, tabId) {
    try {
      if (!_lockChannel) _lockChannel = new BroadcastChannel(LOCK_BC);
      _lockChannel.postMessage({ action, username, tabId, ts: Date.now() });
    } catch (e) {}
  }
  function initLockChannel(onChange) {
    try {
      if (!_lockChannel) _lockChannel = new BroadcastChannel(LOCK_BC);
      _lockChannel.onmessage = (e) => {
        const m = e.data || {};
        if (!m.username) return;
        if (m.action === 'takeover' && m.tabId !== getTabId()) {
          const mine = sessionStorage.getItem(SESSION_KEY);
          if (mine === m.username) {
            sessionStorage.removeItem(SESSION_KEY);
            if (typeof window.__sbOnKicked === 'function') window.__sbOnKicked(m.username);
          }
        }
        if (typeof onChange === 'function') onChange();
      };
    } catch (e) {}
  }

  function isSessionInvalidated(username) {
    try {
      const inv = JSON.parse(localStorage.getItem(INVALIDATED_KEY) || '{}');
      if (!inv[username]) return false;
      const session = JSON.parse(sessionStorage.getItem(SESSION_KEY + '_ts') || '0');
      return parseInt(session, 10) < inv[username];
    } catch (e) { return false; }
  }

  async function checkIpBanAsync() {
    if (!window.IPBan) return null;
    try { return await window.IPBan.checkSelf(); } catch (e) { return null; }
  }

  async function createUser({ username, email, password }) {
    username = username.trim().toLowerCase();
    email = email.trim().toLowerCase();
    // Server-side check first
    const reg = await apiRequest('POST', '/auth/register', { username, email, password });
    if (reg.ok && reg.user) {
      // Sync localStorage cache from server response
      const users = getUsers();
      users[reg.user.username] = {
        username: reg.user.username, display: reg.user.display, email: reg.user.email, salt: '',
        hash: '', createdAt: reg.user.createdAt, avatar: reg.user.avatar, color: reg.user.color,
        role: reg.user.role || ROLES.USER, banned: false,
      };
      saveUsers(users);
      try { window.IPBan && IPBan.registerSelf && IPBan.registerSelf(reg.user.username); } catch (e) {}
      return { user: reg.user };
    }
    if (reg.status === 409) return { error: 'Username already exists.' };
    // Fallback to localStorage-only
    const users = getUsers();
    if (users[username]) return { error: 'Username already exists.' };
    if (Object.values(users).some(u => u.email === email)) return { error: 'Email already registered.' };
    const colors = ['#4d9dff','#b586ff','#2ee6d6','#ff5a6e','#ffb340','#34d97f','#ff66ff','#6df0e3'];
    const salt = Math.random().toString(36).slice(2, 12);
    const isFirstUser = Object.keys(users).length === 0;
    const user = {
      username, display: username, email, salt,
      hash: hashPassword(password, salt),
      createdAt: Date.now(),
      avatar: username.slice(0, 2).toUpperCase(),
      color: colors[Object.keys(users).length % colors.length],
      role: isFirstUser ? ROLES.OWNER : ROLES.USER,
      banned: false,
    };
    users[username] = user;
    saveUsers(users);
    try { window.IPBan && IPBan.registerSelf && IPBan.registerSelf(username); } catch (e) {}
    return { user };
  }

  async function login(username, password, remember, options = {}) {
    username = username.trim().toLowerCase();
    // Try server first
    const lr = await apiRequest('POST', '/auth/login', { username, password });
    if (lr.ok && lr.user) {
      if (lr.banned) {
        try {
          sessionStorage.setItem('sb26_banned_preview', lr.user.username);
          sessionStorage.setItem('sb26_banned_info', JSON.stringify({ username: lr.user.username, display: lr.user.display, avatar: lr.user.avatar, color: lr.user.color, info: lr.info }));
        } catch (e) {}
        return { banned: true, info: lr.info };
      }
      const users = getUsers();
      users[lr.user.username] = {
        username: lr.user.username, display: lr.user.display, email: lr.user.email, salt: '',
        hash: '', createdAt: lr.user.createdAt, avatar: lr.user.avatar, color: lr.user.color,
        role: lr.user.role || ROLES.USER, banned: false,
      };
      saveUsers(users);

      const existing = getLock(lr.user.username);
      const tid = getTabId();
      if (existing && existing.tabId !== tid && !isStale(existing) && !options.force) return { conflict: existing, user: lr.user };
      if (existing && existing.tabId !== tid && isStale(existing)) clearLock(lr.user.username);
      setLock(lr.user.username, tid);
      broadcast('lock', lr.user.username, tid);

      sessionStorage.setItem(SESSION_KEY, lr.user.username);
      sessionStorage.setItem(SESSION_KEY + '_ts', String(Date.now()));
      if (remember) localStorage.setItem(REMEMBER_KEY, lr.user.username);
      else localStorage.removeItem(REMEMBER_KEY);
      try { window.IPBan && IPBan.registerSelf && IPBan.registerSelf(lr.user.username); } catch (e) {}
      return { user: lr.user };
    }
    if (lr.status === 403 && lr.banned) {
      try { sessionStorage.setItem('sb26_banned_preview', username); } catch (e) {}
      return { banned: true, info: lr.info };
    }
    if (lr.status === 401) return { error: 'Invalid credentials.' };

    // Fallback to localStorage-only
    const users = getUsers();
    const user = users[username] || Object.values(users).find(u => u.email === username);
    if (!user) return { error: 'User not found.' };
    if (user.hash !== hashPassword(password, user.salt || '')) return { error: 'Incorrect password.' };

    if (window.IPBan) {
      try {
        const ipEntry = await window.IPBan.checkSelf();
        if (ipEntry) {
          try { sessionStorage.setItem('sb26_ip_banned_info', JSON.stringify(ipEntry)); } catch (e) {}
          return { ipBanned: true, ipEntry };
        }
      } catch (e) {}
    }

    if (isUserBanned(user.username)) {
      const info = getBanInfo(user.username);
      try {
        sessionStorage.setItem('sb26_banned_preview', user.username);
        sessionStorage.setItem('sb26_banned_info', JSON.stringify({ username: user.username, display: user.display, avatar: user.avatar, color: user.color, info }));
      } catch (e) {}
      return { banned: true, info };
    }

    const existing = getLock(user.username);
    const tid = getTabId();
    if (existing && existing.tabId !== tid && !isStale(existing) && !options.force) return { conflict: existing, user };
    if (existing && existing.tabId !== tid && isStale(existing)) clearLock(user.username);
    setLock(user.username, tid);
    broadcast('lock', user.username, tid);

    sessionStorage.setItem(SESSION_KEY, user.username);
    sessionStorage.setItem(SESSION_KEY + '_ts', String(Date.now()));
    if (remember) localStorage.setItem(REMEMBER_KEY, user.username);
    else localStorage.removeItem(REMEMBER_KEY);
    try { window.IPBan && IPBan.registerSelf && IPBan.registerSelf(user.username); } catch (e) {}
    return { user };
  }

  async function forceLogin(username, password, remember) {
    username = username.trim().toLowerCase();
    // Try server first
    const lr = await apiRequest('POST', '/auth/login', { username, password });
    if (lr.ok && lr.user) {
      if (lr.banned) {
        try {
          sessionStorage.setItem('sb26_banned_preview', lr.user.username);
          sessionStorage.setItem('sb26_banned_info', JSON.stringify({ username: lr.user.username, display: lr.user.display, avatar: lr.user.avatar, color: lr.user.color, info: lr.info }));
        } catch (e) {}
        return { banned: true, info: lr.info };
      }
      const users = getUsers();
      users[lr.user.username] = {
        username: lr.user.username, display: lr.user.display, email: lr.user.email, salt: '',
        hash: '', createdAt: lr.user.createdAt, avatar: lr.user.avatar, color: lr.user.color,
        role: lr.user.role || ROLES.USER, banned: false,
      };
      saveUsers(users);

      const tid = getTabId();
      clearLock(lr.user.username);
      setLock(lr.user.username, tid);
      broadcast('takeover', lr.user.username, tid);
      sessionStorage.setItem(SESSION_KEY, lr.user.username);
      sessionStorage.setItem(SESSION_KEY + '_ts', String(Date.now()));
      if (remember) localStorage.setItem(REMEMBER_KEY, lr.user.username);
      else localStorage.removeItem(REMEMBER_KEY);
      try { window.IPBan && IPBan.registerSelf && IPBan.registerSelf(lr.user.username); } catch (e) {}
      return { user: lr.user };
    }
    if (lr.status === 403 && lr.banned) {
      try { sessionStorage.setItem('sb26_banned_preview', username); } catch (e) {}
      return { banned: true, info: lr.info };
    }
    if (lr.status === 401) return { error: 'Invalid credentials.' };

    // Fallback to localStorage-only
    const users = getUsers();
    const user = users[username] || Object.values(users).find(u => u.email === username);
    if (!user) return { error: 'User not found.' };
    if (user.hash !== hashPassword(password, user.salt || '')) return { error: 'Incorrect password.' };

    if (window.IPBan) {
      try {
        const ipEntry = await window.IPBan.checkSelf();
        if (ipEntry) {
          try { sessionStorage.setItem('sb26_ip_banned_info', JSON.stringify(ipEntry)); } catch (e) {}
          return { ipBanned: true, ipEntry };
        }
      } catch (e) {}
    }

    if (isUserBanned(user.username)) {
      const info = getBanInfo(user.username);
      try {
        sessionStorage.setItem('sb26_banned_preview', user.username);
        sessionStorage.setItem('sb26_banned_info', JSON.stringify({ username: user.username, display: user.display, avatar: user.avatar, color: user.color, info }));
      } catch (e) {}
      return { banned: true, info };
    }

    const tid = getTabId();
    clearLock(user.username);
    setLock(user.username, tid);
    broadcast('takeover', user.username, tid);
    sessionStorage.setItem(SESSION_KEY, user.username);
    sessionStorage.setItem(SESSION_KEY + '_ts', String(Date.now()));
    if (remember) localStorage.setItem(REMEMBER_KEY, user.username);
    else localStorage.removeItem(REMEMBER_KEY);
    try { window.IPBan && IPBan.registerSelf && IPBan.registerSelf(user.username); } catch (e) {}
    return { user };
  }

  function logout() {
    const u = sessionStorage.getItem(SESSION_KEY);
    const tid = getTabId();
    if (u) {
      const lock = getLock(u);
      if (lock && lock.tabId === tid) { clearLock(u); broadcast('logout', u, tid); }
    }
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY + '_ts');
    localStorage.removeItem(REMEMBER_KEY);
  }

  function listOthers() {
    const me = current();
    if (!me) return [];
    return Object.values(getUsers()).filter(u => u.username !== me.username);
  }

  function startHeartbeat() {
    if (window.__sb_heartbeat_started) return;
    window.__sb_heartbeat_started = true;
    setInterval(() => {
      const u = sessionStorage.getItem(SESSION_KEY);
      if (!u) return;
      if (isUserBanned(u)) {
        const users = getUsers();
        const user = users[u];
        if (user) {
          try {
            sessionStorage.setItem('sb26_banned_preview', u);
            sessionStorage.setItem('sb26_banned_info', JSON.stringify({ username: user.username, display: user.display, avatar: user.avatar, color: user.color, info: getBanInfo(u) }));
          } catch (e) {}
        }
        sessionStorage.removeItem(SESSION_KEY);
        location.replace('banned.html');
        return;
      }
      if (isSessionInvalidated(u)) {
        sessionStorage.removeItem(SESSION_KEY);
        if (typeof window.__sbOnKicked === 'function') window.__sbOnKicked(u);
        return;
      }
      if (!isPrivileged(u)) {
        const mutes = getMutes();
        if (mutes[u] && mutes[u].until != null && Date.now() >= mutes[u].until) {
          delete mutes[u];
          saveMutes(mutes);
          try { window.RT?.unmute(u); } catch (e) {}
        }
      }
      const tid = getTabId();
      const lock = getLock(u);
      if (lock && lock.tabId === tid) setLock(u, tid);
      else if (lock && lock.tabId !== tid) {
        sessionStorage.removeItem(SESSION_KEY);
        if (typeof window.__sbOnKicked === 'function') window.__sbOnKicked(u);
      }
    }, HEARTBEAT_MS);
  }

  function rememberedUsername() { try { return localStorage.getItem(REMEMBER_KEY); } catch (e) { return null; } }
  function whoElseHasAccount(username) {
    const lock = getLock(username);
    if (!lock || !lock.tabId) return null;
    if (lock.tabId === getTabId()) return null;
    if (isStale(lock)) return null;
    return lock;
  }

  async function initAuthPage() {
    ensureDefaultOwner();
    if (sessionUser()) { location.replace('index.html'); return; }
    initLockChannel();

    // Sync authoritative data from SQL server (localStorage fallback if offline)
    await syncAllFromServer();

    const tabs = document.querySelectorAll('.auth-tab');
    const tabsWrap = document.querySelector('.auth-tabs');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (!loginForm || !registerForm) return;

    const remembered = rememberedUsername();
    if (remembered) { const lu = document.getElementById('loginUser'); if (lu) lu.value = remembered; }

    function switchTab(name) {
      tabs.forEach(t => { t.classList.toggle('on', t.dataset.tab === name); t.setAttribute('aria-selected', String(t.dataset.tab === name)); });
      if (tabsWrap) tabsWrap.dataset.active = name;
      loginForm.classList.toggle('hidden', name !== 'login');
      registerForm.classList.toggle('hidden', name !== 'register');
      clearError('loginError'); clearError('registerError');
      setTimeout(() => { const first = (name === 'login' ? loginForm : registerForm).querySelector('input'); first?.focus(); }, 60);
    }
    tabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

    function setBtnLoading(btn, loading) { if (!btn) return; btn.disabled = loading; btn.classList.toggle('loading', loading); }
    function flashError(id, message) {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = message; el.classList.add('show');
      const card = document.querySelector('.auth-card');
      if (card) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
    }
    function clearError(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = ''; el.classList.remove('show');
    }
    function showConflictDialog(user, onForce) {
      const existing = document.getElementById('authConflictOverlay');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.id = 'authConflictOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px';
      overlay.innerHTML = `
        <div style="background:var(--surface);border:1px solid var(--border-2);border-radius:16px;padding:24px;max-width:380px;text-align:center">
          <div style="font-size:40px;margin-bottom:10px">🔒</div>
          <h2 style="font-size:17px;font-weight:800;margin-bottom:8px">Already signed in</h2>
          <p style="font-size:12.5px;color:var(--text-2);margin-bottom:8px"><strong>@${escHtml(user.username)}</strong> is already signed in on another tab.</p>
          <p style="font-size:11px;color:var(--text-3);margin-bottom:16px">Continuing will sign out that tab.</p>
          <div style="display:flex;gap:8px">
            <button class="btn" id="authConflictCancel" style="flex:1">Cancel</button>
            <button class="btn primary" id="authConflictTake" style="flex:1">Take over</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#authConflictCancel').onclick = () => overlay.remove();
      overlay.querySelector('#authConflictTake').onclick = () => { overlay.remove(); onForce(); };
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    }
    function escHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    function redirectToBanned(user, info) {
      try {
        sessionStorage.setItem('sb26_banned_preview', user.username);
        sessionStorage.setItem('sb26_banned_info', JSON.stringify({ username: user.username, display: user.display, avatar: user.avatar, color: user.color, info }));
      } catch (e) {}
      location.replace('banned.html');
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError('loginError');
      const u = document.getElementById('loginUser').value.trim();
      const p = document.getElementById('loginPass').value;
      const remember = document.getElementById('rememberMe').checked;
      if (!u || !p) { flashError('loginError', 'Please fill in all fields.'); return; }
      const btn = document.getElementById('loginBtn');
      setBtnLoading(btn, true);

      const ipEntry = await checkIpBanAsync();
      if (ipEntry) {
        setBtnLoading(btn, false);
        try { sessionStorage.setItem('sb26_ip_banned_info', JSON.stringify(ipEntry)); } catch (err) {}
        location.replace('banned.html');
        return;
      }

      setTimeout(async () => {
        const res = await login(u, p, remember);
        if (res.ipBanned) { setBtnLoading(btn, false); location.replace('banned.html'); return; }
        if (res.banned) {
          setBtnLoading(btn, false);
          const users = getUsers();
          const key = u.toLowerCase();
          const user = users[key] || Object.values(users).find(x => x.email === key);
          if (user) return redirectToBanned(user, res.info);
          location.replace('banned.html');
          return;
        }
        if (res.conflict) {
          setBtnLoading(btn, false);
          showConflictDialog(res.user, () => {
            setBtnLoading(btn, true);
            setTimeout(async () => {
              const forced = await forceLogin(u, p, remember);
              if (forced.ipBanned) { setBtnLoading(btn, false); location.replace('banned.html'); return; }
              if (forced.banned) { setBtnLoading(btn, false); return redirectToBanned(forced.user || res.user, forced.info); }
              if (forced.error) { setBtnLoading(btn, false); flashError('loginError', forced.error); return; }
              btn.classList.add('success');
              setTimeout(() => location.replace('index.html'), 450);
            }, 250);
          });
          return;
        }
        if (res.error) { setBtnLoading(btn, false); flashError('loginError', res.error); return; }
        btn.classList.add('success');
        setTimeout(() => location.replace('index.html'), 450);
      }, 400);
    });

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError('registerError');
      const data = {
        username: document.getElementById('regUser').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        password: document.getElementById('regPass').value,
      };
      if (!/^[a-zA-Z0-9_]{3,24}$/.test(data.username)) return flashError('registerError', 'Username must be 3-24 chars (letters/numbers/underscore).');
      if (data.password.length < 6) return flashError('registerError', 'Password must be at least 6 characters.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return flashError('registerError', 'Please enter a valid email.');
      const btn = document.getElementById('registerBtn');
      setBtnLoading(btn, true);

      const ipEntry = await checkIpBanAsync();
      if (ipEntry) {
        setBtnLoading(btn, false);
        try { sessionStorage.setItem('sb26_ip_banned_info', JSON.stringify(ipEntry)); } catch (err) {}
        location.replace('banned.html');
        return;
      }

      setTimeout(async () => {
        const res = await createUser(data);
        if (res.error) { setBtnLoading(btn, false); flashError('registerError', res.error); return; }
        const loginRes = await login(data.username, data.password, true);
        if (loginRes.ipBanned) { setBtnLoading(btn, false); location.replace('banned.html'); return; }
        if (loginRes.banned) { setBtnLoading(btn, false); return redirectToBanned(res.user, loginRes.info); }
        if (loginRes.error) { setBtnLoading(btn, false); flashError('registerError', loginRes.error); return; }
        btn.classList.add('success');
        setTimeout(() => location.replace('index.html'), 450);
      }, 500);
    });

    ['loginUser', 'loginPass'].forEach(id => document.getElementById(id)?.addEventListener('input', () => clearError('loginError')));
    ['regUser', 'regEmail', 'regPass'].forEach(id => document.getElementById(id)?.addEventListener('input', () => clearError('registerError')));
    setTimeout(() => document.getElementById('loginUser')?.focus(), 300);
  }

  async function strictBanGate() {
    try {
      const session = sessionStorage.getItem(SESSION_KEY);
      if (session && isUserBanned(session)) {
        const users = getUsers();
        const user = users[session];
        if (user && user.role !== 'owner' && user.role !== 'mod') {
          try {
            sessionStorage.setItem('sb26_banned_preview', session);
            const info = getBanInfo(session);
            if (info) sessionStorage.setItem('sb26_banned_info', JSON.stringify({ username: user.username, display: user.display, avatar: user.avatar, color: user.color, info }));
          } catch (e) {}
          sessionStorage.removeItem(SESSION_KEY);
          sessionStorage.removeItem(SESSION_KEY + '_ts');
          return { banned: true, type: 'account', username: session, info: getBanInfo(session) };
        }
      }
    } catch (e) {}

    if (window.IPBan) {
      try {
        const entry = await window.IPBan.checkSelf();
        if (entry) {
          const session = sessionStorage.getItem(SESSION_KEY);
          const users = getUsers();
          const user = session && users[session];
          if (user && (user.role === 'owner' || user.role === 'mod')) return { banned: false };
          try { sessionStorage.setItem('sb26_ip_banned_info', JSON.stringify(entry)); } catch (e) {}
          return { banned: true, type: 'ip', entry };
        }
      } catch (e) {}
    }
    return { banned: false };
  }

  return {
    initAuthPage, login, forceLogin, logout, current, listOthers, createUser,
    getUsers, saveUsers, rememberedUsername, whoElseHasAccount, initLockChannel,
    startHeartbeat, releaseLock: logout,
    forceReleaseLock: (u) => { clearLock(u); broadcast('takeover', u, getTabId()); },
    getTabId,
    ROLES, isOwner, isMod, isPrivileged, setRole, ensureDefaultOwner,
    getBans, isUserBanned, getBanInfo, banUser, unbanUser, saveBans,
    formatDuration, BAN_DURATIONS,
    getMutes, isUserMuted, getMuteInfo, muteUser, unmuteUser, saveMutes, canSendMessages, MUTE_DURATIONS,
    getWarnings, warnUser, clearWarnings, getWarningInfo, saveWarnings, reportSuspiciousAction, WARN_THRESHOLDS,
    getWhitelist, isWhitelisted, getSlowMode, getSlowModeFor, canSendAtSlowMode, markMessageSent,
    checkIpBanAsync, isSessionInvalidated, strictBanGate,
    syncAllFromServer, syncUsersFromServer, syncBansFromServer, syncMutesFromServer, syncFrozenFromServer, syncSlowModeFromServer, syncWarningsFromServer,
    freezeUser, unfreezeUser, setSlowMode, clearSlowMode,
  };
})();