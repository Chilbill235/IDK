/* SafeBeef v83 — Realtime event bus */
'use strict';
(function () {
  const CHANNEL_NAME = 'sb61_realtime';
  const EVENT_KEY = 'sb61_rt_event';
  const SEEN_LIMIT = 500;
  const SEEN_PRUNE = 250;
  let channel = null;
  try { channel = new BroadcastChannel(CHANNEL_NAME); } catch (e) { channel = null; }
  const handlers = {};
  const seenIds = new Set();
  function on(type, fn) { handlers[type] = handlers[type] || []; if (!handlers[type].includes(fn)) handlers[type].push(fn); }
  function off(type, fn) { if (!handlers[type]) return; handlers[type] = handlers[type].filter(f => f !== fn); }
  function alreadySeen(id) {
    if (!id) return false;
    if (seenIds.has(id)) return true;
    seenIds.add(id);
    if (seenIds.size > SEEN_LIMIT) { const arr = [...seenIds]; seenIds.clear(); arr.slice(-SEEN_PRUNE).forEach(x => seenIds.add(x)); }
    return false;
  }
  function dispatch(evt, skipDedupe) {
    if (!evt || !evt.type) return;
    if (!skipDedupe && alreadySeen(evt.id)) return;
    const list = handlers[evt.type] || [];
    for (const fn of list) { try { fn(evt.payload || {}, evt); } catch (e) { console.warn('[RT]', evt.type, e); } }
    for (const fn of (handlers['*'] || [])) { try { fn(evt); } catch (e) {} }
  }
  function buildEvent(type, payload) { return { type, payload: payload || {}, ts: Date.now(), id: Math.random().toString(36).slice(2, 12) + '-' + Date.now() }; }
  function broadcast(evt) {
    alreadySeen(evt.id);
    try { channel?.postMessage(evt); } catch (e) {}
    try {
      localStorage.setItem(EVENT_KEY, JSON.stringify(evt));
      setTimeout(() => { try { const cur = JSON.parse(localStorage.getItem(EVENT_KEY) || '{}'); if (cur.id === evt.id) localStorage.removeItem(EVENT_KEY); } catch (e) {} }, 300);
    } catch (e) {}
  }
  function emit(type, payload) { broadcast(buildEvent(type, payload)); }
  function emitLocal(type, payload) { const evt = buildEvent(type, payload); broadcast(evt); dispatch(evt, true); }
  if (channel) channel.onmessage = (e) => { const evt = e.data; if (evt && evt.type) dispatch(evt); };
  window.addEventListener('storage', (e) => {
    if (e.key !== EVENT_KEY || !e.newValue) return;
    try { const evt = JSON.parse(e.newValue); if (evt && evt.type) dispatch(evt); } catch (err) {}
  });
  window.RT = {
    emit, emitLocal, on, off,
    banChanged: (u, i) => emit('ban-changed', { username: u, info: i }),
    banCleared: (u) => emit('ban-cleared', { username: u }),
    roleChanged: (u, r) => emit('role-changed', { username: u, role: r }),
    kick: (u, r) => emit('kick', { username: u, reason: r }),
    mute: (u, until, r) => emit('mute', { username: u, until, reason: r }),
    unmute: (u) => emit('unmute', { username: u }),
    freeze: (u, r) => emit('freeze', { username: u, reason: r }),
    unfreeze: (u) => emit('unfreeze', { username: u }),
    warn: (u, i) => emit('warn-changed', { username: u, info: i }),
    forceSignout: (u, r) => emit('force-signout', { username: u, reason: r }),
    messageBlocked: (u, r, until) => emit('message-blocked', { username: u, reason: r, until }),
    maintenanceChanged: (m) => emit('maintenance-changed', { m }),
    blocksChanged: () => emit('blocks-changed', {}),
    settingsChanged: (s) => emit('settings-changed', { settings: s }),
    broadcast: (payload) => emit('broadcast', payload),
    directNotify: (payload) => emit('direct-notify', payload),
    forceReload: (username) => emit('force-reload', { username }),
    forceSignoutAll: () => emit('force-signout', { username: '__ALL__' }),
    pinUpdated: (key) => emit('pin-updated', { key }),
  };
})();