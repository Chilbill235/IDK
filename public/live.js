/* SafeBeef v83 — Live reactive hub */
'use strict';
(function () {
  const subscribers = {};
  function on(topic, fn) { subscribers[topic] = subscribers[topic] || new Set(); subscribers[topic].add(fn); return () => subscribers[topic]?.delete(fn); }
  function off(topic, fn) { subscribers[topic]?.delete(fn); }
  function emit(topic, payload) {
    const set = subscribers[topic];
    if (!set) return;
    for (const fn of set) { try { fn(payload); } catch (e) { console.warn('[live]', topic, e); } }
  }
  const pending = {};
  function emitDebounced(topic, payload, delayMs = 60) {
    if (pending[topic]) clearTimeout(pending[topic].timer);
    pending[topic] = pending[topic] || {};
    pending[topic].payload = payload;
    pending[topic].timer = setTimeout(() => { const p = pending[topic].payload; delete pending[topic]; emit(topic, p); }, delayMs);
  }
  function notifyModFull() {
    emit('userList'); emit('bans'); emit('mutes'); emit('warnings'); emit('appeals'); emit('auditLog'); emit('modPanel');
    emitDebounced('stats', null, 120);
  }
  function wireStorageHook() {
    if (window.__sb_storage_hooked) return;
    window.__sb_storage_hooked = true;
    const origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (key, value) {
      let prev = null;
      try { prev = localStorage.getItem(key); } catch (_) {}
      origSetItem(key, value);
      if (prev === value) return;
      try {
        if (key === 'sb26_bans' || key.startsWith('sb26_bans')) { emit('bans'); emit('userList'); emit('modPanel'); emit('auditLog'); emitDebounced('stats', null, 100); }
        if (key === 'sb44_mutes' || key.startsWith('sb44_mutes')) { emit('mutes'); emit('userList'); emit('modPanel'); }
        if (key === 'sb26_warnings' || key.startsWith('sb26_warnings')) { emit('warnings'); emit('userList'); emit('modPanel'); emitDebounced('stats', null, 100); }
        if (key === 'sb26_appeals' || key.startsWith('sb26_appeals')) { emit('appeals'); emit('modPanel'); }
        if (key === 'sb26_users' || key.startsWith('sb26_users')) { emit('userList'); emit('modPanel'); emit('profile'); }
        if (key === 'sb26_shadowbans' || key.startsWith('sb26_shadowbans')) { emit('userList'); emit('modPanel'); }
        if (key === 'sb26_whitelist' || key.startsWith('sb26_whitelist')) { emit('userList'); emit('modPanel'); }
        if (key === 'sb26_slowmode' || key.startsWith('sb26_slowmode')) { emit('userList'); emit('modPanel'); }
        if (key === 'sb26_reports' || key.startsWith('sb26_reports')) { emit('modPanel'); emitDebounced('stats', null, 100); }
        if (key === 'sb26_frozen_users' || key.startsWith('sb26_frozen_users')) { emit('userList'); emit('modPanel'); emit('frozen'); }
        if (key === 'sb26_blocks' || key.startsWith('sb26_blocks')) { emit('blocks'); emit('chat'); emit('userList'); }
        if (key === 'sb26_maintenance' || key.startsWith('sb26_maintenance')) { emit('maintenance'); }
        if (key === 'sb26_settings' || key.startsWith('sb26_settings')) { emit('settings'); }
        if (key === 'sb26_watched' || key.startsWith('sb26_watched')) { emit('userList'); emit('modPanel'); }
        if (key === 'sb26_ghost_mode' || key.startsWith('sb26_ghost_mode')) { emit('userList'); emit('modPanel'); emit('onlineUsers'); }
        if (key.startsWith('sb26_chat_')) { emitDebounced('chat', null, 80); emitDebounced('stats', null, 150); }
        if (key.startsWith('sb_hook_log_')) { emit('hookPanel'); emitDebounced('stats', null, 150); }
      } catch (e) {}
    };
    window.addEventListener('storage', (e) => {
      if (!e.key) return;
      if (e.key.startsWith('sb26_bans')) { emit('bans'); emit('userList'); emit('modPanel'); emitDebounced('stats', null, 120); }
      if (e.key.startsWith('sb44_mutes')) { emit('mutes'); emit('userList'); emit('modPanel'); }
      if (e.key.startsWith('sb26_warnings')) { emit('warnings'); emit('userList'); emit('modPanel'); }
      if (e.key.startsWith('sb26_appeals')) { emit('appeals'); emit('modPanel'); }
      if (e.key.startsWith('sb26_users')) { emit('userList'); emit('modPanel'); }
      if (e.key.startsWith('sb26_reports')) { emit('modPanel'); }
      if (e.key.startsWith('sb26_blocks')) { emit('blocks'); emit('chat'); }
      if (e.key.startsWith('sb26_maintenance')) { emit('maintenance'); }
      if (e.key.startsWith('sb26_frozen_users')) { emit('frozen'); emit('userList'); }
    });
  }
  function wireRealtime() {
    if (!window.RT || typeof RT.on !== 'function') { setTimeout(wireRealtime, 200); return; }
    if (window.__sb_rt_hooked) return;
    window.__sb_rt_hooked = true;
    RT.on('ban-changed', () => { emit('bans'); emit('userList'); emit('modPanel'); emit('stats'); emit('auditLog'); });
    RT.on('ban-cleared', () => { emit('bans'); emit('userList'); emit('modPanel'); emit('stats'); emit('auditLog'); });
    RT.on('mute', () => { emit('mutes'); emit('userList'); emit('modPanel'); emit('stats'); });
    RT.on('unmute', () => { emit('mutes'); emit('userList'); emit('modPanel'); emit('stats'); });
    RT.on('freeze', () => { emit('userList'); emit('modPanel'); emit('frozen'); });
    RT.on('unfreeze', () => { emit('userList'); emit('modPanel'); emit('frozen'); });
    RT.on('warn-changed', () => { emit('warnings'); emit('userList'); emit('modPanel'); emit('stats'); });
    RT.on('role-changed', () => { emit('userList'); emit('modPanel'); emit('profile'); emit('stats'); });
    RT.on('kick', () => { emit('userList'); emit('modPanel'); });
    RT.on('broadcast', () => { emit('broadcast'); });
    RT.on('direct-notify', () => { emit('notifications'); });
  }
  function wireChannel(channel) {
    if (!channel || window.__sb_channel_wired === channel) return;
    window.__sb_channel_wired = channel;
    const prev = channel.onmessage;
    channel.onmessage = (e) => {
      const m = e.data || {};
      try { if (typeof prev === 'function') prev.call(channel, e); } catch (err) {}
      if (m.type === 'chat' || m.type === 'chat-seen' || m.type === 'chat-delivered' || m.type === 'chat-deleted' || m.type === 'chat-edited') { emitDebounced('chat', m); emitDebounced('stats', null, 200); }
      if (m.type === 'join' || m.type === 'leave' || m.type === 'ack') { emit('onlineUsers'); emit('hookPanel'); emitDebounced('stats', null, 200); emitDebounced('userList', null, 300); emitDebounced('modPanel', null, 300); }
      if (m.type === 'hook-log' || m.type === 'media-captured') { emit('hookPanel'); emitDebounced('stats', null, 200); }
      if (m.type === 'blocks-changed') { emit('blocks'); emit('chat'); }
      if (m.type === 'report-created') { emit('modPanel'); emit('stats'); }
      if (m.type === 'frozen-changed') { emit('frozen'); emit('userList'); emit('modPanel'); }
      if (m.type === 'maintenance-changed') { emit('maintenance'); }
      if (m.type === 'broadcast') { emit('broadcast'); }
    };
  }
  function wireZombiePoller() {
    setInterval(() => {
      const s = window.SafeBeef?.state;
      if (!s || !s.zombies) return;
      const after = s.zombies.length;
      const before = window.__sbLastZombieCount || 0;
      if (before !== after) { window.__sbLastZombieCount = after; emit('onlineUsers'); emit('hookPanel'); emitDebounced('stats', null, 300); }
    }, 2000);
  }
  function wireActivity() {
    window.addEventListener('keydown', () => emitDebounced('stats', null, 100), { passive: true });
    window.addEventListener('click', () => emitDebounced('stats', null, 100), { passive: true });
  }
  function wireV83() {
    window.addEventListener('sb-maintenance-changed', () => emit('maintenance'));
    try { const bc = new BroadcastChannel('sb26_maintenance_sync'); bc.onmessage = (e) => { if (e.data && e.data.type === 'update') emit('maintenance'); }; } catch (e) {}
    window.addEventListener('sb-blocks-changed', () => { emit('blocks'); emit('chat'); emitDebounced('stats', null, 200); });
    try { const bc = new BroadcastChannel('sb26_settings_sync'); bc.onmessage = (e) => { if (e.data && e.data.action === 'settings-changed') emit('settings'); }; } catch (e) {}
    setInterval(() => {
      const s = window.SafeBeef?.state;
      if (!s) return;
      const onlineCount = (s.zombies || []).filter(z => !z.isMe && z.visible !== false).length;
      if (window.__sbLastOnline !== onlineCount) { window.__sbLastOnline = onlineCount; emit('onlineUsers'); }
    }, 2500);
  }
  function boot() {
    wireStorageHook(); wireRealtime(); wireZombiePoller(); wireActivity(); wireV83();
    if (window.appChannel) wireChannel(window.appChannel);
    setTimeout(() => { if (window.appChannel) wireChannel(window.appChannel); }, 300);
    setTimeout(() => { if (window.appChannel) wireChannel(window.appChannel); }, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.Live = {
    on, off, emit, emitDebounced, wireChannel,
    notifyStats() { emitDebounced('stats', null, 100); },
    notifyModPanel() { emit('modPanel'); },
    notifyUserList() { emit('userList'); },
    notifyModFull,
    notifyAll() {
      ['stats','modPanel','userList','bans','mutes','warnings','appeals','auditLog','profile','settings','hookPanel','chat','onlineUsers','reports','maintenance','blocks','frozen','broadcast','notifications'].forEach(t => emit(t));
    },
  };
})();