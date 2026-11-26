/* ==========================================================================
   SafeBeef v84 — Database Service Layer
   All persistent data operations
   ========================================================================== */
'use strict';

const { getSql, isDbAvailable } = require('./client.js');
const crypto = require('crypto');

// In-memory fallbacks for when DB is not available
const memoryStore = {
  users: new Map(),
  bans: new Map(),
  ipBans: new Map(),
  pushSubs: new Map(),
  warnings: new Map(),
  frozenUsers: new Map(),
  maintenance: { enabled: false, message: '', enabledBy: '', enabledAt: 0, until: 0 },
  slowMode: new Map(),
  chatMessages: [],
  blocks: new Map(),
  pinnedMessages: [],
  userSettings: new Map(),
  reports: []
};

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'safebeef-salt').digest('hex');
}

function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

function now() {
  return Date.now();
}

async function query(sql, params) {
  const db = getSql();
  if (!db) return null;
  try {
    return await db(sql, params);
  } catch (e) {
    console.error('[db] Query failed:', e.message);
    return null;
  }
}

// ==================== USERS ====================
async function createUser({ username, displayName, email, password, avatar, color }) {
  const passwordHash = hashPassword(password);
  const user = {
    username: username.toLowerCase(),
    display_name: displayName || username,
    email: email?.toLowerCase(),
    password_hash: passwordHash,
    avatar: avatar || username.slice(0, 2).toUpperCase(),
    color: color || '#4d9dff',
    created_at: now(),
    updated_at: now()
  };

  if (isDbAvailable()) {
    try {
      await getSql()`
        INSERT INTO users (username, display_name, email, password_hash, avatar, color, created_at, updated_at)
        VALUES (${user.username}, ${user.display_name}, ${user.email}, ${user.password_hash}, ${user.avatar}, ${user.color}, ${user.created_at}, ${user.updated_at})
        ON CONFLICT (username) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          avatar = EXCLUDED.avatar,
          color = EXCLUDED.color,
          updated_at = EXCLUDED.updated_at
      `;
    } catch (e) {
      console.error('[db] createUser failed:', e.message);
    }
  } else {
    memoryStore.users.set(user.username, user);
  }
  return user;
}

async function getUser(username) {
  const key = username.toLowerCase();
  if (isDbAvailable()) {
    try {
      const rows = await getSql()`SELECT * FROM users WHERE username = ${key}`;
      return rows[0] || null;
    } catch (e) {
      console.error('[db] getUser failed:', e.message);
    }
  }
  return memoryStore.users.get(key) || null;
}

async function getUserByEmail(email) {
  const key = email.toLowerCase();
  if (isDbAvailable()) {
    try {
      const rows = await getSql()`SELECT * FROM users WHERE email = ${key}`;
      return rows[0] || null;
    } catch (e) {
      console.error('[db] getUserByEmail failed:', e.message);
    }
  }
  for (const user of memoryStore.users.values()) {
    if (user.email === key) return user;
  }
  return null;
}

async function verifyUser(username, password) {
  const user = await getUser(username);
  if (!user) return null;
  return verifyPassword(password, user.password_hash) ? user : null;
}

async function updateUser(username, updates) {
  const key = username.toLowerCase();
  const allowed = ['display_name', 'email', 'avatar', 'color', 'name_color', 'avatar_shape', 'font_style', 'banner_pattern', 'profile_effect', 'presence', 'status_text', 'status_expires', 'status_expires_at', 'bio', 'pronouns', 'bio_visibility', 'show_online', 'show_last_seen', 'allow_mod_dms'];
  const setClause = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowed.includes(key)) {
      setClause.push(`${key} = $${values.length + 1}`);
      values.push(value);
    }
  }
  if (!setClause.length) return await getUser(key);

  values.push(key);
  values.push(now());

  if (isDbAvailable()) {
    try {
      await getSql()`UPDATE users SET ${getSql(setClause.join(', '))}, updated_at = ${now()} WHERE username = ${key}`;
    } catch (e) {
      console.error('[db] updateUser failed:', e.message);
    }
  } else {
    const user = memoryStore.users.get(key);
    if (user) {
      Object.assign(user, updates, { updated_at: now() });
    }
  }
  return await getUser(key);
}

