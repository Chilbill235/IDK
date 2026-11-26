/* SafeBeef v83 — Maintenance controller */
'use strict';
(function () {
  const KEY = 'sb26_maintenance';
  const CHANNEL = 'sb26_maintenance_sync';
  const AUTO_TRIGGERS_KEY = 'sb26_maintenance_auto_triggers';
  
  // Auto-trigger configuration
  const AUTO_TRIGGERS = {
    errorThreshold: 10,        // Number of errors in windowMs to trigger maintenance
    errorWindowMs: 60000,      // 1 minute window
    dbFailureThreshold: 3,     // DB failures in windowMs
    scheduledMaintenance: null, // { dayOfWeek, hour, minute, durationMs, message }
  };
  
  let errorCount = 0;
  let errorWindowStart = Date.now();
  let dbFailureCount = 0;
  let dbFailureWindowStart = Date.now();
  
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
      autoTriggered: !!opts.autoTriggered,
      triggerReason: opts.triggerReason || null,
    });
  }
  function disable() { return write({ enabled: false, endedAt: Date.now() }); }
  function get() { return read(); }
  
  // Auto-trigger functions
  function recordError() {
    const now = Date.now();
    if (now - errorWindowStart > AUTO_TRIGGERS.errorWindowMs) {
      errorCount = 0;
      errorWindowStart = now;
    }
    errorCount++;
    checkAutoTrigger('error');
  }
  
  function recordDbFailure() {
    const now = Date.now();
    if (now - dbFailureWindowStart > AUTO_TRIGGERS.errorWindowMs) {
      dbFailureCount = 0;
      dbFailureWindowStart = now;
    }
    dbFailureCount++;
    checkAutoTrigger('dbFailure');
  }
  
  function checkAutoTrigger(type) {
    if (enabled()) return; // Already in maintenance
    
    if (type === 'error' && errorCount >= AUTO_TRIGGERS.errorThreshold) {
      enable({
        message: `🔧 Auto-maintenance: High error rate detected (${errorCount} errors in 1 min). System stabilizing...`,
        by: 'auto-system',
        until: Date.now() + 5 * 60000, // 5 minutes
        autoTriggered: true,
        triggerReason: `error_threshold_${errorCount}`,
      });
      errorCount = 0;
      try { window.toast?.({ title: 'Auto-maintenance enabled', msg: 'High error rate detected', type: 'warn', dur: 10000 }); } catch (e) {}
      try { console.warn('[maintenance] Auto-triggered: error threshold exceeded'); } catch (e) {}
    }
    if (type === 'dbFailure' && dbFailureCount >= AUTO_TRIGGERS.dbFailureThreshold) {
      enable({
        message: `🔧 Auto-maintenance: Database connection issues detected. Attempting recovery...`,
        by: 'auto-system',
        until: Date.now() + 10 * 60000, // 10 minutes
        autoTriggered: true,
        triggerReason: `db_failure_threshold_${dbFailureCount}`,
      });
      dbFailureCount = 0;
      try { window.toast?.({ title: 'Auto-maintenance enabled', msg: 'Database issues detected', type: 'error', dur: 10000 }); } catch (e) {}
      try { console.warn('[maintenance] Auto-triggered: db failure threshold exceeded'); } catch (e) {}
    }
  }
  
  // Scheduled maintenance checker
  function checkScheduledMaintenance() {
    if (!AUTO_TRIGGERS.scheduledMaintenance) return;
    const sched = AUTO_TRIGGERS.scheduledMaintenance;
    const now = new Date();
    const targetDay = sched.dayOfWeek; // 0-6 (Sun-Sat)
    const targetHour = sched.hour;     // 0-23
    const targetMinute = sched.minute; // 0-59
    
    if (now.getDay() === targetDay && now.getHours() === targetHour && now.getMinutes() === targetMinute) {
      if (!enabled()) {
        enable({
          message: sched.message || `🔧 Scheduled maintenance in progress. Expected back in ${Math.round(sched.durationMs / 60000)} minutes.`,
          by: 'auto-scheduler',
          until: Date.now() + sched.durationMs,
          autoTriggered: true,
          triggerReason: 'scheduled_maintenance',
        });
        try { window.toast?.({ title: 'Scheduled maintenance started', msg: 'System will be back soon', type: 'info', dur: 30000 }); } catch (e) {}
      }
    }
  }
  
  // Start scheduled maintenance checker (runs every minute)
  setInterval(checkScheduledMaintenance, 60000);
  
  const listeners = new Set();
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function fire(m) { listeners.forEach(fn => { try { fn(m); } catch (e) {} }); }
  try { const bc = new BroadcastChannel(CHANNEL); bc.onmessage = (e) => { if (e.data && e.data.type === 'update') fire(e.data.m || read()); }; } catch (e) {}
  window.addEventListener('sb-maintenance-changed', (e) => fire(e.detail));
  window.addEventListener('storage', (e) => { if (e.key === KEY) fire(read()); });
  
  window.SB_Maintenance = {
    get, read, write, enabled, enable, disable, subscribe, broadcast,
    recordError, recordDbFailure, checkAutoTrigger,
    setAutoTriggers(config) { Object.assign(AUTO_TRIGGERS, config); },
    getAutoTriggers() { return { ...AUTO_TRIGGERS }; },
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
  
  // Hook into global error handlers
  window.addEventListener('error', (e) => {
    SB_Maintenance.recordError();
  });
  window.addEventListener('unhandledrejection', (e) => {
    SB_Maintenance.recordError();
  });
})();