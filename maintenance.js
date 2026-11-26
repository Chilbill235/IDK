/* SafeBeef v83 — Maintenance controller */
'use strict';
(function () {
  const KEY = 'sb26_maintenance';
  const CHANNEL = 'sb26_maintenance_sync';
  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { enabled: false };
      const m = JSON.parse(raw);
      if (!m || typeof m !== 'object') return { enabled: false };
      if (m.enabled && m.until && m.until < Date.now()) {
        const cleared = { ...m, enabled: false };
        localStorage.setItem(KEY, JSON.stringify(cleared));
        return cleared;
      }
      return m;
    } catch (e) { return { enabled: false }; }
  }
  function write(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); broadcast(m); } catch (e) {} return m; }
  function broadcast(m) {
    try { const bc = new BroadcastChannel(CHANNEL); bc.postMessage({ type: 'update', m }); bc.close(); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('sb-maintenance-changed', { detail: m })); } catch (e) {}
  }
  function enabled() { return !!read().enabled; }
  function enable(opts) {
    opts = opts || {};
    return write({
      enabled: true,
      message: opts.message || "SafeBeef is under maintenance. We'll be back soon.",
      by: opts.by || (window.ME && ME.username) || 'system',
      startedAt: Date.now(),
      until: opts.until || null,
    });
  }
  function disable() { return write({ enabled: false, endedAt: Date.now() }); }
  function get() { return read(); }
  const listeners = new Set();
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function fire(m) { listeners.forEach(fn => { try { fn(m); } catch (e) {} }); }
  try { const bc = new BroadcastChannel(CHANNEL); bc.onmessage = (e) => { if (e.data && e.data.type === 'update') fire(e.data.m || read()); }; } catch (e) {}
  window.addEventListener('sb-maintenance-changed', (e) => fire(e.detail));
  window.addEventListener('storage', (e) => { if (e.key === KEY) fire(read()); });
  window.SB_Maintenance = {
    get, read, write, enabled, enable, disable, subscribe, broadcast,
    guard() {
      if (!enabled()) return false;
      let isPriv = false;
      try {
        if (window.Auth && ME && Auth.isPrivileged) isPriv = Auth.isPrivileged(ME.username);
        else if (window.AM_OWNER || window.AM_MOD) isPriv = true;
      } catch (e) {}
      if (!isPriv) { location.replace('maintenance.html'); return true; }
      return false;
    },
    startWatcher() {
      subscribe(() => {
        if (!enabled()) return;
        let isPriv = false;
        try {
          if (window.Auth && ME && Auth.isPrivileged) isPriv = Auth.isPrivileged(ME.username);
          else if (window.AM_OWNER || window.AM_MOD) isPriv = true;
        } catch (e) {}
        if (!isPriv && !location.pathname.endsWith('maintenance.html')) location.replace('maintenance.html');
      });
    },
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => SB_Maintenance.startWatcher());
  else SB_Maintenance.startWatcher();
})();