async function getAllUsers() {
  if (isDbAvailable()) {
    try {
      return await getSql()`SELECT * FROM users`;
    } catch (e) {
      console.error('[db] getAllUsers failed:', e.message);
    }
  }
  return Array.from(memoryStore.users.values());
}

// ==================== BANS ====================
async function banUser({ username, reason, bannedBy, durationMs, isPermanent }) {
  const expiresAt = isPermanent ? null : (now() + (durationMs || 0));
  const ban = {
    username: username.toLowerCase(),
    reason,
    banned_by: bannedBy,
    duration_ms: durationMs,
    expires_at: expiresAt,
    created_at: now(),
    is_permanent: isPermanent || false,
    is_active: true
  };

  if (isDbAvailable()) {
    try {
      await getSql()`
        INSERT INTO bans (username, reason, banned_by, duration_ms, expires_at, created_at, is_permanent, is_active)
        VALUES (${ban.username}, ${ban.reason}, ${ban.banned_by}, ${ban.duration_ms}, ${ban.expires_at}, ${ban.created_at}, ${ban.is_permanent}, ${ban.is_active})
      `;
    } catch (e) {
      console.error('[db] banUser failed:', e.message);
    }
  } else {
    memoryStore.bans.set(ban.username, ban);
  }
  return ban;
}

async function unbanUser(username) {
  const key = username.toLowerCase();
  if (isDbAvailable()) {
    try {
      await getSql()`UPDATE bans SET is_active = false WHERE username = ${key} AND is_active = true`;
    } catch (e) {
      console.error('[db] unbanUser failed:', e.message);
    }
  } else {
    const ban = memoryStore.bans.get(key);
    if (ban) ban.is_active = false;
  }
}

async function getActiveBan(username) {
  const key = username.toLowerCase();
  if (isDbAvailable()) {
    try {
      const rows = await getSql`SELECT * FROM bans WHERE username = ${key} AND is_active = true AND (is_permanent = true OR expires_at > ${now()}) ORDER BY created_at DESC LIMIT 1`;
      return rows[0] || null;
    } catch (e) {
      console.error('[db] getActiveBan failed:', e.message);
    }
  }
  const ban = memoryStore.bans.get(key);
  if (ban && ban.is_active && (ban.is_permanent || (ban.expires_at && ban.expires_at > now()))) return ban;
  return null;
}

async function getAllBans() {
  if (isDbAvailable()) {
    try {
      return await getSql`SELECT * FROM bans WHERE is_active = true ORDER BY created_at DESC`;
    } catch (e) {
      console.error('[db] getAllBans failed:', e.message);
    }
  }
  return Array.from(memoryStore.bans.values()).filter(b => b.is_active);
}

// ==================== IP BANS ====================
async function banIP({ ip, fingerprint, reason, bannedBy, durationMs, isPermanent }) {
  const expiresAt = isPermanent ? null : (now() + (durationMs || 0));
  const ban = {
    ip,
    fingerprint,
    reason,
    banned_by: bannedBy,
    duration_ms: durationMs,
    expires_at: expiresAt,
    created_at: now(),
    is_permanent: isPermanent || false,
    is_active: true
  };

  if (isDbAvailable()) {
    try {
      await getSql()`
        INSERT INTO ip_bans (ip, fingerprint, reason, banned_by, duration_ms, expires_at, created_at, is_permanent, is_active)
        VALUES (${ban.ip}, ${ban.fingerprint}, ${ban.reason}, ${ban.banned_by}, ${ban.duration_ms}, ${ban.expires_at}, ${ban.created_at}, ${ban.is_permanent}, ${ban.is_active})
      `;
    } catch (e) {
      console.error('[db] banIP failed:', e.message);
    }
  } else {
    memoryStore.ipBans.set(ip, ban);
    if (fingerprint) memoryStore.ipBans.set(`fp:${fingerprint}`, ban);
  }
  return ban;
}

