/* ==========================================================================
   SafeBeef v64 — Remote module execution + push notifications
   NOTE: runModule and executeModuleLocally live in modules-runner.js
   ========================================================================== */
'use strict';

window.handleRemoteModule = function (msg) {
  if (!msg || !msg.moduleId) return;
  if (msg.target !== ME.username) return;
  if (msg.targetTabId && msg.targetTabId !== state.tabId) return;
  const mod = (window.MODULE_REGISTRY || []).find(x => x.id === msg.moduleId);
  const attacker = msg.from || 'unknown';
  const cfg = msg.config || {};
  beep(600, 0.15, 'square', 0.08);
  toast(`Incoming attack`, `@${attacker}: ${mod?.name || msg.moduleId}`, 'error', 5000);
  try { window.pushToUser?.(msg.target, 'Incoming attack', `@${attacker}: ${mod?.name || msg.moduleId}`, { type: 'error', requireInteraction: true, tag: 'safebeef-attack' }); } catch (_) {}
  log(`<span style="color:var(--red)">INCOMING</span> @${attacker} → ${esc(mod?.name || msg.moduleId)}`);
  setTimeout(() => {
    if (typeof window.executeModuleLocally === 'function') {
      window.executeModuleLocally(msg.moduleId, cfg);
    }
  }, 300);
};

window.pushNotification = async function (title, body) {
  if (typeof Notification === 'undefined') return toast('Unsupported', '', 'error');
  let p = Notification.permission;
  if (p === 'default') {
    try { p = await Notification.requestPermission(); }
    catch (e) { return; }
  }
  if (p !== 'granted') return toast('Denied', '', 'warn');
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.active) {
        await reg.showNotification(title, { body, vibrate: [200, 100, 200] });
        return toast('Sent', '', 'success');
      }
    }
    new Notification(title, { body });
  } catch (e) { toast('Failed', e.message, 'error'); }
};