async function unbanIP(ip) {
  if (isDbAvailable()) {
    try {
      await getSql()`UPDATE ip_bans SET is_active = false WHERE ip = ${ip} AND is_active = true`;
    } catch (e) {
      console.error('[db] unbanIP failed:', e.message);
    }
  } else {
    const ban = memoryStore.ipBans.get(ip);
    if (ban) ban.is_active = false;
  }
}

async function checkIPBan(ip, fingerprint) {
  if (isDbAvailable()) {
    try {
      const rows = await getSql`SELECT * FROM ip_bans WHERE (ip = ${ip} OR fingerprint = ${fingerprint}) AND is_active = true AND (is_permanent = true OR expires_at > ${now()}) ORDER BY created_at DESC LIMIT 1`;
      return rows[0] || null;
    } catch (e) {
      console.error('[db] checkIPBan failed:', e.message);
    }
  }
  const ban = memoryStore.ipBans.get(ip) || memoryStore.ipBans.get(`fp:${fingerprint}`);
  if (ban && ban.is_active && (ban.is_permanent || (ban.expires_at && ban.expires_at > now()))) return ban;
  return null;
}

async function getAllIPBans() {
  if (isDbAvailable()) {
    try {
      return await getSql`SELECT * FROM ip_bans WHERE is_active = true ORDER BY created_at DESC`;
    } catch (e) {
      console.error('[db] getAllIPBans failed:', e.message);
    }
  }
  return Array.from(memoryStore.ipBans.values()).filter(b => b.is_active && !b.ip?.startsWith('fp:'));
}

// ==================== PUSH SUBSCRIPTIONS ====================
async function savePushSubscription({ endpoint, keys, username }) {
  const sub = {
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    username: username.toLowerCase(),
    created_at: now(),
    last_used_at: now()
  };

  if (isDbAvailable()) {
    try {
      await getSql()`
        INSERT INTO push_subscriptions (endpoint, p256dh, auth, username, created_at, last_used_at)
        VALUES (${sub.endpoint}, ${sub.p256dh}, ${sub.auth}, ${sub.username}, ${sub.created_at}, ${sub.last_used_at})
        ON CONFLICT (endpoint) DO UPDATE SET
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          username = EXCLUDED.username,
          last_used_at = EXCLUDED.last_used_at
      `;
    } catch (e) {
      console.error('[db] savePushSubscription failed:', e.message);
    }
  } else {
    memoryStore.pushSubs.set(endpoint, sub);
  }
  return sub;
}

async function removePushSubscription(endpoint) {
  if (isDbAvailable()) {
    try {
      await getSql()`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
    } catch (e) {
      console.error('[db] removePushSubscription failed:', e.message);
    }
  } else {
    memoryStore.pushSubs.delete(endpoint);
  }
}

async function getPushSubscriptions(username = null) {
  if (isDbAvailable()) {
    try {
      if (username) {
        return await getSql`SELECT * FROM push_subscriptions WHERE username = ${username.toLowerCase()}`;
      }
      return await getSql`SELECT * FROM push_subscriptions`;
    } catch (e) {
      console.error('[db] getPushSubscriptions failed:', e.message);
    }
  }
  const subs = Array.from(memoryStore.pushSubs.values());
  return username ? subs.filter(s => s.username === username.toLowerCase()) : subs;
}

async function updatePushSubscriptionLastUsed(endpoint) {
  if (isDbAvailable()) {
    try {
      await getSql()`UPDATE push_subscriptions SET last_used_at = ${now()} WHERE endpoint = ${endpoint}`;
    } catch (e) {
      console.error('[db] updatePushSubscriptionLastUsed failed:', e.message);
    }
  } else {
    const sub = memoryStore.pushSubs.get(endpoint);
    if (sub) sub.last_used_at = now();
  }
}

// ==================== WARNINGS ====================
async function addWarning({ username, reason, warnedBy, expiresAt }) {
  const warning = {
    username: username.toLowerCase(),
    reason,
    warned_by: warnedBy,
    created_at: now(),
    expires_at: expiresAt
  };

  if (isDbAvailable()) {
    try {
      await getSql()`
        INSERT INTO warnings (username, reason, warned_by, created_at, expires_at)
        VALUES (${warning.username}, ${warning.reason}, ${warning.warned_by}, ${warning.created_at}, ${warning.expires_at})
      `;
    } catch (e) {
      console.error('[db] addWarning failed:', e.message);
    }
  } else {
    if (!memoryStore.warnings.has(warning.username)) memoryStore.warnings.set(warning.username, []);
    memoryStore.warnings.get(warning.username).push(warning);
  }
  return warning;
}

async function getWarnings(username) {
  const key = username.toLowerCase();
  if (isDbAvailable()) {
    try {
      return await getSql`SELECT * FROM warnings WHERE username = ${key} AND (expires_at IS NULL OR expires_at > ${now()}) ORDER BY created_at DESC`;
    } catch (e) {
      console.error('[db] getWarnings failed:', e.message);
    }
  }
  const warnings = memoryStore.warnings.get(key) || [];
  return warnings.filter(w => !w.expires_at || w.expires_at > now());
}

async function clearWarnings(username) {
  const key = username.toLowerCase();
  if (isDbAvailable()) {
    try {
      await getSql()`DELETE FROM warnings WHERE username = ${key}`;
    } catch (e) {
      console.error('[db] clearWarnings failed:', e.message);
    }
  } else {
    memoryStore.warnings.delete(key);
  }
}

// ==================== FROZEN USERS ====================
async function freezeUser({ username, frozenBy, reason }) {
  const frozen = {
    username: username.toLowerCase(),
    frozen_by: frozenBy,
    reason,
    created_at: now()
  };

  if (isDbAvailable()) {
    try {
      await getSql()`
        INSERT INTO frozen_users (username, frozen_by, reason, created_at)
        VALUES (${frozen.username}, ${frozen.frozen_by}, ${frozen.reason}, ${frozen.created_at})
        ON CONFLICT (username) DO UPDATE SET frozen_by = EXCLUDED.frozen_by, reason = EXCLUDED.reason, created_at = EXCLUDED.created_at
      `;
    } catch (e) {
      console.error('[db] freezeUser failed:', e.message);
    }
  } else {
    memoryStore.frozenUsers.set(frozen.username, frozen);
  }
  return frozen;
}

async function unfreezeUser(username) {
  const key = username.toLowerCase();
  if (isDbAvailable()) {
    try {
      await getSql()`DELETE FROM frozen_users WHERE username = ${key}`;
    } catch (e) {
      console.error('[db] unfreezeUser failed:', e.message);
    }
  } else {
    memoryStore.frozenUsers.delete(key);
  }
}

async function isFrozen(username) {
  const key = username.toLowerCase();
  if (isDbAvailable()) {
    try {
      const rows = await getSql`SELECT * FROM frozen_users WHERE username = ${key}`;
      return !!rows[0];
    } catch (e) {
      console.error('[db] isFrozen failed:', e.message);
    }
  }
  return !!memoryStore.frozenUsers.get(key);
}

async function getFrozenUser(username) {
  const key = username.toLowerCase();
  if (isDbAvailable()) {
    try {
      const rows = await getSql`SELECT * FROM frozen_users WHERE username = ${key}`;
      return rows[0] || null;
    } catch (e) {
      console.error('[db] getFrozenUser failed:', e.message);
    }
  }
  return memoryStore.frozenUsers.get(key) || null;
}

// ==================== MAINTENANCE ====================
async function getMaintenanceState() {
  if (isDbAvailable()) {
    try {
      const rows = await getSql`SELECT * FROM maintenance_state WHERE id = 1`;
      if (rows[0]) {
        return {
          enabled: rows[0].enabled,
          message: rows[0].message || '',
          enabled_by: rows[0].enabled_by || '',
          enabled_at: rows[0].enabled_at || 0,
          until: rows[0].until || 0
        };
      }
    } catch (e) {
      console.error('[db] getMaintenanceState failed:', e.message);
    }
  }
  return memoryStore.maintenance;
}

async function setMaintenanceState({ enabled, message, enabledBy, until }) {
  const state = {
    enabled,
    message: message || '',
    enabled_by: enabledBy || '',
    enabled_at: enabled ? now() : 0,
    until: until || 0
  };

  if (isDbAvailable()) {
    try {
      await getSql()`
        UPDATE maintenance_state SET
          enabled = ${state.enabled},
          message = ${state.message},
          enabled_by = ${state.enabled_by},
          enabled_at = ${state.enabled_at},
          until = ${state.until},
          updated_at = ${now()}
        WHERE id = 1
      `;
    } catch (e) {
      console.error('[db] setMaintenanceState failed:', e.message);
    }
  } else {
    memoryStore.maintenance = state;
  }
  return state;
}

// ==================== SLOW MODE ====================
async function setSlowMode({ username, seconds, setBy }) {
  const key = username.toLowerCase();
  const slow = {
    username: key,
    seconds,
    since: now(),
    set_by: setBy,
    created_at: now()
  };

  if (isDbAvailable()) {
    try {
      await getSql()`
        INSERT INTO slow_mode (username, seconds, since, set_by, created_at)
        VALUES (${slow.username}, ${slow.seconds}, ${slow.since}, ${slow.set_by}, ${slow.created_at})
        ON CONFLICT (username) DO UPDATE SET seconds = EXCLUDED.seconds, since = EXCLUDED.since, set_by = EXCLUDED.set_by, created_at = EXCLUDED.created_at
      `;
    } catch (e) {
      console.error('[db] setSlowMode failed:', e.message);
    }
  } else {
    memoryStore.slowMode.set(key, slow);
  }
  return slow;
}

async function getSlowMode(username) {
  const key = username.toLowerCase();
  if (isDbAvailable()) {
    try {
      const rows = await getSql`SELECT * FROM slow_mode WHERE username = ${key}`;
      return rows[0] || null;
    } catch (e) {
      console.error('[db] getSlowMode failed:', e.message);
    }
  }
  return memoryStore.slowMode.get(key) || null;
}

async function clearSlowMode(username) {
  const key = username.toLowerCase();
  if (isDbAvailable()) {
    try {
      await getSql()`DELETE FROM slow_mode WHERE username = ${key}`;
    } catch (e) {
      console.error('[db] clearSlowMode failed:', e.message);
    }
  } else {
    memoryStore.slowMode.delete(key);
  }
}

// ==================== CHAT MESSAGES ====================
async function saveChatMessage({ messageId, fromUsername, toUsername, messageType, text, data, sentAt }) {
  const msg = {
    message_id: messageId,
    from_username: fromUsername.toLowerCase(),
    to_username: toUsername.toLowerCase(),
    message_type: messageType || 'text',
    text,
    data: data ? JSON.stringify(data) : null,
    sent_at: sentAt || now(),
    delivered_at: null,
    read_at: null,
    edited_at: null,
    deleted: false
  };

  if (isDbAvailable()) {
    try {
      await getSql()`
        INSERT INTO chat_messages (message_id, from_username, to_username, message_type, text, data, sent_at, delivered_at, read_at, edited_at, deleted)
        VALUES (${msg.message_id}, ${msg.from_username}, ${msg.to_username}, ${msg.message_type}, ${msg.text}, ${msg.data}, ${msg.sent_at}, ${msg.delivered_at}, ${msg.read_at}, ${msg.edited_at}, ${msg.deleted})
        ON CONFLICT (message_id) DO UPDATE SET
          text = EXCLUDED.text,
          data = EXCLUDED.data,
          delivered_at = EXCLUDED.delivered_at,
          read_at = EXCLUDED.read_at,
          edited_at = EXCLUDED.edited_at,
          deleted = EXCLUDED.deleted
      `;
    } catch (e) {
      console.error('[db] saveChatMessage failed:', e.message);
    }
  } else {
    memoryStore.chatMessages.push(msg);
  }
  return msg;
}

async function getChatMessages(user1, user2, limit = 100) {
  const u1 = user1.toLowerCase();
  const u2 = user2.toLowerCase();
  if (isDbAvailable()) {
    try {
      return await getSql`
        SELECT * FROM chat_messages
        WHERE (from_username = ${u1} AND to_username = ${u2})
           OR (from_username = ${u2} AND to_username = ${u1})
        ORDER BY sent_at DESC
        LIMIT ${limit}
      `;
    } catch (e) {
      console.error('[db] getChatMessages failed:', e.message);
    }
  }
  return memoryStore.chatMessages
    .filter(m => (m.from_username === u1 && m.to_username === u2) || (m.from_username === u2 && m.to_username === u1))
    .sort((a, b) => b.sent_at - a.sent_at)
    .slice(0, limit);
}

async function updateChatMessage(messageId, updates) {
  if (isDbAvailable()) {
    try {
      const setClause = [];
      const values = [];
      for (const [key, value] of Object.entries(updates)) {
        if (['text', 'data', 'delivered_at', 'read_at', 'edited_at', 'deleted'].includes(key)) {
          setClause.push(`${key} = $${values.length + 1}`);
          values.push(key === 'data' ? JSON.stringify(value) : value);
        }
      }
      if (!setClause.length) return;
      values.push(messageId);
      await getSql()`UPDATE chat_messages SET ${getSql(setClause.join(', '))} WHERE message_id = ${messageId}`;
    } catch (e) {
      console.error('[db] updateChatMessage failed:', e.message);
    }
  } else {
    const idx = memoryStore.chatMessages.findIndex(m => m.message_id === messageId);
    if (idx !== -1) {
      Object.assign(memoryStore.chatMessages[idx], updates);
    }
  }
}

// ==================== BLOCKS ====================
async function blockUser({ blocker, blocked }) {
  const b1 = blocker.toLowerCase();
  const b2 = blocked.toLowerCase();

  if (isDbAvailable()) {
    try {
      await getSql()`
        INSERT INTO blocks (blocker, blocked, created_at)
        VALUES (${b1}, ${b2}, ${now()})
        ON CONFLICT (blocker, blocked) DO NOTHING
      `;
    } catch (e) {
      console.error('[db] blockUser failed:', e.message);
    }
  } else {
    if (!memoryStore.blocks.has(b1)) memoryStore.blocks.set(b1, new Set());
    memoryStore.blocks.get(b1).add(b2);
  }
}

async function unblockUser({ blocker, blocked }) {
  const b1 = blocker.toLowerCase();
  const b2 = blocked.toLowerCase();

  if (isDbAvailable()) {
    try {
      await getSql()`DELETE FROM blocks WHERE blocker = ${b1} AND blocked = ${b2}`;
    } catch (e) {
      console.error('[db] unblockUser failed:', e.message);
    }
  } else {
    const set = memoryStore.blocks.get(b1);
    if (set) set.delete(b2);
  }
}

async function isBlocked(blocker, blocked) {
  const b1 = blocker.toLowerCase();
  const b2 = blocked.toLowerCase();

  if (isDbAvailable()) {
    try {
      const rows = await getSql`SELECT 1 FROM blocks WHERE blocker = ${b1} AND blocked = ${b2}`;
      return rows.length > 0;
    } catch (e) {
      console.error('[db] isBlocked failed:', e.message);
    }
  }
  return memoryStore.blocks.get(b1)?.has(b2) || false;
}

async function isBlockedEither(user1, user2) {
  return await isBlocked(user1, user2) || await isBlocked(user2, user1);
}

// ==================== PINNED MESSAGES ====================
async function pinMessage({ user1, user2, messageId, text, fromUsername, pinnedBy }) {
  const u1 = user1.toLowerCase();
  const u2 = user2.toLowerCase();
  const key = [u1, u2].sort().join('|');

  const pin = {
    user1: u1,
    user2: u2,
    message_id: messageId,
    text,
    from_username: fromUsername.toLowerCase(),
    pinned_by: pinnedBy.toLowerCase(),
    pinned_at: now()
  };

  if (isDbAvailable()) {
    try {
      await getSql()`
        INSERT INTO pinned_messages (user1, user2, message_id, text, from_username, pinned_by, pinned_at)
        VALUES (${pin.user1}, ${pin.user2}, ${pin.message_id}, ${pin.text}, ${pin.from_username}, ${pin.pinned_by}, ${pin.pinned_at})
      `;
    } catch (e) {
      console.error('[db] pinMessage failed:', e.message);
    }
  } else {
    memoryStore.pinnedMessages.push(pin);
  }
  return pin;
}

async function getPinnedMessages(user1, user2) {
  const u1 = user1.toLowerCase();
  const u2 = user2.toLowerCase();

  if (isDbAvailable()) {
    try {
      return await getSql`SELECT * FROM pinned_messages WHERE (user1 = ${u1} AND user2 = ${u2}) OR (user1 = ${u2} AND user2 = ${u1}) ORDER BY pinned_at DESC`;
    } catch (e) {
      console.error('[db] getPinnedMessages failed:', e.message);
    }
  }
  return memoryStore.pinnedMessages.filter(p => (p.user1 === u1 && p.user2 === u2) || (p.user1 === u2 && p.user2 === u1));
}

async function unpinMessage(user1, user2, messageId) {
  const u1 = user1.toLowerCase();
  const u2 = user2.toLowerCase();

  if (isDbAvailable()) {
    try {
      await getSql`DELETE FROM pinned_messages WHERE ((user1 = ${u1} AND user2 = ${u2}) OR (user1 = ${u2} AND user2 = ${u1})) AND message_id = ${messageId}`;
    } catch (e) {
      console.error('[db] unpinMessage failed:', e.message);
    }
  } else {
    const idx = memoryStore.pinnedMessages.findIndex(p => ((p.user1 === u1 && p.user2 === u2) || (p.user1 === u2 && p.user2 === u1)) && p.message_id === messageId);
    if (idx !== -1) memoryStore.pinnedMessages.splice(idx, 1);
  }
}

// ==================== USER SETTINGS ====================
async function getUserSettings(username) {
  const key = username.toLowerCase();
  if (isDbAvailable()) {
    try {
      const rows = await getSql`SELECT settings FROM user_settings WHERE username = ${key}`;
      return rows[0]?.settings || {};
    } catch (e) {
      console.error('[db] getUserSettings failed:', e.message);
    }
  }
  return memoryStore.userSettings.get(key) || {};
}

async function saveUserSettings(username, settings) {
  const key = username.toLowerCase();

  if (isDbAvailable()) {
    try {
      await getSql()`
        INSERT INTO user_settings (username, settings, updated_at)
        VALUES (${key}, ${JSON.stringify(settings)}, ${now()})
        ON CONFLICT (username) DO UPDATE SET settings = EXCLUDED.settings, updated_at = EXCLUDED.updated_at
      `;
    } catch (e) {
      console.error('[db] saveUserSettings failed:', e.message);
    }
  } else {
    memoryStore.userSettings.set(key, settings);
  }
}

// ==================== REPORTS ====================
async function createReport({ reporter, reported, reason, messageId }) {
  const report = {
    reporter: reporter.toLowerCase(),
    reported: reported.toLowerCase(),
    reason,
    message_id: messageId,
    status: 'pending',
    handled_by: null,
    handled_at: null,
    created_at: now()
  };

  if (isDbAvailable()) {
    try {
      await getSql()`
        INSERT INTO reports (reporter, reported, reason, message_id, status, created_at)
        VALUES (${report.reporter}, ${report.reported}, ${report.reason}, ${report.message_id}, ${report.status}, ${report.created_at})
      `;
    } catch (e) {
      console.error('[db] createReport failed:', e.message);
    }
  } else {
    memoryStore.reports.push(report);
  }
  return report;
}

async function getReports(status = null) {
  if (isDbAvailable()) {
    try {
      if (status) {
        return await getSql`SELECT * FROM reports WHERE status = ${status} ORDER BY created_at DESC`;
      }
      return await getSql`SELECT * FROM reports ORDER BY created_at DESC`;
    } catch (e) {
      console.error('[db] getReports failed:', e.message);
    }
  }
  return status
    ? memoryStore.reports.filter(r => r.status === status)
    : [...memoryStore.reports].sort((a, b) => b.created_at - a.created_at);
}

async function updateReport(reportId, updates) {
  if (isDbAvailable()) {
    try {
      const setClause = [];
      const values = [];
      for (const [key, value] of Object.entries(updates)) {
        if (['status', 'handled_by', 'handled_at'].includes(key)) {
          setClause.push(`${key} = $${values.length + 1}`);
          values.push(value);
        }
      }
      if (!setClause.length) return;
      values.push(reportId);
      await getSql()`UPDATE reports SET ${getSql(setClause.join(', '))} WHERE id = ${reportId}`;
    } catch (e) {
      console.error('[db] updateReport failed:', e.message);
    }
  } else {
    const report = memoryStore.reports.find(r => r.id === reportId);
    if (report) Object.assign(report, updates);
  }
}

// ==================== HELPERS ====================
async function isOwner(username) {
  const user = await getUser(username);
  return user && user.username === 'owner'; // First user or specific logic
}

async function isMod(username) {
  const user = await getUser(username);
  // Could add mod flag to users table
  return user && (user.username === 'owner' || user.username === 'mod');
}

module.exports = {
  // Users
  createUser,
  getUser,
  getUserByEmail,
  verifyUser,
  updateUser,
  getAllUsers,
  // Bans
  banUser,
  unbanUser,
  getActiveBan,
  getAllBans,
  // IP Bans
  banIP,
  unbanIP,
  checkIPBan,
  getAllIPBans,
  // Push
  savePushSubscription,
  removePushSubscription,
  getPushSubscriptions,
  updatePushSubscriptionLastUsed,
  // Warnings
  addWarning,
  getWarnings,
  clearWarnings,
  // Frozen
  freezeUser,
  unfreezeUser,
  isFrozen,
  getFrozenUser,
  // Maintenance
  getMaintenanceState,
  setMaintenanceState,
  // Slow mode
  setSlowMode,
  getSlowMode,
  clearSlowMode,
  // Chat
  saveChatMessage,
  getChatMessages,
  updateChatMessage,
  // Blocks
  blockUser,
  unblockUser,
  isBlocked,
  isBlockedEither,
  // Pinned
  pinMessage,
  getPinnedMessages,
  unpinMessage,
  // Settings
  getUserSettings,
  saveUserSettings,
  // Reports
  createReport,
  getReports,
  updateReport,
  // Auth helpers
  isOwner,
  isMod,
  hashPassword,
  verifyPassword,
  isDbAvailable,
  now
};