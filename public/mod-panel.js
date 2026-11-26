/* SafeBeef v83 — Mod panel main */
'use strict';

(function injectModPanelCSS() {
  if (document.getElementById('sb-mod-panel-v82-css')) return;
  const style = document.createElement('style');
  style.id = 'sb-mod-panel-v82-css';
  style.textContent = `
    .mod-body-wrap { display: flex; flex: 1 1 auto; min-height: 0; overflow: hidden; }
    .mod-dialog-stack { z-index: 2147483601 !important; }
    @media (min-width: 901px) {
      .mod-tabs { flex-direction: column !important; width: 210px !important; min-width: 210px !important; height: auto !important; flex-shrink: 0 !important; border-right: 1px solid var(--border) !important; border-bottom: none !important; padding: 12px 10px !important; overflow-y: auto !important; overflow-x: hidden !important; gap: 3px !important; min-height: 0 !important; background: linear-gradient(180deg, var(--bg-2), var(--bg-1)) !important; }
      .mod-tab { width: 100% !important; justify-content: flex-start !important; padding: 12px 14px !important; border-radius: 10px !important; border-left: 3px solid transparent !important; border-bottom: none !important; margin-bottom: 0 !important; align-self: stretch !important; font-size: 13px !important; gap: 10px !important; min-height: 44px !important; }
      .mod-tab:hover { background: var(--surface-2) !important; }
      .mod-tab.on { background: var(--accent-bg) !important; border-left-color: var(--accent) !important; color: var(--text) !important; font-weight: 800 !important; }
      .mod-tab .mod-tab-ico { font-size: 18px !important; }
      .mod-tab > span:not(.mod-tab-ico):not(.mod-tab-count) { flex: 1; text-align: left; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
      .mod-tab .mod-tab-count { margin-left: auto !important; }
      .mod-body { flex: 1 !important; min-width: 0 !important; padding: 22px !important; }
    }
    @media (max-width: 900px) {
      .mod-body-wrap { flex-direction: column !important; }
      .mod-head { position: sticky !important; top: 0 !important; z-index: 20 !important; background: var(--surface) !important; border-bottom: 1px solid var(--border) !important; padding: 14px 16px !important; }
      .mod-tabs { flex-direction: row !important; width: 100% !important; height: auto !important; min-height: 62px !important; max-height: 62px !important; padding: 0 10px !important; overflow-x: auto !important; overflow-y: hidden !important; border-right: none !important; border-bottom: 1px solid var(--border) !important; gap: 2px !important; background: var(--bg-2) !important; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
      .mod-tabs::-webkit-scrollbar { display: none !important; }
      .mod-tab { flex-direction: column !important; gap: 3px !important; padding: 8px 12px !important; min-width: 68px !important; font-size: 10px !important; border-radius: 12px !important; border: 1px solid transparent !important; align-self: center !important; min-height: 54px !important; margin: 4px 0 !important; justify-content: center !important; position: relative !important; }
      .mod-tab.on { border-color: var(--accent-border) !important; border-bottom-color: var(--accent) !important; background: linear-gradient(180deg, var(--accent-bg), transparent) !important; color: var(--accent-2) !important; }
      .mod-tab-ico { font-size: 20px !important; line-height: 1 !important; }
      .mod-tab .mod-tab-count { position: absolute; top: 4px; right: 6px; transform: none !important; margin: 0 !important; min-width: 16px !important; height: 16px !important; font-size: 8px !important; padding: 0 4px !important; }
      .mod-tab > span:not(.mod-tab-ico):not(.mod-tab-count) { font-size: 9px !important; font-weight: 700; text-align: center !important; }
      .mod-body { flex: 1 !important; min-height: 0 !important; overflow-y: auto !important; padding: 14px !important; padding-bottom: calc(14px + env(safe-area-inset-bottom)) !important; }
      .mod-user-card { padding: 14px !important; gap: 14px !important; border-radius: 14px !important; }
      .mod-user-avatar { width: 52px !important; height: 52px !important; font-size: 16px !important; }
      .mod-user-name { font-size: 15px !important; }
      .mod-user-btn { width: 40px !important; height: 40px !important; font-size: 18px !important; }
      .mod-action-btn { padding: 10px 16px !important; font-size: 12.5px !important; border-radius: 9px !important; min-height: 40px !important; }
      .mod-drill-action { padding: 14px !important; min-height: 62px !important; gap: 14px !important; border-radius: 13px !important; }
      .mod-action-ico { width: 42px !important; height: 42px !important; font-size: 19px !important; }
      .mod-action-title { font-size: 14.5px !important; }
      .mod-action-desc { font-size: 11.5px !important; margin-top: 3px !important; }
      .mod-drill-card { max-height: 100dvh !important; height: 100dvh !important; border-radius: 0 !important; max-width: 100% !important; }
      .mod-drill-head { position: sticky; top: 0; z-index: 5; background: var(--surface-2); }
      .mod-search-input { padding: 14px 16px 14px 46px !important; font-size: 14px !important; }
      .mod-search-ico { font-size: 16px !important; left: 16px !important; }
      .mod-dialog { max-height: 100dvh !important; max-width: 100% !important; border-radius: 0 !important; }
      .mod-dialog-overlay { padding: 0 !important; }
      .mod-dialog-head { position: sticky; top: 0; z-index: 5; }
      .mod-dialog-foot { position: sticky; bottom: 0; z-index: 5; padding-bottom: calc(14px + env(safe-area-inset-bottom)) !important; }
      .mod-dialog-foot .btn { flex: 1; min-height: 46px; }
      .mod-dialog-input, .mod-dialog-textarea { font-size: 15px !important; padding: 14px 16px !important; }
      .mp-duration { grid-template-columns: repeat(2, 1fr) !important; }
      .mod-list-card { padding: 14px !important; flex-wrap: wrap !important; gap: 10px !important; border-radius: 13px !important; }
      .mod-list-avatar { width: 46px !important; height: 46px !important; font-size: 14px !important; }
      .mod-list-actions { width: 100% !important; justify-content: stretch !important; margin-top: 8px !important; gap: 8px !important; }
      .mod-list-actions .mod-action-btn { flex: 1 !important; }
      .mod-tool { padding: 14px !important; min-height: 62px !important; gap: 14px !important; }
      .mod-tool-ico { width: 44px !important; height: 44px !important; font-size: 20px !important; }
      .mod-settings-row { padding: 14px !important; min-height: 58px !important; }
      .settings-toggle { width: 48px !important; height: 28px !important; border-radius: 14px !important; }
      .settings-toggle::after { width: 22px !important; height: 22px !important; }
      .settings-toggle.on::after { transform: translateX(20px) !important; }
    }
    @media (max-width: 400px) {
      .mod-tab { min-width: 60px !important; padding: 6px 8px !important; }
      .mod-tab-ico { font-size: 18px !important; }
      .mod-tab > span:not(.mod-tab-ico):not(.mod-tab-count) { font-size: 8.5px !important; }
      .mod-drill-status { grid-template-columns: 1fr 1fr !important; }
      .mod-drill-stat:last-child { grid-column: span 2 !important; }
    }
  `;
  document.head.appendChild(style);
})();

(function injectDeviceBansCSS() {
  if (document.getElementById('sb-device-bans-css')) return;
  const s = document.createElement('style');
  s.id = 'sb-device-bans-css';
  s.textContent = `
    .mod-devices-header { display: flex; flex-direction: column; gap: 12px; }
    .mod-devices-self { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; background: linear-gradient(135deg, rgba(77,157,255,.06), rgba(181,134,255,.04)); border: 1px solid var(--accent-border); border-radius: 12px; }
    .mod-devices-self-row { display: flex; align-items: center; gap: 10px; justify-content: space-between; flex-wrap: wrap; }
    .mod-devices-self-label { font-size: 10px; text-transform: uppercase; letter-spacing: .8px; color: var(--text-3); font-weight: 800; }
    .mod-devices-self-val { font-family: var(--mono); font-size: 12px; padding: 3px 10px; background: var(--surface-3); border-radius: 6px; color: var(--accent-2); font-weight: 800; word-break: break-all; }
    .mod-devices-self-fp { color: var(--purple-2); }
    .mod-devices-toolbar { display: flex; gap: 8px; }
    .mod-devices-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .mod-devices-btn { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--border-2); color: var(--text); font-family: inherit; text-align: left; cursor: pointer; transition: all .15s; }
    .mod-devices-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(0,0,0,.3); }
    .mod-devices-btn.danger { border-color: var(--red-border); background: var(--red-bg); }
    .mod-devices-btn.danger:hover { background: rgba(255,90,110,.18); }
    .mod-devices-btn.purple { border-color: var(--purple-border); background: var(--purple-bg); }
    .mod-devices-btn.purple:hover { background: rgba(181,134,255,.18); }
    .mod-devices-btn-ico { font-size: 20px; flex-shrink: 0; }
    .mod-devices-btn-body { display: flex; flex-direction: column; min-width: 0; }
    .mod-devices-btn-title { font-size: 12.5px; font-weight: 800; }
    .mod-devices-btn-desc { font-size: 10px; color: var(--text-3); margin-top: 1px; }
    .mod-devices-btn.danger .mod-devices-btn-title { color: var(--red-2); }
    .mod-devices-btn.purple .mod-devices-btn-title { color: var(--purple-2); }
    .mod-devices-section { margin-top: 14px; display: flex; flex-direction: column; gap: 10px; }
    .mod-devices-section-head { display: flex; align-items: center; gap: 8px; padding: 0 4px; }
    .mod-devices-section-ico { font-size: 16px; }
    .mod-devices-section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--text-3); flex: 1; }
    .mod-devices-section-count { font-size: 10px; font-family: var(--mono); font-weight: 800; padding: 2px 8px; background: var(--surface-3); border-radius: 99px; color: var(--text-2); }
    .mod-devices-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
    @media (min-width: 901px) { .mod-devices-grid { grid-template-columns: 1fr 1fr; } }
    .mod-device-card { display: flex; flex-direction: column; background: var(--surface-2); border: 1px solid var(--border-2); border-radius: 14px; overflow: hidden; transition: transform .15s, border-color .15s; }
    .mod-device-card:hover { transform: translateY(-1px); border-color: var(--border-3); }
    .mod-device-card.danger { border-left: 3px solid var(--red); }
    .mod-device-card.purple { border-left: 3px solid var(--purple); }
    .mod-device-card.is-self { box-shadow: 0 0 0 2px var(--red-border) inset; }
    .mod-device-card-top { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px 8px; }
    .mod-device-card-icon { width: 36px; height: 36px; border-radius: 9px; display: grid; place-items: center; font-size: 16px; flex-shrink: 0; background: var(--red-bg); color: var(--red-2); border: 1px solid var(--red-border); }
    .mod-device-card.purple .mod-device-card-icon { background: var(--purple-bg); color: var(--purple-2); border-color: var(--purple-border); }
    .mod-device-card-info { flex: 1; min-width: 0; }
    .mod-device-card-title { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12.5px; font-weight: 800; }
    .mod-device-card-title code { font-family: var(--mono); font-size: 12.5px; color: var(--red-2); font-weight: 800; word-break: break-all; }
    .mod-device-card.purple .mod-device-card-title code { color: var(--purple-2); }
    .mod-device-card-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
    .mod-device-badge { font-size: 9px; font-weight: 900; letter-spacing: .6px; padding: 2px 8px; border-radius: 5px; text-transform: uppercase; }
    .mod-device-badge.perm { background: var(--red-bg); color: var(--red-2); border: 1px solid var(--red-border); }
    .mod-device-badge.temp { background: var(--amber-bg); color: var(--amber-2); border: 1px solid var(--amber-border); }
    .mod-device-tag { font-size: 8.5px; font-weight: 900; padding: 2px 7px; border-radius: 4px; }
    .mod-device-tag.danger { background: var(--red); color: #fff; }
    .mod-device-meta-item { font-size: 10px; color: var(--text-3); font-family: var(--mono); }
    .mod-device-card-body { display: flex; flex-direction: column; gap: 4px; padding: 6px 14px 10px; border-top: 1px solid var(--border); }
    .mod-device-row { display: flex; gap: 8px; font-size: 11px; }
    .mod-device-row-label { color: var(--text-3); font-weight: 700; text-transform: uppercase; letter-spacing: .4px; font-size: 9.5px; min-width: 56px; flex-shrink: 0; }
    .mod-device-row-val { color: var(--text-2); word-break: break-word; flex: 1; min-width: 0; }
    .mod-device-row-val.mono { font-family: var(--mono); font-size: 10.5px; }
    .mod-device-card-actions { display: flex; gap: 6px; padding: 10px 14px; border-top: 1px solid var(--border); background: rgba(0,0,0,.15); }
    .mod-device-btn { flex: 1; padding: 8px 12px; border-radius: 8px; background: var(--surface-3); border: 1px solid var(--border-3); color: var(--text); font-size: 11px; font-weight: 800; cursor: pointer; font-family: inherit; transition: .15s; }
    .mod-device-btn:hover { background: var(--surface-4); border-color: var(--border-4); }
    .mod-device-btn.success { background: var(--green-bg); color: var(--green-2); border-color: var(--green-border); }
    .mod-device-btn.success:hover { background: var(--green); color: #fff; }
    @media (max-width: 768px) {
      .mod-devices-btns { grid-template-columns: 1fr; }
      .mod-devices-btn { padding: 14px; min-height: 60px; }
      .mod-devices-btn-ico { font-size: 22px; }
      .mod-devices-btn-title { font-size: 13.5px; }
      .mod-devices-btn-desc { font-size: 11px; }
      .mod-device-card-actions { padding: 12px 14px; gap: 8px; }
      .mod-device-btn { padding: 12px; font-size: 12.5px; min-height: 44px; }
    }
  `;
  document.head.appendChild(s);
})();

/* ---------- Helpers ---------- */
function mpSafe(fn, fallback) { try { return fn(); } catch (e) { console.warn('[mod-panel]', e); return fallback; } }
function mpRead(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? fallback : v; } catch (e) { return fallback; } }
function mpWrite(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }
function mpGetBans() {
  const b = (window.Auth && Auth.getBans) ? mpSafe(() => Auth.getBans(), null) : null;
  if (b) return { users: b.users || {}, ips: b.ips || {}, history: b.history || [] };
  const r = mpRead('sb26_bans', { users: {}, ips: {}, history: [] });
  return { users: r.users || {}, ips: r.ips || {}, history: r.history || [] };
}
function mpGetMutes() { return (window.Auth && Auth.getMutes) ? mpSafe(() => Auth.getMutes(), {}) : mpRead('sb44_mutes', {}); }
function mpGetUsers() { return (window.Auth && Auth.getUsers) ? mpSafe(() => Auth.getUsers(), {}) : mpRead('sb26_users', {}); }
function mpGetWarnings() { const w = mpRead('sb26_warnings', {}); return (w && typeof w === 'object' && !Array.isArray(w)) ? w : {}; }
function mpGetAppeals() { const a = mpRead('sb26_appeals', []); return Array.isArray(a) ? a : []; }
function mpGetIPBans() { return window.IPBan ? window.IPBan.list() : []; }
function mpGetHWBans() { return (window.IPBan && window.IPBan.listHardwareBans) ? window.IPBan.listHardwareBans() : []; }
function mpGetReports() { const r = mpRead('sb26_reports', []); return Array.isArray(r) ? r : []; }
function mpGetWhitelist() { const w = mpRead('sb26_whitelist', []); return Array.isArray(w) ? w : []; }
function mpGetModNotes() { const n = mpRead('sb26_mod_notes', {}); return (n && typeof n === 'object') ? n : {}; }
function mpGetSlowMode() { const s = mpRead('sb26_slowmode', {}); return (s && typeof s === 'object') ? s : {}; }
function mpGetFrozen() { const f = mpRead('sb26_frozen_users', {}); return (f && typeof f === 'object') ? f : {}; }
function mpSetFrozen(map) { mpWrite('sb26_frozen_users', map); try { window.SafeBeef?.appChannel?.postMessage({ type: 'frozen-changed' }); } catch (e) {} }
function mpGetPins() { const p = mpRead('sb26_pins', {}); return (p && typeof p === 'object') ? p : {}; }
function mpSetPins(pins) { mpWrite('sb26_pins', pins); }
function mpGetWatched() { const w = mpRead('sb26_watched', {}); return (w && typeof w === 'object') ? w : {}; }
function mpSetWatched(w) { mpWrite('sb26_watched', w); }
function mpGetGhostMode() { const g = mpRead('sb26_ghost_mode', {}); return (g && typeof g === 'object') ? g : {}; }
function mpSetGhostMode(g) { mpWrite('sb26_ghost_mode', g); }
function mpGetSettings() {
  return mpRead('sb26_mod_settings', {
    confirmBans: true, confirmMutes: true, confirmKicks: false,
    requireReason: true, requireReasonMutes: true,
    soundAlerts: true, beepOnReports: true, beepOnAppeals: true,
    autoRefresh: true, showFingerprints: true, compactMode: false,
    defaultBanDuration: '1d', defaultMuteDuration: '15m',
    showUserIdInList: false,
  });
}
function mpSaveSettings(s) { mpWrite('sb26_mod_settings', s); }

function mpApplyCompactMode() {
  const s = mpGetSettings();
  document.body.classList.toggle('compact-mode', !!s.compactMode);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mpApplyCompactMode);
else mpApplyCompactMode();

let _mpAudioCtx = null;
function mpBeep(freq = 800, dur = 0.08, type = 'sine', vol = 0.06) {
  const s = mpGetSettings();
  if (!s.soundAlerts) return;
  try {
    if (!_mpAudioCtx) _mpAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = _mpAudioCtx.createOscillator();
    const gain = _mpAudioCtx.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, _mpAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, _mpAudioCtx.currentTime + dur);
    osc.connect(gain); gain.connect(_mpAudioCtx.destination);
    osc.start(); osc.stop(_mpAudioCtx.currentTime + dur);
  } catch (e) {}
}

function mpFmtDur(ms) {
  if (window.IPBan && window.IPBan.fmtDur) return window.IPBan.fmtDur(ms);
  if (ms == null) return 'Permanent';
  if (ms <= 0) return 'Expired';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60);
  const parts = [];
  if (d) parts.push(d + 'd'); if (h) parts.push(h + 'h'); if (m) parts.push(m + 'm');
  if (!d && !h) parts.push((s % 60) + 's');
  return parts.join(' ');
}
function mpToast(opts, msg, type) {
  if (typeof window.toast === 'function') {
    if (typeof opts === 'object') window.toast(opts);
    else window.toast(opts, msg, type || 'info');
  }
}
function mpLogAction(action, username, extra) {
  const bans = mpGetBans();
  bans.history = bans.history || [];
  const now = Date.now();
  bans.history.push({ action, username, by: (window.ME && ME.username) || 'system', at: now, atISO: new Date(now).toISOString(), atLocal: new Date(now).toLocaleString(), ...(extra||{}) });
  if (bans.history.length > 500) bans.history = bans.history.slice(-500);
  if (window.Auth && Auth.saveBans) Auth.saveBans(bans); else mpWrite('sb26_bans', bans);
}

/**
 * Mount a modal dialog.
 * Automatically stacks if there's a parent layer (drill or another dialog) present.
 * - Back button always closes and reveals the parent (no callback re-invoking).
 * - Pass opts.onBack = true (or any truthy) to render the back button.
 *
 * FIXED v83.1: ESC handler is now removed on every close path — no more leaks.
 */
function mpMountDialog(html, opts = {}) {
  const hasParentLayer = !!document.querySelector('.mod-drill, .mod-dialog-overlay');
  const shouldStack = opts.stack !== undefined ? !!opts.stack : hasParentLayer;
  if (!shouldStack) {
    document.querySelectorAll('.mod-dialog-overlay').forEach(el => el.remove());
  }
  const overlay = document.createElement('div');
  overlay.className = 'mod-dialog-overlay' + (hasParentLayer ? ' mod-dialog-stack' : '');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
  const onClose = opts.onClose || (() => {});
  let _closed = false;
  const escHandler = (e) => { if (e.key === 'Escape') close(); };
  const close = () => {
    if (_closed) return;
    _closed = true;
    document.removeEventListener('keydown', escHandler);
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity .15s';
    setTimeout(() => { overlay.remove(); onClose(); }, 160);
  };
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  const closeBtn = overlay.querySelector('.mod-dialog-close');
  if (closeBtn) closeBtn.onclick = close;
  overlay.querySelectorAll('[data-act="cancel"]').forEach(b => b.onclick = close);
  overlay.querySelectorAll('[data-act="back"]').forEach(b => b.onclick = close);
  document.addEventListener('keydown', escHandler);
  return { overlay, close };
}

function mpDurationPicker(options, currentKey, onChange) {
  let selected = currentKey;
  const wrap = document.createElement('div');
  wrap.className = 'mp-duration';
  wrap.innerHTML = options.map(o => `
    <button type="button" data-key="${o.key}" class="mp-duration-btn ${o.key === selected ? 'on' : ''} ${o.key === 'perm' ? 'perm' : ''}">
      <span class="mp-duration-label">${o.label}</span>
      ${o.desc ? `<span class="mp-duration-desc">${o.desc}</span>` : ''}
    </button>`).join('');
  wrap.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => { selected = btn.dataset.key; wrap.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.key === selected)); onChange(selected); };
  });
  return wrap;
}

/* Expose helpers on window */
window.mpSafe = mpSafe; window.mpRead = mpRead; window.mpWrite = mpWrite;
window.mpGetBans = mpGetBans; window.mpGetMutes = mpGetMutes; window.mpGetUsers = mpGetUsers;
window.mpGetWarnings = mpGetWarnings; window.mpGetAppeals = mpGetAppeals;
window.mpGetIPBans = mpGetIPBans; window.mpGetHWBans = mpGetHWBans;
window.mpGetReports = mpGetReports; window.mpGetWhitelist = mpGetWhitelist;
window.mpGetModNotes = mpGetModNotes; window.mpGetSlowMode = mpGetSlowMode;
window.mpGetFrozen = mpGetFrozen; window.mpSetFrozen = mpSetFrozen;
window.mpGetPins = mpGetPins; window.mpSetPins = mpSetPins;
window.mpGetWatched = mpGetWatched; window.mpSetWatched = mpSetWatched;
window.mpGetGhostMode = mpGetGhostMode; window.mpSetGhostMode = mpSetGhostMode;
window.mpGetSettings = mpGetSettings; window.mpSaveSettings = mpSaveSettings;
window.mpFmtDur = mpFmtDur; window.mpToast = mpToast; window.mpLogAction = mpLogAction;
window.mpBeep = mpBeep; window.mpMountDialog = mpMountDialog; window.mpDurationPicker = mpDurationPicker;

function enableWheelScrollHorizontal(el) {
  if (!el || el.dataset.wheelScroll === '1') return;
  el.dataset.wheelScroll = '1';
  el.addEventListener('wheel', (e) => {
    if (window.innerWidth >= 901) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      const before = el.scrollLeft;
      el.scrollLeft += e.deltaY;
      if (el.scrollLeft !== before) e.preventDefault();
    }
  }, { passive: false });
}
function enableDragScroll(el) {
  if (!el || el.dataset.dragScroll === '1') return;
  el.dataset.dragScroll = '1';
  let isDown = false, startX = 0, startScroll = 0;
  const onDown = (e) => { if (e.target.closest('.mod-tab')) return; isDown = true; startX = (e.touches ? e.touches[0].clientX : e.clientX); startScroll = el.scrollLeft; };
  const onMove = (e) => { if (!isDown) return; const x = (e.touches ? e.touches[0].clientX : e.clientX); el.scrollLeft = startScroll - (x - startX); };
  const onUp = () => { isDown = false; };
  el.addEventListener('mousedown', onDown); el.addEventListener('mousemove', onMove); el.addEventListener('mouseup', onUp); el.addEventListener('mouseleave', onUp);
  el.addEventListener('touchstart', onDown, { passive: true }); el.addEventListener('touchmove', onMove, { passive: false }); el.addEventListener('touchend', onUp);
}

function removeAllModUI() {
  document.querySelectorAll('.mod-panel, .mod-drill, .mod-dialog-overlay').forEach(el => el.remove());
  try { document.body.style.overflow = ''; } catch (e) {}
}

function openModPanel() {
  if (!window.AM_PRIVILEGED) return mpToast({ title:'Forbidden', msg:'Moderator access required', type:'error' });
  removeAllModUI();
  mpApplyCompactMode();

  const panel = document.createElement('div');
  panel.className = 'mod-panel';
  panel.innerHTML = `
    <div class="mod-card" role="dialog" aria-modal="true">
      <div class="mod-head">
        <div class="mod-head-left">
          <div class="mod-head-icon">🛡</div>
          <div class="mod-head-text">
            <h2>Moderation</h2>
            <div class="mod-head-meta">${esc(ME.display)} ${window.AM_OWNER ? '<span class="role-tag owner">OWNER</span>' : '<span class="role-tag mod">MOD</span>'}<span class="mod-live-chip" id="mpLiveChip" title="Auto-refresh status"><span class="mod-live-dot"></span><span class="mod-live-text">Live</span></span></div>
          </div>
        </div>
        <button class="imsg-close" aria-label="Close" type="button">×</button>
      </div>
      <div class="mod-body-wrap">
        <div class="mod-tabs" id="mpTabs" role="tablist"></div>
        <div class="mod-body" id="mpBody"></div>
      </div>
    </div>`;
  document.body.appendChild(panel);

  const prevOv = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const unlockScroll = () => { document.body.style.overflow = prevOv; };
  const closePanel = () => { unlockScroll(); panel.remove(); };
  panel.querySelector('.imsg-close').onclick = closePanel;

  const tabsEl = panel.querySelector('#mpTabs');
  const bodyEl = panel.querySelector('#mpBody');
  enableWheelScrollHorizontal(tabsEl);
  enableDragScroll(tabsEl);

  let activeTab = 'users';
  let userSearch = '';
  let ipSearch = '';
  let refreshRaf = null;
  let bulkMode = false;
  let selectedUsers = new Set();
  const liveUnsubs = [];
  let liveSubscribed = false;

  const privWatcher = setInterval(() => {
    if (!document.body.contains(panel)) { clearInterval(privWatcher); return; }
    const stillPriv = (window.Auth && (Auth.isMod(ME.username) || Auth.isOwner(ME.username)));
    if (!stillPriv) {
      clearInterval(privWatcher);
      closePanel();
      document.querySelectorAll('.mod-drill, .mod-dialog-overlay').forEach(el => el.remove());
      document.body.style.overflow = prevOv;
      const m = document.getElementById('menuModItem'); if (m) m.style.display = 'none';
      const s = document.getElementById('sheetModItem'); if (s) s.style.display = 'none';
      const b = document.getElementById('btnMod'); if (b) b.style.display = 'none';
      mpToast({ title:'Access revoked', msg:'You are no longer a moderator', type:'error', dur: 5000 });
    }
  }, 2000);

  function applyAutoRefresh() {
    const s = mpGetSettings();
    const chip = panel.querySelector('#mpLiveChip');
    if (chip) {
      chip.classList.toggle('paused', !s.autoRefresh);
      const t = chip.querySelector('.mod-live-text');
      if (t) t.textContent = s.autoRefresh ? 'Live' : 'Paused';
      chip.title = s.autoRefresh ? 'Auto-refresh on — panel updates live' : 'Auto-refresh paused';
    }
    if (s.autoRefresh && !liveSubscribed) {
      liveSubscribed = true;
      if (window.Live) {
        ['modPanel','userList','bans','mutes','warnings','appeals','auditLog','frozen','maintenance'].forEach(topic => {
          const off = Live.on(topic, safeRefresh);
          if (typeof off === 'function') liveUnsubs.push(off);
        });
        const off2 = Live.on('onlineUsers', () => { if (activeTab === 'users') safeRefresh(); });
        if (typeof off2 === 'function') liveUnsubs.push(off2);
      }
    } else if (!s.autoRefresh && liveSubscribed) {
      liveSubscribed = false;
      liveUnsubs.forEach(u => { try { u(); } catch (e) {} });
      liveUnsubs.length = 0;
    }
  }

  function safeRefresh() {
    if (!document.body.contains(panel)) return;
    if (refreshRaf) return;
    refreshRaf = requestAnimationFrame(() => {
      refreshRaf = null;
      if (!document.body.contains(panel)) return;
      const st = bodyEl.scrollTop;
      const activeEl = document.activeElement;
      const activeId = activeEl && activeEl.id;
      const selStart = activeEl && activeEl.selectionStart;
      renderTabs(); renderBody();
      bodyEl.scrollTop = st;
      if (activeId) {
        const el = document.getElementById(activeId);
        if (el) { el.focus(); if (selStart != null && el.setSelectionRange) { try { el.setSelectionRange(selStart, selStart); } catch (e) {} } }
      }
    });
  }

  function renderTabs() {
    const bans = mpGetBans(); const mutes = mpGetMutes(); const appeals = mpGetAppeals(); const reports = mpGetReports();
    const users = mpGetUsers();
    const userList = Object.values(users).filter(u => u.username !== ME.username);
    const pendingAppeals = appeals.filter(a => a.status === 'pending');
    const pendingReports = reports.filter(r => !r.resolved);
    const activeBans = Object.values(bans.users).filter(b => b && (b.expiresAt == null || b.expiresAt > Date.now())).length;
    const activeMutes = Object.values(mutes).filter(m => m && (m.until == null || m.until > Date.now())).length;
    const ipBanCount = mpGetIPBans().length; const hwBanCount = mpGetHWBans().length;
    const watchedCount = Object.keys(mpGetWatched()).length;

    tabsEl.innerHTML = `
      <button class="mod-tab ${activeTab==='users'?'on':''}" data-tab="users" type="button"><span class="mod-tab-ico">👥</span><span>Users</span><span class="mod-tab-count">${userList.length}</span></button>
      <button class="mod-tab ${activeTab==='watched'?'on':''}" data-tab="watched" type="button"><span class="mod-tab-ico">👁</span><span>Watched</span>${watchedCount?`<span class="mod-tab-count warn">${watchedCount}</span>`:''}</button>
      <button class="mod-tab ${activeTab==='reports'?'on':''}" data-tab="reports" type="button"><span class="mod-tab-ico">🚩</span><span>Reports</span>${pendingReports.length?`<span class="mod-tab-count danger">${pendingReports.length}</span>`:''}</button>
      <button class="mod-tab ${activeTab==='bans'?'on':''}" data-tab="bans" type="button"><span class="mod-tab-ico">🚫</span><span>Bans</span>${activeBans?`<span class="mod-tab-count danger">${activeBans}</span>`:''}</button>
      <button class="mod-tab ${activeTab==='ipbans'?'on':''}" data-tab="ipbans" type="button"><span class="mod-tab-ico">🌐</span><span>Devices</span>${(ipBanCount+hwBanCount)?`<span class="mod-tab-count danger">${ipBanCount+hwBanCount}</span>`:''}</button>
      <button class="mod-tab ${activeTab==='mutes'?'on':''}" data-tab="mutes" type="button"><span class="mod-tab-ico">🔇</span><span>Mutes</span>${activeMutes?`<span class="mod-tab-count warn">${activeMutes}</span>`:''}</button>
      <button class="mod-tab ${activeTab==='warnings'?'on':''}" data-tab="warnings" type="button"><span class="mod-tab-ico">⚠</span><span>Warns</span></button>
      <button class="mod-tab ${activeTab==='appeals'?'on':''}" data-tab="appeals" type="button"><span class="mod-tab-ico">📨</span><span>Appeals</span>${pendingAppeals.length?`<span class="mod-tab-count danger">${pendingAppeals.length}</span>`:''}</button>
      <button class="mod-tab ${activeTab==='logs'?'on':''}" data-tab="logs" type="button"><span class="mod-tab-ico">📜</span><span>Audit</span></button>
      <button class="mod-tab ${activeTab==='tools'?'on':''}" data-tab="tools" type="button"><span class="mod-tab-ico">🧰</span><span>Tools</span></button>
      <button class="mod-tab ${activeTab==='settings'?'on':''}" data-tab="settings" type="button"><span class="mod-tab-ico">⚙</span><span>Settings</span></button>`;

    tabsEl.querySelectorAll('.mod-tab').forEach(tab => {
      tab.onclick = () => { activeTab = tab.dataset.tab; renderTabs(); renderBody(); bodyEl.scrollTop = 0; };
    });
    setTimeout(() => { const activeTabEl = tabsEl.querySelector('.mod-tab.on'); if (activeTabEl) activeTabEl.scrollIntoView({ block:'nearest', inline:'nearest' }); }, 20);
  }

  function renderBody() {
    switch (activeTab) {
      case 'users': return renderUsers();
      case 'watched': return renderWatched();
      case 'reports': return renderReports();
      case 'bans': return renderBans();
      case 'ipbans': return renderDeviceBans();
      case 'mutes': return renderMutes();
      case 'warnings': return renderWarnings();
      case 'appeals': return renderAppeals();
      case 'logs': return renderLogs();
      case 'tools': return renderTools();
      case 'settings': return renderSettings();
    }
  }

  function renderWatched() {
    const watched = mpGetWatched(); const users = mpGetUsers(); const entries = Object.entries(watched);
    if (!entries.length) { bodyEl.innerHTML = `<div class="mod-empty-large"><div class="mod-empty-ico">👁</div><div class="mod-empty-title">No users watched</div><div class="mod-empty-desc">Use <strong>Watch</strong> from a user's action menu.</div></div>`; return; }
    bodyEl.innerHTML = `<div class="mod-list">${entries.map(([username, info]) => {
      const u = users[username] || {};
      return `
        <div class="mod-list-card amber">
          <div class="mod-list-avatar" style="background:${u.color||'#666'}">${esc(u.avatar||'??')}</div>
          <div class="mod-list-info">
            <div class="mod-list-name">${esc(u.display||username)} <span class="mod-badge warn">WATCHED</span></div>
            <div class="mod-list-meta"><span>@${esc(username)}</span>${info.reason ? `<span class="mod-list-reason">${esc(info.reason)}</span>` : ''}<span>since ${new Date(info.at||Date.now()).toLocaleString()}</span></div>
          </div>
          <div class="mod-list-actions">
            <button class="mod-action-btn accent" data-act="view" data-user="${esc(username)}" type="button">Actions ›</button>
            <button class="mod-action-btn" data-act="unwatch" data-user="${esc(username)}" type="button">Unwatch</button>
            <button class="mod-action-btn danger" data-act="watch-ban" data-user="${esc(username)}" type="button">Ban</button>
          </div>
        </div>`;
    }).join('')}</div>`;
    bodyEl.querySelectorAll('[data-act="view"]').forEach(btn => { btn.onclick = () => openUserActions(btn.dataset.user); });
    bodyEl.querySelectorAll('[data-act="unwatch"]').forEach(btn => { btn.onclick = () => { const w = mpGetWatched(); delete w[btn.dataset.user]; mpSetWatched(w); mpToast({ title:'Unwatched', msg:'@'+btn.dataset.user, type:'success' }); safeRefresh(); }; });
    bodyEl.querySelectorAll('[data-act="watch-ban"]').forEach(btn => { btn.onclick = () => openBanDialog(btn.dataset.user, () => safeRefresh()); });
  }

  function renderUsers() {
    const users = mpGetUsers();
    let list = Object.values(users).filter(u => u.username !== ME.username);
    list.sort((a, b) => {
      if (a.role === 'owner' && b.role !== 'owner') return -1;
      if (b.role === 'owner' && a.role !== 'owner') return 1;
      if (a.role === 'mod' && b.role === 'user') return -1;
      if (b.role === 'mod' && a.role === 'user') return 1;
      return (a.username || '').localeCompare(b.username || '');
    });
    const bulkBarHtml = bulkMode ? `
      <div class="mod-bulk-bar">
        <div class="mod-bulk-bar-info">${selectedUsers.size} selected</div>
        <button class="btn primary" data-bulk="mute" type="button">Mute all</button>
        <button class="btn danger" data-bulk="ban" type="button">Ban all</button>
        <button class="btn" data-bulk="warn" type="button">Warn all</button>
        <button class="btn" data-bulk="clear" type="button">Clear</button>
        <button class="btn" data-bulk="exit" type="button">Exit</button>
      </div>` : `
      <div class="mod-bulk-bar">
        <div class="mod-bulk-bar-info">Select multiple users to act at once</div>
        <button class="btn primary" data-bulk="enter" type="button">Bulk mode</button>
      </div>`;
    bodyEl.innerHTML = `<div class="mod-users-head"><div class="mod-search-wrap"><span class="mod-search-ico">🔍</span><input type="search" class="mod-search-input" id="mpUserSearch" placeholder="Search users…" autocomplete="off" value="${esc(userSearch)}"></div></div>${bulkBarHtml}<div class="mod-user-list" id="mpUserList"></div>`;
    const searchInput = bodyEl.querySelector('#mpUserSearch');
    const userListEl = bodyEl.querySelector('#mpUserList');
    if (searchInput) searchInput.addEventListener('input', e => { userSearch = e.target.value; renderUserList(); });
    bodyEl.querySelectorAll('[data-bulk]').forEach(btn => {
      btn.onclick = async () => {
        const act = btn.dataset.bulk;
        if (act === 'enter') { bulkMode = true; selectedUsers.clear(); renderBody(); return; }
        if (act === 'exit') { bulkMode = false; selectedUsers.clear(); renderBody(); return; }
        if (act === 'clear') { selectedUsers.clear(); renderBody(); return; }
        if (!selectedUsers.size) return mpToast({ title:'No users', msg:'Select at least one user', type:'warn' });
        const names = [...selectedUsers].filter(n => n.toLowerCase() !== (ME && ME.username ? ME.username.toLowerCase() : ''));
        if (names.length === 0) { mpToast({ title:'Cannot self-moderate', msg:'You cannot ban/mute/warn yourself', type:'warn' }); return; }
        const verb = act === 'mute' ? 'mute' : act === 'ban' ? 'ban' : 'warn';
        const ok = await sbConfirm({ icon: '👥', title: `Bulk ${verb}?`, message: `Apply ${verb} to ${names.length} user${names.length===1?'':'s'}?`, confirmText: `Yes, ${verb}`, confirmClass: act === 'ban' ? 'danger' : 'primary' });
        if (!ok) return;
        if (act === 'mute') { names.forEach(n => mpSafe(() => Auth.muteUser(n, 'Bulk mute', '1h'))); mpToast({ title:'Bulk muted', msg:`${names.length}`, type:'success' }); }
        else if (act === 'ban') { names.forEach(n => mpSafe(() => Auth.banUser(n, 'Bulk ban', '1d', { automated:false }))); mpToast({ title:'Bulk banned', msg:`${names.length}`, type:'error' }); }
        else if (act === 'warn') { names.forEach(n => mpSafe(() => Auth.warnUser(n, '[bulk] Rule violation', { automated:false }))); mpToast({ title:'Bulk warned', msg:`${names.length}`, type:'warn' }); }
        bulkMode = false; selectedUsers.clear(); safeRefresh();
      };
    });
    function renderUserList() {
      const q = userSearch.toLowerCase().trim();
      const filtered = list.filter(u => !q || (u.username||'').toLowerCase().includes(q) || (u.display||'').toLowerCase().includes(q));
      if (!filtered.length) { userListEl.innerHTML = '<div class="mod-empty">No users match.</div>'; return; }
      const bans = mpGetBans(); const warnings = mpGetWarnings(); const mutes = mpGetMutes(); const whitelist = mpGetWhitelist();
      const slow = mpGetSlowMode(); const frozen = mpGetFrozen(); const watched = mpGetWatched(); const ghost = mpGetGhostMode(); const settings = mpGetSettings();
      userListEl.innerHTML = filtered.map(u => {
        const banned = bans.users[u.username];
        const perm = banned && banned.expiresAt == null;
        const temporary = banned && banned.expiresAt != null && banned.expiresAt > Date.now();
        const muteEntry = mutes[u.username]; const muted = muteEntry && (muteEntry.until == null || muteEntry.until > Date.now());
        const warnCount = (warnings[u.username] || []).filter(w => w.at >= Date.now() - 86400000).length;
        const isFrozen = !!frozen[u.username]; const isWatched = !!watched[u.username]; const isGhost = !!ghost[u.username];
        const isWhitelisted = whitelist.includes(u.username);
        const slowEntry = slow[u.username]; const isSlow = slowEntry && slowEntry.seconds > 0;
        const online = mpSafe(() => window.isUserOnline?.(u.username), false);
        const isOwnerUser = u.role === 'owner'; const isModUser = u.role === 'mod';
        const canAct = !isOwnerUser && (window.AM_OWNER || !isModUser);
        const isSelected = selectedUsers.has(u.username);
        const badges = [
          perm ? '<span class="mod-badge perm">PERM BAN</span>' : '',
          temporary ? `<span class="mod-badge temp">${mpFmtDur(banned.expiresAt - Date.now())}</span>` : '',
          muted ? '<span class="mod-badge mute">MUTED</span>' : '',
          isFrozen ? '<span class="mod-badge frozen">FROZEN</span>' : '',
          isWatched ? '<span class="mod-badge warn">WATCHED</span>' : '',
          isGhost ? '<span class="mod-badge shadow">GHOST</span>' : '',
          isWhitelisted ? '<span class="mod-badge whitelist">TRUSTED</span>' : '',
          isSlow ? `<span class="mod-badge slow">SLOW ${slowEntry.seconds}s</span>` : '',
          warnCount ? `<span class="mod-badge warn">⚠ ${warnCount}</span>` : '',
        ].filter(Boolean).join('');
        return `
          <div class="mod-user-card ${banned?'is-banned':''} ${!canAct?'is-protected':''} ${bulkMode?'selectable':''}" data-user="${esc(u.username)}" role="button" tabindex="0">
            ${bulkMode && canAct ? `<div class="mod-user-checkbox ${isSelected?'on':''}"></div>` : ''}
            <div class="mod-user-avatar" style="background:${u.color||'#4d9dff'}">${esc(u.avatar||'??')}${online?'<span class="mod-user-online"></span>':''}</div>
            <div class="mod-user-info"><div class="mod-user-name">${esc(u.display||u.username)} ${window.roleBadgeFor?roleBadgeFor(u.username):''}</div><div class="mod-user-uname">@${esc(u.username)}${settings.showUserIdInList && u.id ? ' · ' + esc(u.id.slice(0,8)) : ''}</div>${badges?`<div class="mod-user-badges">${badges}</div>`:''}</div>
            <div class="mod-user-cta">${canAct && !bulkMode ? '<button class="mod-user-btn" aria-label="Actions" tabindex="-1" type="button">⋯</button>' : (!canAct?'<span class="mod-user-protected">🔒</span>':'')}</div>
          </div>`;
      }).join('');
      userListEl.querySelectorAll('.mod-user-card').forEach(card => {
        const handler = () => {
          const uname = card.dataset.user;
          const target = users[uname]; if (!target) return;
          const canAct = target.role !== 'owner' && (window.AM_OWNER || target.role !== 'mod');
          if (!canAct) { mpToast({ title:'Protected', msg:'Cannot moderate this user', type:'warn' }); return; }
          if (bulkMode) { if (selectedUsers.has(uname)) selectedUsers.delete(uname); else selectedUsers.add(uname); renderBody(); }
          else openUserActions(uname);
        };
        card.onclick = handler;
        card.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } };
      });
    }
    renderUserList();
    if (window.innerWidth > 900) setTimeout(() => searchInput?.focus(), 80);
  }

  function openUserActions(username) {
    const users = mpGetUsers(); const u = users[username];
    if (!u) return mpToast({ title:'User not found', msg:`@${username} no longer exists`, type:'error' });
    document.querySelectorAll('.mod-drill').forEach(d => d.remove());
    function snapshot() {
      const reports = mpGetReports(); const whitelist = mpGetWhitelist(); const slow = mpGetSlowMode(); const frozen = mpGetFrozen();
      const watched = mpGetWatched(); const ghost = mpGetGhostMode(); const pins = mpGetPins();
      const pinKey = [ME.username, username].sort().join('|');
      const bans = mpGetBans();
      const lastActions = (bans.history || []).filter(h => h.username === username);
      const lastAction = lastActions[lastActions.length - 1];
      return {
        isBanned: mpSafe(() => Auth.isUserBanned(username), false),
        banInfo: mpSafe(() => Auth.getBanInfo(username), null),
        isMuted: mpSafe(() => Auth.isUserMuted(username), false),
        muteInfo: mpSafe(() => Auth.getMuteInfo(username), null),
        warnInfo: mpSafe(() => Auth.getWarningInfo(username), null) || { count:0 },
        online: mpSafe(() => window.isUserOnline?.(username), false),
        isFrozen: !!frozen[username], frozenInfo: frozen[username],
        isWatched: !!watched[username], isGhost: !!ghost[username],
        isPinned: !!pins[pinKey],
        devices: window.IPBan && IPBan.lookupAll ? IPBan.lookupAll(username) : [],
        reportCount: reports.filter(r => r.target === username && !r.resolved).length,
        isWhitelisted: whitelist.includes(username),
        slow: slow[username], lastAction,
      };
    }
    const drill = document.createElement('div');
    drill.className = 'mod-drill';
    function actionItem(ico, title, desc, act, style = '') {
      return `<button class="mod-drill-action ${style}" data-act="${act}" type="button"><span class="mod-action-ico">${ico}</span><div class="mod-action-body"><div class="mod-action-title">${title}</div><div class="mod-action-desc">${desc}</div></div><span class="mod-action-arrow">›</span></button>`;
    }
    function buildBody() {
      const s = snapshot();
      const isModUser = u.role === 'mod'; const isOwnerUser = u.role === 'owner';
      const warnCount = (s.warnInfo && s.warnInfo.count) || 0;
      const canUndo = s.lastAction && ['ban','mute','warn','freeze','whitelist'].includes(s.lastAction.action);
      return `
        <div class="mod-drill-status">
          <div class="mod-drill-stat ${s.isBanned?'danger':'ok'}"><div class="mod-drill-stat-ico">${s.isBanned?'🚫':'✓'}</div><div class="mod-drill-stat-label">${s.isBanned?'Banned':'Active'}</div><div class="mod-drill-stat-sub">${s.isBanned && s.banInfo?(s.banInfo.permanent?'Permanent':s.banInfo.remainingLabel||'—'):'Good standing'}</div></div>
          <div class="mod-drill-stat ${s.isMuted?'warn':'ok'}"><div class="mod-drill-stat-ico">${s.isMuted?'🔇':'🔊'}</div><div class="mod-drill-stat-label">${s.isMuted?'Muted':'Not muted'}</div><div class="mod-drill-stat-sub">${s.isMuted && s.muteInfo?(s.muteInfo.permanent?'Permanent':s.muteInfo.remainingLabel||'—'):'—'}</div></div>
          <div class="mod-drill-stat ${s.isFrozen?'danger':warnCount>=3?'danger':warnCount?'warn':'ok'}"><div class="mod-drill-stat-ico">${s.isFrozen?'🧊':'⚠'}</div><div class="mod-drill-stat-label">${s.isFrozen?'Frozen':`${warnCount} warn${warnCount===1?'':'s'}`}</div><div class="mod-drill-stat-sub">${s.isFrozen?'Locked':warnCount>=3?'Danger':'24h window'}</div></div>
        </div>
        <div class="mod-drill-body">
          <div class="mod-drill-section"><div class="mod-drill-section-label">Account</div>
            ${actionItem('💬','Send Message','Open DM chat','dm')}
            ${actionItem('💌','Mod DM','Send a moderator message','modDM','accent')}
            ${actionItem('🔔','Notify','Send a toast to their screen','notify')}
            ${actionItem('🚪','Kick','Force sign-out of this session','kick')}
            ${actionItem('🔐','Force Sign-Out','Sign out ALL their devices','forceSignout')}
            ${actionItem('🔄','Force Reload Tabs','Tell all their tabs to reload','forceReload')}
            ${actionItem('🔑','Reset Password','Force password reset on next login','resetPassword','amber')}
          </div>
          <div class="mod-drill-section"><div class="mod-drill-section-label">Enforcement</div>
            ${s.isBanned ? actionItem('✓','Lift Ban','Unban this user','unban','success') : actionItem('🚫','Ban User','Choose duration and reason','ban','danger')}
            ${s.isMuted ? actionItem('🔊','Unmute','Restore their ability to chat','unmute','cyan') : actionItem('🔇','Mute','Lock them out of chat','mute','cyan')}
            ${actionItem('⚠','Warn','Issue a warning (3 → auto-ban)','warn','amber')}
            ${s.isFrozen ? actionItem('☀','Unfreeze','Restore full access','unfreeze','success') : actionItem('🧊','Freeze User','Read-only locked state','freeze','purple')}
            ${actionItem('🐢', s.slow && s.slow.seconds > 0 ? `Slow Mode: ${s.slow.seconds}s` : 'Slow Mode','Rate limit their messages','slowMode','cyan')}
            ${actionItem('🤫','Shadow Mute','Silent mute — they won\'t know','shadowMute','purple')}
          </div>
          <div class="mod-drill-section"><div class="mod-drill-section-label">Content</div>
            ${actionItem('🗑','Purge Messages','Delete all messages they sent','purge','danger')}
            ${actionItem('📌', s.isPinned ? 'Unpin Message' : 'Pin Message', s.isPinned ? 'Remove pinned message' : 'Pin a message at top of chat','pin','accent')}
            ${actionItem('🧹','Clear Chat History','Delete entire chat thread with this user','clearChat','danger')}
            ${s.reportCount > 0 ? actionItem('🚩','View Reports',`${s.reportCount} unresolved report${s.reportCount===1?'':'s'}`,'reports','danger') : ''}
          </div>
          <div class="mod-drill-section"><div class="mod-drill-section-label">History & Recovery</div>
            ${actionItem('📜','Timeline','View all moderator actions','timeline','accent')}
            ${canUndo ? actionItem('↩','Undo Last Action',`Reverse: ${s.lastAction.action}`,'undoLast','amber') : ''}
            ${actionItem('⚡','Escalate','Auto-apply next escalation step','escalate','amber')}
            ${actionItem('📥','Export User Data','Download JSON of all mod actions on them','exportData','success')}
          </div>
          <div class="mod-drill-section"><div class="mod-drill-section-label">Device Bans</div>
            ${actionItem('👤','Ban Username','Block this account only','banUsername','danger')}
            ${actionItem('🔑','Ban Hardware Only','Block device fingerprint','banHardware','purple')}
            ${actionItem('🌐','Ban IP + Hardware','Full device + IP ban','banIP','danger')}
            ${actionItem('📱','View Devices',`${s.devices.length} device${s.devices.length===1?'':'s'} registered`,'sessions','accent')}
            ${s.devices.length > 1 ? actionItem('🛑','Ban ALL Devices',`Block all ${s.devices.length} known devices`,'banAllDevices','danger') : ''}
          </div>
          <div class="mod-drill-section"><div class="mod-drill-section-label">Advanced</div>
            ${s.isWatched ? actionItem('☀','Unwatch User','Stop monitoring this user','unwatch','success') : actionItem('👁','Watch User','Flag for monitoring','watch','warn')}
            ${s.isGhost ? actionItem('👤','Un-ghost User','Show them in online list','unghost','success') : actionItem('👻','Ghost User','Hide them from online list','ghost','shadow')}
            ${actionItem('📝','Mod Notes','Internal notes only staff see','notes','purple')}
            ${s.isWhitelisted ? actionItem('🔓','Remove from Whitelist','No longer exempt','unwhitelist','cyan') : actionItem('⭐','Verify User','Add to whitelist (trusted)','whitelist','success')}
            ${actionItem('♻️','Reset Profile','Clear their bio, avatar, display name','resetProfile','amber')}
          </div>
          ${warnCount > 0 || s.isBanned ? `<div class="mod-drill-section"><div class="mod-drill-section-label">Cleanup</div>
            ${warnCount > 0 ? actionItem('🧹','Manage Warnings',`${warnCount} warning${warnCount===1?'':'s'}`,'manageWarns') : ''}
            ${s.isBanned ? actionItem('⏱','Extend Ban','Add more time','extendBan') : ''}
          </div>` : ''}
          ${window.AM_OWNER ? `<div class="mod-drill-section"><div class="mod-drill-section-label">Role</div>
            ${isModUser ? actionItem('👤','Demote to User','Remove mod privileges','demote') : (isOwnerUser ? '' : actionItem('👑','Promote to Mod','Grant moderation powers','promote'))}
          </div>` : ''}
        </div>`;
    }
    const s0 = snapshot();
    drill.innerHTML = `
      <div class="mod-drill-card" role="dialog" aria-modal="true">
        <div class="mod-drill-head">
          <button class="mod-drill-back" aria-label="Back" type="button">‹</button>
          <div class="mod-drill-avatar" style="background:${u.color||'#4d9dff'}">${esc(u.avatar||'??')}${s0.online?'<span class="mod-drill-online"></span>':''}</div>
          <div class="mod-drill-info"><div class="mod-drill-name">${esc(u.display||u.username)} ${window.roleBadgeFor?roleBadgeFor(u.username):''}</div><div class="mod-drill-uname">@${esc(u.username)}</div></div>
          <button class="mod-drill-close" aria-label="Close" type="button">×</button>
        </div>
        <div id="mpDrillContent">${buildBody()}</div>
      </div>`;
    document.body.appendChild(drill);
    function refreshDrill() { if (!document.body.contains(drill)) return; const c = drill.querySelector('#mpDrillContent'); if (c) c.innerHTML = buildBody(); wireActions(); }
    function closeDrill() { drill.remove(); }
    function wireActions() {
      drill.querySelectorAll('[data-act]').forEach(btn => {
        btn.onclick = async (ev) => {
          ev.stopPropagation();
          const act = btn.dataset.act;
          if (act === 'dm') { closeDrill(); closePanel(); window.App?.chatWith(username); }
          else if (act === 'modDM') { openModDMDialog(username, true); }
          else if (act === 'notify') {
            const raw = await window.sbPrompt?.({ icon:'🔔', title:'Send notification', label:'Message', value:'A moderator wants to talk to you', confirmText:'Send' });
            const msgText = (typeof raw === 'string') ? raw : (raw && (raw.value || raw.text)) || '';
            if (!msgText) return;
            window.RT?.emit?.('direct-notify', { from: ME.username, to: username, msg: String(msgText).slice(0, 200) });
            mpToast({ title:'Notified', msg:'@'+username, type:'success' });
          }
          else if (act === 'kick') {
            const raw = await window.sbPrompt?.({ icon:'🚪', title:'Kick user', label:'Reason', value:'Kicked by moderator', confirmText:'Kick', confirmClass:'danger' });
            if (raw == null) return;
            const reason = (typeof raw === 'string') ? raw : (raw && (raw.value || raw.text)) || '';
            window.RT?.kick?.(username, reason || 'Kicked by moderator');
            mpLogAction('kick', username, { reason: reason || 'Kicked by moderator' });
            mpToast({ title:'Kick sent', msg:'@'+username, type:'warn' });
          }
          else if (act === 'forceSignout') { forceSignoutUser(username); closeDrill(); }
          else if (act === 'forceReload') {
            try { window.RT?.emit?.('force-reload', { username }); window.appChannel?.postMessage({ type: 'force-reload', username }); } catch (e) {}
            mpLogAction('force-reload', username, {});
            mpToast({ title:'Reload sent', msg:'@'+username+' · tabs will refresh', type:'warn' });
          }
          else if (act === 'resetPassword') {
            const ok = await sbConfirm({ icon:'🔑', title:'Force password reset?', message:`Reset @${username}'s password? They must set a new one on next login.`, confirmText:'Reset', confirmClass:'danger' });
            if (!ok) return;
            try {
              const users2 = Auth.getUsers();
              if (users2[username]) {
                users2[username].hash = 'RESET_REQUIRED_' + Math.random().toString(36).slice(2, 8);
                users2[username].salt = 'reset';
                Auth.saveUsers(users2);
                mpLogAction('reset-password', username, {});
                mpToast({ title:'Password reset', msg:'@'+username+' must reset on next login', type:'success' });
              }
            } catch (e) { mpToast({ title:'Error', msg:e.message, type:'error' }); }
            refreshDrill(); safeRefresh();
          }
          else if (act === 'ban') { openBanDialog(username, () => { refreshDrill(); safeRefresh(); }, true); }
          else if (act === 'unban') { mpSafe(() => Auth.unbanUser(username)); window.RT?.banCleared?.(username); mpLogAction('unban', username, {}); mpToast({ title:'Unbanned', msg:'@'+username, type:'success' }); refreshDrill(); safeRefresh(); }
          else if (act === 'mute') { openMuteDialog(username, () => { refreshDrill(); safeRefresh(); }, true); }
          else if (act === 'unmute') { mpSafe(() => Auth.unmuteUser(username)); mpLogAction('unmute', username, {}); mpToast({ title:'Unmuted', msg:'@'+username, type:'success' }); refreshDrill(); safeRefresh(); }
          else if (act === 'warn') { openWarnDialog(username, () => { refreshDrill(); safeRefresh(); }, true); }
          else if (act === 'freeze' || act === 'unfreeze') { openFreezeDialog(username, () => { refreshDrill(); safeRefresh(); }, true); }
          else if (act === 'shadowMute') {
            const raw = await window.sbPrompt?.({ icon:'🤫', title:'Shadow mute', label:'Reason', value:'Silent moderation', confirmText:'Next' });
            if (raw == null) return;
            const reason = (typeof raw === 'string') ? raw : (raw && (raw.value || raw.text)) || 'Silent moderation';
            const durRaw = await window.sbChoose?.({ icon:'⏱', title:'Duration', options:[
              {value:'5m',label:'5 minutes'},{value:'15m',label:'15 minutes'},{value:'1h',label:'1 hour'},
              {value:'6h',label:'6 hours'},{value:'1d',label:'1 day'},{value:'7d',label:'7 days'},{value:'perm',label:'Permanent'}
            ]});
            const dur = (typeof durRaw === 'string') ? durRaw : (durRaw && durRaw.value) || '';
            if (!dur) return;
            try {
              const mutes = Auth.getMutes ? Auth.getMutes() : mpGetMutes();
              const durMs = { '5m': 5*60000, '15m': 15*60000, '1h': 3600000, '6h': 21600000, '1d': 86400000, '7d': 604800000, 'perm': null }[dur];
              mutes[username] = { reason: reason || 'Silent moderation', mutedAt: Date.now(), mutedBy: ME.username, until: durMs == null ? null : Date.now() + durMs, permanent: durMs == null, shadow: true };
              if (Auth.saveMutes) Auth.saveMutes(mutes); else mpWrite('sb44_mutes', mutes);
              mpLogAction('shadow-mute', username, { reason: reason, duration: dur });
              mpToast({ title:'Shadow muted', msg:'@'+username, type:'purple' });
              refreshDrill(); safeRefresh();
            } catch (e) { mpToast({ title:'Error', msg:e.message, type:'error' }); }
          }
          else if (act === 'clearChat') {
            const ok = await sbConfirm({ icon:'🧹', title:'Delete entire chat history?', message:`Delete full conversation with @${username}?`, confirmText:'Delete', confirmClass:'danger' });
            if (!ok) return;
            try {
              const key = 'sb26_chat_' + [ME.username, username].sort().join('__');
              localStorage.removeItem(key);
              mpLogAction('clear-chat', username, { reason: 'Full thread deleted' });
              mpToast({ title:'Chat cleared', msg:'@'+username, type:'success' });
            } catch (e) { mpToast({ title:'Error', msg:e.message, type:'error' }); }
          }
          else if (act === 'exportData') {
            try {
              const bans2 = mpGetBans(); const warnings2 = mpGetWarnings(); const mutes2 = mpGetMutes(); const notes2 = mpGetModNotes();
              const watched2 = mpGetWatched(); const frozen2 = mpGetFrozen();
              const auditFiltered = (bans2.history || []).filter(h => h.username === username);
              const dump = { username, exportedAt: new Date().toISOString(), exportedBy: ME.username, user: mpGetUsers()[username] || {}, bans: bans2.users[username] || null, warnings: warnings2[username] || [], mute: mutes2[username] || null, frozen: frozen2[username] || null, watched: watched2[username] || null, notes: notes2[username] || [], auditHistory: auditFiltered, devices: (window.IPBan && IPBan.lookupAll) ? IPBan.lookupAll(username) : [] };
              const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `safebeef-user-${username}-${Date.now()}.json`; a.click();
              mpLogAction('export-user', username, {});
              mpToast({ title:'Exported', msg:`Full data for @${username}`, type:'success' });
            } catch (e) { mpToast({ title:'Export failed', msg:e.message, type:'error' }); }
          }
          else if (act === 'manageWarns') { openWarningManager(username, () => { refreshDrill(); safeRefresh(); }, true); }
          else if (act === 'extendBan') { openExtendBanDialog(username, () => { refreshDrill(); safeRefresh(); }, true); }
          else if (act === 'banUsername') { openBanUsernameDialog(username, () => safeRefresh(), true); }
          else if (act === 'banHardware') { openBanHardwareDialog(username, () => safeRefresh(), true); }
          else if (act === 'banIP') { openBanIPDialog(null, { targetUser: username, onBack: true, onDone: () => safeRefresh() }); }
          else if (act === 'banAllDevices') { openBanAllDevicesDialog(username, () => safeRefresh(), true); }
          else if (act === 'sessions') { openSessionsViewer(username, true); }
          else if (act === 'slowMode') { openRateLimitDialog(username, () => { refreshDrill(); safeRefresh(); }, true); }
          else if (act === 'purge') { openPurgeDialog(username, () => safeRefresh(), true); }
          else if (act === 'pin') { openPinDialog(username, () => { refreshDrill(); safeRefresh(); }, true); }
          else if (act === 'reports') { closeDrill(); activeTab = 'reports'; renderTabs(); renderBody(); }
          else if (act === 'timeline') { openTimelineDialog(username, true); }
          else if (act === 'undoLast') { undoLastAction(username, () => { refreshDrill(); safeRefresh(); }); }
          else if (act === 'escalate') { openEscalateDialog(username, () => { refreshDrill(); safeRefresh(); }, true); }
          else if (act === 'watch') {
            const raw = await window.sbPrompt?.({ icon:'👁', title:'Watch user', label:'Reason (optional)', value:'', confirmText:'Watch' });
            if (raw == null) return;
            const reason = (typeof raw === 'string') ? raw : (raw && (raw.value || raw.text)) || '';
            const w = mpGetWatched();
            w[username] = { at: Date.now(), atLocal: new Date().toLocaleString(), by: ME.username, reason: reason || '' };
            mpSetWatched(w);
            mpLogAction('watch', username, { reason });
            mpToast({ title:'Now watching', msg:'@'+username, type:'warn' });
            refreshDrill(); safeRefresh();
          }
          else if (act === 'unwatch') { const w = mpGetWatched(); delete w[username]; mpSetWatched(w); mpToast({ title:'Unwatched', msg:'@'+username, type:'success' }); refreshDrill(); safeRefresh(); }
          else if (act === 'ghost') {
            const g = mpGetGhostMode(); g[username] = { at: Date.now(), by: ME.username }; mpSetGhostMode(g);
            mpLogAction('ghost', username, {});
            mpToast({ title:'Ghosted', msg:'@'+username+' hidden from online', type:'purple' });
            refreshDrill(); safeRefresh();
          }
          else if (act === 'unghost') { const g = mpGetGhostMode(); delete g[username]; mpSetGhostMode(g); mpToast({ title:'Un-ghosted', msg:'@'+username, type:'success' }); refreshDrill(); safeRefresh(); }
          else if (act === 'whitelist') {
            const wl = mpGetWhitelist(); if (!wl.includes(username)) wl.push(username);
            mpWrite('sb26_whitelist', wl);
            mpLogAction('whitelist', username, { reason:'Verified / trusted' });
            mpToast({ title:'Verified', msg:'@'+username+' added to whitelist', type:'success' });
            refreshDrill(); safeRefresh();
          }
          else if (act === 'unwhitelist') {
            const wl = mpGetWhitelist().filter(n => n !== username);
            mpWrite('sb26_whitelist', wl);
            mpLogAction('unwhitelist', username, {});
            mpToast({ title:'Removed', msg:'@'+username, type:'warn' });
            refreshDrill(); safeRefresh();
          }
          else if (act === 'resetProfile') {
            const ok = await sbConfirm({ icon:'♻️', title:'Reset profile?', message:`Reset @${username}'s bio, avatar, display name, and color?`, confirmText:'Reset', confirmClass:'danger' });
            if (!ok) return;
            try {
              const users2 = Auth.getUsers();
              if (users2[username]) {
                users2[username].bio = ''; users2[username].avatar = username.slice(0,2).toUpperCase();
                users2[username].display = username; users2[username].color = '#4d9dff';
                Auth.saveUsers(users2);
                mpLogAction('reset-profile', username, {});
                mpToast({ title:'Profile reset', msg:'@'+username, type:'success' });
              }
            } catch (e) { mpToast({ title:'Error', msg:e.message, type:'error' }); }
            refreshDrill(); safeRefresh();
          }
          else if (act === 'notes') { openModNotes(username, true); }
          else if (act === 'promote') { if (mpSafe(() => Auth.setRole(username, 'mod'), false)) mpToast({ title:'Promoted', msg:`@${username} is now a mod`, type:'success' }); refreshDrill(); safeRefresh(); }
          else if (act === 'demote') { if (mpSafe(() => Auth.setRole(username, 'user'), false)) mpToast({ title:'Demoted', msg:'@'+username, type:'success' }); refreshDrill(); safeRefresh(); }
        };
      });
    }
    wireActions();
    drill.querySelector('.mod-drill-close').onclick = closeDrill;
    drill.querySelector('.mod-drill-back').onclick = closeDrill;
    drill.addEventListener('click', e => { if (e.target === drill) closeDrill(); });
    const unsubs = [];
    if (window.Live) {
      ['userList','bans','mutes','warnings','onlineUsers','modPanel','frozen'].forEach(t => { const off = Live.on(t, refreshDrill); if (typeof off === 'function') unsubs.push(off); });
    }
    const obs = new MutationObserver(() => { if (!document.body.contains(drill)) { unsubs.forEach(fn => fn()); obs.disconnect(); } });
    obs.observe(document.body, { childList:true });
  }

  function renderReports() {
    const reports = mpGetReports().slice().reverse();
    const users = mpGetUsers();
    if (!reports.length) { bodyEl.innerHTML = `<div class="mod-empty-large"><div class="mod-empty-ico">🚩</div><div class="mod-empty-title">No reports</div><div class="mod-empty-desc">No user reports have been filed yet.</div></div>`; return; }
    bodyEl.innerHTML = `<div class="mod-list">${reports.map(r => {
      const user = users[r.target] || {};
      const canDrill = !!(user && user.username && user.role !== 'owner');
      return `<div class="mod-report-card ${r.resolved?'resolved':''}">
        <div class="mod-list-avatar" style="background:${user.color||'#666'}">${esc(user.avatar||'??')}</div>
        <div class="mod-report-body">
          <div class="mod-report-head"><span class="mod-list-name">${esc(user.display||r.target)}</span>${r.resolved?'<span class="mod-badge success">RESOLVED</span>':'<span class="mod-badge perm">PENDING</span>'}</div>
          <div class="mod-report-reason">${esc(r.reason)}</div>
          <div class="mod-report-meta">Reported by @${esc(r.reporter)} · ${new Date(r.at).toLocaleString()}</div>
          ${r.reportedMessage?`<div class="mod-report-meta" style="margin-top:4px;padding:6px 8px;background:var(--bg);border-radius:6px;color:var(--text-2);font-family:var(--sans);">"${esc(r.reportedMessage)}"</div>`:''}
          ${r.resolved
            ? `<div class="mod-report-actions">${canDrill?`<button class="mod-action-btn accent" data-report-action="view" data-report-id="${esc(r.id)}" type="button">View User ›</button>`:''}</div>`
            : `<div class="mod-report-actions">
                ${canDrill?`<button class="mod-action-btn accent" data-report-action="view" data-report-id="${esc(r.id)}" type="button">View User ›</button>`:''}
                <button class="mod-action-btn danger" data-report-action="ban" data-report-id="${esc(r.id)}" type="button">Ban</button>
                <button class="mod-action-btn cyan" data-report-action="mute" data-report-id="${esc(r.id)}" type="button">Mute</button>
                <button class="mod-action-btn amber" data-report-action="warn" data-report-id="${esc(r.id)}" type="button">Warn</button>
                <button class="mod-action-btn success" data-report-action="dismiss" data-report-id="${esc(r.id)}" type="button">Dismiss</button>
              </div>`}
        </div>
      </div>`;
    }).join('')}</div>`;
    bodyEl.querySelectorAll('[data-report-action]').forEach(btn => {
      btn.onclick = () => {
        const reportId = btn.dataset.reportId;
        const freshReports = mpGetReports();
        const report = freshReports.find(x => x.id === reportId);
        if (!report) return mpToast({ title:'Report not found', msg:'It may have been cleared', type:'warn' });
        const act = btn.dataset.reportAction;
        const markResolved = () => { report.resolved = true; report.resolvedAt = Date.now(); report.resolvedAtLocal = new Date().toLocaleString(); report.resolvedBy = ME.username; mpWrite('sb26_reports', freshReports); };
        if (act === 'view') { openUserActions(report.target); }
        else if (act === 'dismiss') { markResolved(); mpToast({ title:'Dismissed', msg:'Report closed', type:'success' }); renderReports(); }
        else if (act === 'ban') { openBanDialog(report.target, () => { markResolved(); renderReports(); safeRefresh(); }, true); }
        else if (act === 'mute') { openMuteDialog(report.target, () => { markResolved(); renderReports(); safeRefresh(); }, true); }
        else if (act === 'warn') { openWarnDialog(report.target, () => { markResolved(); renderReports(); safeRefresh(); }, true); }
      };
    });
  }

  function renderBans() {
    const bans = mpGetBans(); const users = mpGetUsers();
    const list = Object.entries(bans.users || {}).filter(([,e]) => e && (e.expiresAt == null || e.expiresAt > Date.now()));
    if (!list.length) { bodyEl.innerHTML = `<div class="mod-empty-large"><div class="mod-empty-ico">🎉</div><div class="mod-empty-title">No active account bans</div><div class="mod-empty-desc">Everyone is behaving.</div></div>`; return; }
    bodyEl.innerHTML = `<div class="mod-list">${list.map(([username, entry]) => {
      const user = users[username] || {};
      const perm = entry.expiresAt == null;
      const remaining = perm ? 'Permanent' : mpFmtDur(entry.expiresAt - Date.now());
      return `<div class="mod-list-card danger">
        <div class="mod-list-avatar" style="background:${user.color||'#666'}">${esc(user.avatar||'??')}</div>
        <div class="mod-list-info">
          <div class="mod-list-name">${esc(user.display||username)} <span class="mod-badge ${perm?'perm':'temp'}">${perm?'PERM':remaining}</span></div>
          <div class="mod-list-meta"><span>@${esc(username)}</span><span class="mod-list-reason">${esc(entry.reason||'—')}</span><span>since ${esc(new Date(entry.bannedAt).toLocaleString())}</span></div>
        </div>
        <div class="mod-list-actions">
          <button class="mod-action-btn accent" data-act="view" data-user="${esc(username)}" type="button">Actions ›</button>
          <button class="mod-action-btn success" data-act="unban" data-user="${esc(username)}" type="button">Unban</button>
          <button class="mod-action-btn" data-act="extend" data-user="${esc(username)}" type="button">Extend</button>
        </div>
      </div>`;
    }).join('')}</div>`;
    bodyEl.querySelectorAll('[data-act="view"]').forEach(btn => { btn.onclick = ev => { ev.stopPropagation(); openUserActions(btn.dataset.user); }; });
    bodyEl.querySelectorAll('[data-act="unban"]').forEach(btn => { btn.onclick = ev => { ev.stopPropagation(); mpSafe(() => Auth.unbanUser(btn.dataset.user)); window.RT?.banCleared?.(btn.dataset.user); mpLogAction('unban', btn.dataset.user, {}); mpToast({ title:'Unbanned', msg:'@'+btn.dataset.user, type:'success' }); safeRefresh(); }; });
    bodyEl.querySelectorAll('[data-act="extend"]').forEach(btn => { btn.onclick = ev => { ev.stopPropagation(); openExtendBanDialog(btn.dataset.user, () => safeRefresh(), true); }; });
  }

  function renderDeviceBans() {
    const ipList = mpGetIPBans(); const hwList = mpGetHWBans(); const settings = mpGetSettings();
    const selfIP = window.IPBan ? (window.IPBan.getIPSync() || '…') : '—';
    const selfFP = window.IPBan ? (window.IPBan.getFingerprintSync() || '…') : '—';
    const headerHtml = `
      <div class="mod-devices-header">
        <div class="mod-devices-self">
          <div class="mod-devices-self-row"><span class="mod-devices-self-label">Your IP</span><code class="mod-devices-self-val">${esc(selfIP)}</code></div>
          ${settings.showFingerprints ? `<div class="mod-devices-self-row"><span class="mod-devices-self-label">HW Fingerprint</span><code class="mod-devices-self-val mod-devices-self-fp" title="${esc(selfFP)}">${esc(selfFP.slice(0,24))}${selfFP.length > 24 ? '…' : ''}</code></div>` : ''}
        </div>
        <div class="mod-devices-toolbar"><div class="mod-search-wrap" style="flex:1"><span class="mod-search-ico">🔍</span><input type="search" class="mod-search-input" id="mpIPSearch" placeholder="Search IP / fingerprint / reason…" autocomplete="off" value="${esc(ipSearch)}"></div></div>
        <div class="mod-devices-btns">
          <button class="mod-devices-btn danger" id="mpIPBanNew" type="button"><span class="mod-devices-btn-ico">🌐</span><span class="mod-devices-btn-body"><span class="mod-devices-btn-title">Ban IP / Range</span><span class="mod-devices-btn-desc">Block by IP or CIDR</span></span></button>
          <button class="mod-devices-btn purple" id="mpHWBanNew" type="button"><span class="mod-devices-btn-ico">🔑</span><span class="mod-devices-btn-body"><span class="mod-devices-btn-title">Ban Hardware</span><span class="mod-devices-btn-desc">Block by fingerprint</span></span></button>
        </div>
      </div>`;
    const q = ipSearch.toLowerCase().trim();
    const filteredIPs = ipList.filter(([ip, e]) => !q || ip.toLowerCase().includes(q) || (e.reason || '').toLowerCase().includes(q) || (e.bannedBy || '').toLowerCase().includes(q));
    const filteredHWs = hwList.filter(([k, e]) => !q || (e.fingerprint || '').toLowerCase().includes(q) || k.toLowerCase().includes(q) || (e.reason || '').toLowerCase().includes(q));
    let body = headerHtml;
    if (filteredIPs.length) {
      body += `<div class="mod-devices-section">
        <div class="mod-devices-section-head"><span class="mod-devices-section-ico">🌐</span><span class="mod-devices-section-title">IP Bans</span><span class="mod-devices-section-count">${filteredIPs.length}</span></div>
        <div class="mod-devices-grid">${filteredIPs.map(([ip, entry]) => {
          const perm = entry.expiresAt == null;
          const remaining = perm ? 'Permanent' : mpFmtDur(entry.expiresAt - Date.now());
          const isSelf = selfIP === ip; const fp = entry.fingerprint || '';
          const bannedDate = entry.bannedAt ? new Date(entry.bannedAt).toLocaleString() : '—';
          return `<div class="mod-device-card danger ${isSelf ? 'is-self' : ''}">
            <div class="mod-device-card-top"><div class="mod-device-card-icon">🌐</div>
              <div class="mod-device-card-info">
                <div class="mod-device-card-title"><code>${esc(ip)}</code>${isSelf ? '<span class="mod-device-tag danger">THIS DEVICE</span>' : ''}</div>
                <div class="mod-device-card-meta"><span class="mod-device-badge ${perm ? 'perm' : 'temp'}">${perm ? 'PERM' : remaining}</span>${entry.bannedBy ? `<span class="mod-device-meta-item">by @${esc(entry.bannedBy)}</span>` : ''}</div>
              </div>
            </div>
            <div class="mod-device-card-body">
              <div class="mod-device-row"><span class="mod-device-row-label">Reason</span><span class="mod-device-row-val">${esc(entry.reason || '—')}</span></div>
              <div class="mod-device-row"><span class="mod-device-row-label">Banned</span><span class="mod-device-row-val mono">${esc(bannedDate)}</span></div>
              ${settings.showFingerprints && fp ? `<div class="mod-device-row"><span class="mod-device-row-label">FP</span><span class="mod-device-row-val mono" title="${esc(fp)}">${esc(fp.slice(0, 20))}…</span></div>` : ''}
            </div>
            <div class="mod-device-card-actions">
              <button class="mod-device-btn" data-act="ip-extend" data-ip="${esc(ip)}" type="button">⏱ Extend</button>
              <button class="mod-device-btn success" data-act="ip-unban" data-ip="${esc(ip)}" type="button">✓ Unban</button>
            </div>
          </div>`;
        }).join('')}</div>
      </div>`;
    }
    if (filteredHWs.length) {
      body += `<div class="mod-devices-section">
        <div class="mod-devices-section-head"><span class="mod-devices-section-ico">🔑</span><span class="mod-devices-section-title">Hardware Bans</span><span class="mod-devices-section-count">${filteredHWs.length}</span></div>
        <div class="mod-devices-grid">${filteredHWs.map(([k, entry]) => {
          const perm = entry.expiresAt == null;
          const remaining = perm ? 'Permanent' : mpFmtDur(entry.expiresAt - Date.now());
          const fp = entry.fingerprint || k.replace(/^FP:/, '');
          const isSelf = selfFP === fp;
          const bannedDate = entry.bannedAt ? new Date(entry.bannedAt).toLocaleString() : '—';
          return `<div class="mod-device-card purple ${isSelf ? 'is-self' : ''}">
            <div class="mod-device-card-top"><div class="mod-device-card-icon">🔑</div>
              <div class="mod-device-card-info">
                <div class="mod-device-card-title"><code>${esc(fp.slice(0, 24))}${fp.length > 24 ? '…' : ''}</code>${isSelf ? '<span class="mod-device-tag danger">THIS DEVICE</span>' : ''}</div>
                <div class="mod-device-card-meta"><span class="mod-device-badge ${perm ? 'perm' : 'temp'}">${perm ? 'PERM' : remaining}</span>${entry.bannedBy ? `<span class="mod-device-meta-item">by @${esc(entry.bannedBy)}</span>` : ''}</div>
              </div>
            </div>
            <div class="mod-device-card-body">
              <div class="mod-device-row"><span class="mod-device-row-label">Reason</span><span class="mod-device-row-val">${esc(entry.reason || '—')}</span></div>
              <div class="mod-device-row"><span class="mod-device-row-label">Banned</span><span class="mod-device-row-val mono">${esc(bannedDate)}</span></div>
            </div>
            <div class="mod-device-card-actions"><button class="mod-device-btn success" data-act="hw-unban" data-hw="${esc(fp)}" type="button">✓ Unban</button></div>
          </div>`;
        }).join('')}</div>
      </div>`;
    }
    if (!filteredIPs.length && !filteredHWs.length) {
      const isFiltered = (ipList.length + hwList.length) > 0;
      body += `<div class="mod-empty-large" style="margin-top:14px"><div class="mod-empty-ico">${isFiltered ? '🔍' : '🌐'}</div><div class="mod-empty-title">${isFiltered ? 'No matches' : 'No device bans'}</div><div class="mod-empty-desc">${isFiltered ? 'Nothing matches your search.' : 'Use the buttons above to ban an IP, a range, or a hardware fingerprint.'}</div></div>`;
    }
    bodyEl.innerHTML = body;
    wireIPSearch(); wireNewIPBan();
    bodyEl.querySelectorAll('[data-act="ip-unban"]').forEach(btn => {
      btn.onclick = ev => { ev.stopPropagation(); const ip = btn.dataset.ip; const entry = window.IPBan.isBanned(ip); window.IPBan.unban(ip, { fingerprint: entry && entry.fingerprint }); mpToast({ title: 'IP unbanned', msg: ip, type: 'success' }); mpBeep(900, 0.1, 'sine', 0.06); safeRefresh(); };
    });
    bodyEl.querySelectorAll('[data-act="ip-extend"]').forEach(btn => { btn.onclick = ev => { ev.stopPropagation(); openExtendIPBanDialog(btn.dataset.ip, () => safeRefresh(), true); }; });
    bodyEl.querySelectorAll('[data-act="hw-unban"]').forEach(btn => {
      btn.onclick = ev => { ev.stopPropagation(); const fp = btn.dataset.hw; const res = window.IPBan.unban('FP:' + fp, { fingerprint: fp, reason: 'Hardware unban' }); mpToast({ title: res ? 'Hardware unbanned' : 'Not found', msg: fp.slice(0, 16) + '…', type: res ? 'success' : 'warn' }); mpBeep(900, 0.1, 'sine', 0.06); safeRefresh(); };
    });
  }

  function wireIPSearch() {
    const searchEl = bodyEl.querySelector('#mpIPSearch'); if (!searchEl) return;
    searchEl.addEventListener('input', e => {
      ipSearch = e.target.value;
      const pos = e.target.selectionStart;
      renderDeviceBans();
      const again = bodyEl.querySelector('#mpIPSearch');
      if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (err) {} }
    });
  }
  function wireNewIPBan() {
    const btn = bodyEl.querySelector('#mpIPBanNew');
    if (btn) btn.onclick = async () => {
      const raw = await window.sbPrompt?.({ icon:'🌐', title:'Ban IP or range', label:'IP or CIDR range', placeholder:'192.168.1.1 or 10.0.0.0/24', confirmText:'Next', required:true });
      const input = (typeof raw === 'string') ? raw : (raw && (raw.value || raw.text)) || '';
      if (!input) return;
      const reasonRaw = await window.sbPrompt?.({ icon:'📝', title:'Reason', label:'Reason for ban', value:'Manual IP ban', confirmText:'Next' });
      const reason = (typeof reasonRaw === 'string') ? reasonRaw : (reasonRaw && (reasonRaw.value || reasonRaw.text)) || 'Manual IP ban';
      const durRaw = await window.sbChoose?.({ icon:'⏱', title:'Duration', options:[
        {value:'1h',label:'1 hour'},{value:'6h',label:'6 hours'},{value:'1d',label:'1 day'},
        {value:'3d',label:'3 days'},{value:'7d',label:'7 days'},{value:'30d',label:'30 days'},{value:'perm',label:'Permanent'}
      ]});
      const duration = (typeof durRaw === 'string') ? durRaw : (durRaw && durRaw.value) || '';
      if (!duration) return;
      if (!window.IPBan) return;
      try { window.IPBan.ban(input, { reason, duration, bannedBy: ME.username }); mpToast({ title:'IP banned', msg:input, type:'success' }); }
      catch (e) { mpToast({ title:'Cannot ban', msg:e.message, type:'error' }); return; }
      safeRefresh();
    };
    const hwBtn = bodyEl.querySelector('#mpHWBanNew');
    if (hwBtn) hwBtn.onclick = async () => {
      const raw = await window.sbPrompt?.({ icon:'🔑', title:'Ban hardware fingerprint', label:'Fingerprint (HW-...)', placeholder:'HW-A1B2C3...', confirmText:'Next', required:true });
      const fp = (typeof raw === 'string') ? raw : (raw && (raw.value || raw.text)) || '';
      if (!fp) return;
      const clean = String(fp).trim();
      if (!/^HW-[A-F0-9]+$/i.test(clean)) return mpToast({ title:'Invalid fingerprint', msg:'Must be HW- followed by hex', type:'error' });
      const reasonRaw = await window.sbPrompt?.({ icon:'📝', title:'Reason', label:'Reason for ban', value:'Hardware ban', confirmText:'Next' });
      const reason = (typeof reasonRaw === 'string') ? reasonRaw : (reasonRaw && (reasonRaw.value || reasonRaw.text)) || 'Hardware ban';
      const durRaw = await window.sbChoose?.({ icon:'⏱', title:'Duration', options:[
        {value:'1h',label:'1 hour'},{value:'6h',label:'6 hours'},{value:'1d',label:'1 day'},
        {value:'3d',label:'3 days'},{value:'7d',label:'7 days'},{value:'30d',label:'30 days'},{value:'perm',label:'Permanent'}
      ]});
      const duration = (typeof durRaw === 'string') ? durRaw : (durRaw && durRaw.value) || '';
      if (!duration) return;
      const res = window.IPBan.banByFingerprint(clean, { reason, duration, bannedBy: ME.username, force: false });
      if (res && res.error) return mpToast({ title:'Cannot ban', msg:res.error, type:'error' });
      mpToast({ title:'Hardware banned', msg:clean.slice(0, 20) + '…', type:'success' });
      safeRefresh();
    };
  }

  function renderMutes() {
    const mutes = mpGetMutes(); const users = mpGetUsers();
    const list = Object.entries(mutes || {}).filter(([,e]) => e && (e.until == null || e.until > Date.now()));
    if (!list.length) { bodyEl.innerHTML = `<div class="mod-empty-large"><div class="mod-empty-ico">🔊</div><div class="mod-empty-title">No active mutes</div><div class="mod-empty-desc">Everyone can chat freely.</div></div>`; return; }
    bodyEl.innerHTML = `<div class="mod-list">${list.map(([username, entry]) => {
      const user = users[username] || {};
      const perm = entry.until == null;
      const remaining = perm ? 'Permanent' : mpFmtDur(entry.until - Date.now());
      const isShadow = !!entry.shadow;
      return `<div class="mod-list-card ${isShadow ? 'purple' : 'warn'}">
        <div class="mod-list-avatar" style="background:${user.color||'#666'}">${esc(user.avatar||'??')}</div>
        <div class="mod-list-info">
          <div class="mod-list-name">${esc(user.display||username)} <span class="mod-badge ${isShadow?'frozen':'mute'}">${isShadow ? 'SHADOW' : (perm?'PERM MUTE':remaining)}</span></div>
          <div class="mod-list-meta"><span>@${esc(username)}</span><span class="mod-list-reason">${esc(entry.reason||'—')}</span></div>
        </div>
        <div class="mod-list-actions">
          <button class="mod-action-btn accent" data-act="view" data-user="${esc(username)}" type="button">Actions ›</button>
          <button class="mod-action-btn cyan" data-act="unmute" data-user="${esc(username)}" type="button">Unmute</button>
        </div>
      </div>`;
    }).join('')}</div>`;
    bodyEl.querySelectorAll('[data-act="view"]').forEach(btn => { btn.onclick = () => openUserActions(btn.dataset.user); });
    bodyEl.querySelectorAll('[data-act="unmute"]').forEach(btn => { btn.onclick = () => { mpSafe(() => Auth.unmuteUser(btn.dataset.user)); mpLogAction('unmute', btn.dataset.user, {}); mpToast({ title:'Unmuted', msg:'@'+btn.dataset.user, type:'success' }); safeRefresh(); }; });
  }

  function renderWarnings() {
    const warnings = mpGetWarnings(); const users = mpGetUsers();
    const entries = Object.entries(warnings || {}).filter(([,l]) => (l||[]).some(w => w.at >= Date.now() - 86400000));
    if (!entries.length) { bodyEl.innerHTML = `<div class="mod-empty-large"><div class="mod-empty-ico">✓</div><div class="mod-empty-title">No active warnings</div><div class="mod-empty-desc">Clean record for everyone.</div></div>`; return; }
    bodyEl.innerHTML = `<div class="mod-list">${entries.map(([username, list]) => {
      const recent = (list||[]).filter(w => w.at >= Date.now() - 86400000);
      const user = users[username] || {};
      const latest = recent[recent.length - 1];
      return `<div class="mod-list-card amber">
        <div class="mod-list-avatar" style="background:${user.color||'#666'}">${esc(user.avatar||'??')}</div>
        <div class="mod-list-info"><div class="mod-list-name">${esc(user.display||username)} <span class="mod-badge warn">⚠ ${recent.length}</span></div><div class="mod-list-meta"><span>@${esc(username)}</span><span class="mod-list-reason">${esc(latest?.reason||'—')}</span></div></div>
        <div class="mod-list-actions">
          <button class="mod-action-btn accent" data-act="view" data-user="${esc(username)}" type="button">Actions ›</button>
          <button class="mod-action-btn" data-act="manage" data-user="${esc(username)}" type="button">Manage</button>
          <button class="mod-action-btn" data-act="clear" data-user="${esc(username)}" type="button">Clear</button>
        </div>
      </div>`;
    }).join('')}</div>`;
    bodyEl.querySelectorAll('[data-act="view"]').forEach(btn => { btn.onclick = () => openUserActions(btn.dataset.user); });
    bodyEl.querySelectorAll('[data-act="clear"]').forEach(btn => { btn.onclick = () => { mpSafe(() => Auth.clearWarnings(btn.dataset.user)); mpToast({ title:'Cleared', msg:'@'+btn.dataset.user, type:'success' }); safeRefresh(); }; });
    bodyEl.querySelectorAll('[data-act="manage"]').forEach(btn => { btn.onclick = () => openWarningManager(btn.dataset.user, () => safeRefresh(), true); });
  }

  function renderAppeals() {
    const appeals = mpGetAppeals(); const users = mpGetUsers();
    if (!appeals.length) { bodyEl.innerHTML = `<div class="mod-empty-large"><div class="mod-empty-ico">📭</div><div class="mod-empty-title">No appeals</div><div class="mod-empty-desc">Nothing to review.</div></div>`; return; }
    const pending = appeals.map((a, i) => ({ a, i })).filter(x => x.a.status === 'pending');
    const resolved = appeals.map((a, i) => ({ a, i })).filter(x => x.a.status !== 'pending');
    const renderOne = ({ a, i: realIdx }) => {
      const user = users[a.username] || {};
      const cls = a.status === 'pending' ? 'warn' : a.status === 'approved' ? 'success' : 'danger';
      const badgeCls = a.status === 'pending' ? 'temp' : a.status === 'approved' ? 'success' : 'perm';
      const decidedInfo = a.decidedAt ? ` · ${a.status} ${new Date(a.decidedAt).toLocaleString()}${a.decidedBy ? ' by @' + esc(a.decidedBy) : ''}` : '';
      return `<div class="mod-list-card ${cls}">
        <div class="mod-list-avatar" style="background:${user.color||'#666'}">${esc(user.avatar||'??')}</div>
        <div class="mod-list-info">
          <div class="mod-list-name">${esc(user.display||a.username)} <span class="mod-badge ${badgeCls}">${(a.status||'').toUpperCase()}</span></div>
          <div class="mod-list-meta"><span>@${esc(a.username)}</span><span class="mod-list-reason">${esc((a.reason||'—').slice(0, 120))}</span></div>
          <div class="mod-list-meta" style="margin-top:4px;font-size:10px;color:var(--text-3)"><span>Submitted ${new Date(a.at).toLocaleString()}</span>${decidedInfo ? `<span>${esc(decidedInfo.trim())}</span>` : ''}</div>
          ${a.decisionReason ? `<div style="margin-top:6px;padding:6px 9px;background:var(--bg);border-radius:6px;font-size:11px;color:var(--text-2);border-left:2px solid ${a.status==='approved'?'var(--green)':'var(--red)'}">${esc(a.decisionReason)}</div>` : ''}
        </div>
        ${a.status === 'pending' ? `<div class="mod-list-actions"><button class="mod-action-btn success" data-appeal-action="approve" data-idx="${realIdx}" type="button">Approve</button><button class="mod-action-btn danger" data-appeal-action="deny" data-idx="${realIdx}" type="button">Deny</button></div>` : `<div class="mod-list-actions"><button class="mod-action-btn" data-appeal-action="clear" data-idx="${realIdx}" type="button">Clear</button></div>`}
      </div>`;
    };
    bodyEl.innerHTML = `
      ${pending.length ? `<div class="mod-tools-label" style="margin-bottom:8px">Pending — ${pending.length}</div><div class="mod-list">${pending.map(renderOne).join('')}</div>` : `<div class="mod-empty" style="margin-bottom:14px">No pending appeals.</div>`}
      ${resolved.length ? `<div class="mod-tools-label" style="margin:16px 0 8px;display:flex;align-items:center;justify-content:space-between"><span>Resolved — ${resolved.length}</span><button class="mod-action-btn" id="mpClearResolvedAppeals" type="button">Clear All Resolved</button></div><div class="mod-list">${resolved.map(renderOne).join('')}</div>` : ''}`;
    bodyEl.querySelectorAll('[data-appeal-action="approve"]').forEach(btn => { btn.onclick = () => openAppealDecisionDialog(parseInt(btn.dataset.idx, 10), 'approve', () => safeRefresh()); });
    bodyEl.querySelectorAll('[data-appeal-action="deny"]').forEach(btn => { btn.onclick = () => openAppealDecisionDialog(parseInt(btn.dataset.idx, 10), 'deny', () => safeRefresh()); });
    bodyEl.querySelectorAll('[data-appeal-action="clear"]').forEach(btn => {
      btn.onclick = async () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const ok = await sbConfirm({ icon:'🗑', title:'Delete appeal record?', message:'This resolved appeal will be permanently removed.', confirmText:'Delete', confirmClass:'danger' });
        if (!ok) return;
        const fresh = mpGetAppeals(); fresh.splice(idx, 1); mpWrite('sb26_appeals', fresh);
        mpToast({ title:'Cleared', msg:'Appeal record deleted', type:'success' });
        safeRefresh();
      };
    });
    const clearBtn = bodyEl.querySelector('#mpClearResolvedAppeals');
    if (clearBtn) {
      clearBtn.onclick = async () => {
        const fresh = mpGetAppeals();
        const remaining = fresh.filter(a => a.status === 'pending');
        const removed = fresh.length - remaining.length;
        if (!removed) return mpToast({ title:'Nothing to clear', msg:'No resolved appeals', type:'warn' });
        const ok = await sbConfirm({ icon:'🗑', title:`Delete ${removed} resolved appeal${removed===1?'':'s'}?`, message:'This cannot be undone.', confirmText:'Delete all', confirmClass:'danger' });
        if (!ok) return;
        mpWrite('sb26_appeals', remaining);
        mpToast({ title:'Cleared', msg:`${removed} removed`, type:'success' });
        safeRefresh();
      };
    }
  }

  function renderLogs() {
    const bans = mpGetBans();
    const ipHistory = window.IPBan ? (window.IPBan.history() || []) : [];
    const combined = [...(bans.history||[]), ...ipHistory].sort((a,b) => (b.at||0) - (a.at||0)).slice(0, 100);
    if (!combined.length) { bodyEl.innerHTML = `<div class="mod-empty-large"><div class="mod-empty-ico">📜</div><div class="mod-empty-title">No audit entries</div><div class="mod-empty-desc">Moderator actions will appear here.</div></div>`; return; }
    bodyEl.innerHTML = `<div class="mod-audit-list">${combined.map(h => {
      let color = 'purple', icon = '👤';
      const actionMap = {
        'ban': ['danger','🚫'], 'unban': ['success','✓'], 'promote': ['','👑'],
        'ip-ban': ['danger','🌐'], 'ip-unban': ['success','🌐'], 'hw-ban': ['danger','🔑'],
        'purge': ['danger','🗑'], 'whitelist': ['success','⭐'], 'freeze': ['purple','🧊'],
        'unfreeze': ['success','☀'], 'watch': ['amber','👁'], 'pin': ['accent','📌'],
        'appeal-approve': ['success','📨'], 'appeal-deny': ['danger','📨'],
        'shadow-mute': ['purple','🤫'], 'ghost': ['amber','👻'], 'reset-password': ['amber','🔑'],
        'reset-profile': ['amber','♻️'], 'export-user': ['success','📥'],
        'clear-chat': ['danger','🧹'], 'force-reload': ['warn','🔄'],
      };
      const entry = actionMap[h.action];
      if (entry) { color = entry[0]; icon = entry[1]; }
      const isIP = h.action === 'ip-ban' || h.action === 'ip-unban';
      const isHW = h.action === 'hw-ban';
      const displayTime = h.atLocal || (h.at ? new Date(h.at).toLocaleString() : '—');
      return `<div class="mod-audit-item ${color}">
        <div class="mod-audit-ico">${icon}</div>
        <div class="mod-audit-body">
          <div class="mod-audit-head"><span class="mod-audit-action ${color}">${(h.action||'').toUpperCase()}</span><span class="mod-audit-time">${esc(displayTime)}</span></div>
          <div class="mod-audit-detail"><strong>@${esc(h.username||'—')}</strong>${h.reason?' — '+esc(h.reason):''}<span class="mod-audit-by">by @${esc(h.bannedBy||h.by||'system')}</span>${(isIP || isHW) && h.fingerprint?`<span class="mod-audit-fp" title="${esc(h.fingerprint)}">FP ${esc(h.fingerprint.slice(0,12))}…</span>`:''}</div>
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  function renderTools() {
    const bans = mpGetBans(); const mutes = mpGetMutes();
    const expiredBans = Object.entries(bans.users || {}).filter(([,e]) => e && e.expiresAt != null && e.expiresAt <= Date.now());
    const expiredMutes = Object.entries(mutes || {}).filter(([,e]) => e && e.until != null && e.until <= Date.now());
    const resolvedAppeals = mpGetAppeals().filter(a => a.status !== 'pending');
    const resolvedReports = mpGetReports().filter(r => r.resolved);
    const slowCount = Object.keys(mpGetSlowMode()).length;
    const maintEnabled = window.SB_Maintenance && SB_Maintenance.enabled();
    const maintState = window.SB_Maintenance ? SB_Maintenance.get() : {};
    const maintMsg = (maintState.message || '').slice(0, 60);
    const maintEta = maintState.until && maintState.until > Date.now() ? new Date(maintState.until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    bodyEl.innerHTML = `
      <div class="mod-tools">
        <div class="mod-tools-group">
          <div class="mod-tools-label">🛠 Server</div>
          <button class="mod-tool" id="toolMaintenance" type="button"><span class="mod-tool-ico" style="background:${maintEnabled ? 'var(--red-bg)' : 'var(--amber-bg)'};color:${maintEnabled ? 'var(--red-2)' : 'var(--amber-2)'}">🚧</span><div class="mod-tool-body"><div class="mod-tool-title">${maintEnabled ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}</div><div class="mod-tool-desc">${maintEnabled ? `Site OFFLINE — ${maintMsg || 'users see maintenance page'}${maintEta ? ' · back by ' + maintEta : ''}` : 'Lock everyone out except staff'}</div></div><span class="mod-tool-arrow">›</span></button>
          ${maintEnabled ? `<div style="padding:10px 14px;background:var(--red-bg);border:1px solid var(--red-border);border-radius:10px;font-size:11.5px;line-height:1.5;color:var(--red-2)"><strong>⚠ Site is offline.</strong><br><strong>Message:</strong> ${esc(maintState.message || '—')}${maintEta ? `<br><strong>ETA:</strong> ${esc(maintEta)}` : '<br><strong>ETA:</strong> Unknown'}</div>` : ''}
        </div>
        <div class="mod-tools-group">
          <div class="mod-tools-label">📢 Announcements</div>
          <button class="mod-tool" id="toolBroadcast" type="button"><span class="mod-tool-ico" style="background:var(--accent-bg);color:var(--accent-2)">📢</span><div class="mod-tool-body"><div class="mod-tool-title">Broadcast Message</div><div class="mod-tool-desc">Full-screen popup to every user</div></div><span class="mod-tool-arrow">›</span></button>
          <button class="mod-tool" id="toolBulkDM" type="button"><span class="mod-tool-ico" style="background:var(--im-blue);color:#fff">💌</span><div class="mod-tool-body"><div class="mod-tool-title">Bulk DM</div><div class="mod-tool-desc">Send a message to multiple users</div></div><span class="mod-tool-arrow">›</span></button>
          <button class="mod-tool" id="toolBulkDMOnline" type="button"><span class="mod-tool-ico" style="background:var(--im-blue);color:#fff">🌐</span><div class="mod-tool-body"><div class="mod-tool-title">Bulk DM · Online Users</div><div class="mod-tool-desc">Message everyone currently connected</div></div><span class="mod-tool-arrow">›</span></button>
          <button class="mod-tool" id="toolForceSignout" type="button"><span class="mod-tool-ico" style="background:var(--red-bg);color:var(--red-2)">🔐</span><div class="mod-tool-body"><div class="mod-tool-title">Force Sign-Out Everyone</div><div class="mod-tool-desc">Kick every non-privileged user</div></div><span class="mod-tool-arrow">›</span></button>
          <button class="mod-tool" id="toolForceReloadAll" type="button"><span class="mod-tool-ico" style="background:var(--amber-bg);color:var(--amber-2)">🔄</span><div class="mod-tool-body"><div class="mod-tool-title">Force Reload All Tabs</div><div class="mod-tool-desc">Tell every user's tabs to reload</div></div><span class="mod-tool-arrow">›</span></button>
          <button class="mod-tool" id="toolTestNotify" type="button"><span class="mod-tool-ico" style="background:var(--accent-bg);color:var(--accent-2)">🔔</span><div class="mod-tool-body"><div class="mod-tool-title">Test Notification</div><div class="mod-tool-desc">Send a test toast to your screen</div></div><span class="mod-tool-arrow">›</span></button>
        </div>
        <div class="mod-tools-group">
          <div class="mod-tools-label">🧹 Cleanup</div>
          <button class="mod-tool" id="toolPurgeBans" type="button"><span class="mod-tool-ico" style="background:var(--green-bg);color:var(--green-2)">🧹</span><div class="mod-tool-body"><div class="mod-tool-title">Purge Expired Bans</div><div class="mod-tool-desc">${expiredBans.length} expired ban${expiredBans.length===1?'':'s'}</div></div><span class="mod-tool-arrow">›</span></button>
          <button class="mod-tool" id="toolPurgeMutes" type="button"><span class="mod-tool-ico" style="background:var(--cyan-bg);color:var(--cyan-2)">🧹</span><div class="mod-tool-body"><div class="mod-tool-title">Purge Expired Mutes</div><div class="mod-tool-desc">${expiredMutes.length} expired mute${expiredMutes.length===1?'':'s'}</div></div><span class="mod-tool-arrow">›</span></button>
          <button class="mod-tool" id="toolPurgeAllExpired" type="button"><span class="mod-tool-ico" style="background:var(--green-bg);color:var(--green-2)">♻️</span><div class="mod-tool-body"><div class="mod-tool-title">Purge All Expired</div><div class="mod-tool-desc">${expiredBans.length + expiredMutes.length} item${(expiredBans.length + expiredMutes.length)===1?'':'s'} total</div></div><span class="mod-tool-arrow">›</span></button>
          <button class="mod-tool" id="toolPurgeFrozen" type="button"><span class="mod-tool-ico" style="background:var(--purple-bg);color:var(--purple-2)">🧊</span><div class="mod-tool-body"><div class="mod-tool-title">Purge All Frozen</div><div class="mod-tool-desc">Unfreeze everyone</div></div><span class="mod-tool-arrow">›</span></button>
          <button class="mod-tool" id="toolPurgeAppeals" type="button"><span class="mod-tool-ico" style="background:var(--red-bg);color:var(--red-2)">📨</span><div class="mod-tool-body"><div class="mod-tool-title">Purge Resolved Appeals</div><div class="mod-tool-desc">${resolvedAppeals.length} resolved appeal${resolvedAppeals.length===1?'':'s'}</div></div><span class="mod-tool-arrow">›</span></button>
          <button class="mod-tool" id="toolPurgeReports" type="button"><span class="mod-tool-ico" style="background:var(--red-bg);color:var(--red-2)">🚩</span><div class="mod-tool-body"><div class="mod-tool-title">Purge Resolved Reports</div><div class="mod-tool-desc">${resolvedReports.length} resolved report${resolvedReports.length===1?'':'s'}</div></div><span class="mod-tool-arrow">›</span></button>
        </div>
        <div class="mod-tools-group">
          <div class="mod-tools-label">⚡ Bulk Actions</div>
          <button class="mod-tool" id="toolClearRateLimits" type="button"><span class="mod-tool-ico" style="background:var(--cyan-bg);color:var(--cyan-2)">🐢</span><div class="mod-tool-body"><div class="mod-tool-title">Clear All Rate Limits</div><div class="mod-tool-desc">${slowCount} user${slowCount===1?'':'s'} currently slowed</div></div><span class="mod-tool-arrow">›</span></button>
          <button class="mod-tool" id="toolClearWarnings" type="button"><span class="mod-tool-ico" style="background:var(--amber-bg);color:var(--amber-2)">⚠</span><div class="mod-tool-body"><div class="mod-tool-title">Clear All Warnings</div><div class="mod-tool-desc">Reset warnings for everyone</div></div><span class="mod-tool-arrow">›</span></button>
          <button class="mod-tool" id="toolUnfreezeAll" type="button"><span class="mod-tool-ico" style="background:var(--purple-bg);color:var(--purple-2)">☀</span><div class="mod-tool-body"><div class="mod-tool-title">Mass Unfreeze</div><div class="mod-tool-desc">Unfreeze all frozen users at once</div></div><span class="mod-tool-arrow">›</span></button>
          <button class="mod-tool" id="toolBulkDMWatched" type="button"><span class="mod-tool-ico" style="background:var(--amber-bg);color:var(--amber-2)">👁</span><div class="mod-tool-body"><div class="mod-tool-title">Bulk DM · Watched Users</div><div class="mod-tool-desc">Message everyone on your watch list</div></div><span class="mod-tool-arrow">›</span></button>
        </div>
        ${window.AM_OWNER ? `<div class="mod-tools-group"><div class="mod-tools-label">👑 Owner Only</div>
          <button class="mod-tool" id="toolRoleManage" type="button"><span class="mod-tool-ico" style="background:var(--amber-bg);color:var(--amber-2)">👑</span><div class="mod-tool-body"><div class="mod-tool-title">Role Management</div><div class="mod-tool-desc">Promote or demote users</div></div><span class="mod-tool-arrow">›</span></button>
          <button class="mod-tool" id="toolSignoutStaff" type="button"><span class="mod-tool-ico" style="background:var(--red-bg);color:var(--red-2)">🔒</span><div class="mod-tool-body"><div class="mod-tool-title">Sign Out All Staff</div><div class="mod-tool-desc">Force sign-out every moderator</div></div><span class="mod-tool-arrow">›</span></button>
          <button class="mod-tool" id="toolResetHistory" type="button"><span class="mod-tool-ico" style="background:var(--red-bg);color:var(--red-2)">🗑</span><div class="mod-tool-body"><div class="mod-tool-title">Reset Ban History</div><div class="mod-tool-desc">Clear the entire audit log (irreversible)</div></div><span class="mod-tool-arrow">›</span></button>
        </div>` : ''}
      </div>`;

    bodyEl.querySelector('#toolBroadcast')?.addEventListener('click', () => openBroadcastDialog());
    bodyEl.querySelector('#toolBulkDM')?.addEventListener('click', () => openBulkDMDialog());
    bodyEl.querySelector('#toolMaintenance')?.addEventListener('click', () => {
      if (!window.SB_Maintenance) return mpToast({ title: 'Unavailable', msg: 'Maintenance module not loaded', type: 'error' });
      if (typeof window.openMaintenanceDialog === 'function') {
        window.openMaintenanceDialog(() => { renderTools(); });
      }
    });
    bodyEl.querySelector('#toolForceSignout')?.addEventListener('click', async () => {
      const ok = await sbConfirm({ icon:'🔐', title:'Force sign out everyone?', message:'All non-staff users will be signed out.', confirmText:'Sign out all', confirmClass:'danger' });
      if (!ok) return;
      const users = mpGetUsers(); let count = 0;
      Object.values(users).forEach(u => { if (u.role === 'owner' || u.role === 'mod') return; try { window.RT?.forceSignout?.(u.username); count++; } catch (e) {} });
      mpLogAction('force-signout-all', '(all)', { reason:`Kicked ${count} users` });
      mpToast({ title:'Signed out', msg:`${count} user${count===1?'':'s'}`, type:'warn' });
    });
    bodyEl.querySelector('#toolPurgeBans')?.addEventListener('click', () => {
      const bans = mpGetBans(); let n = 0;
      Object.entries(bans.users || {}).forEach(([u,e]) => { if (e && e.expiresAt != null && e.expiresAt <= Date.now()) { delete bans.users[u]; n++; } });
      if (window.Auth && Auth.saveBans) Auth.saveBans(bans); else mpWrite('sb26_bans', bans);
      mpToast({ title:'Purged', msg:`${n} expired ban${n===1?'':'s'}`, type:'success' });
      renderTools();
    });
    bodyEl.querySelector('#toolPurgeMutes')?.addEventListener('click', () => {
      const mutes = mpGetMutes(); let n = 0;
      Object.entries(mutes || {}).forEach(([u,e]) => { if (e && e.until != null && e.until <= Date.now()) { delete mutes[u]; n++; } });
      if (window.Auth && Auth.saveMutes) Auth.saveMutes(mutes); else mpWrite('sb44_mutes', mutes);
      mpToast({ title:'Purged', msg:`${n} expired mute${n===1?'':'s'}`, type:'success' });
      renderTools();
    });
    bodyEl.querySelector('#toolPurgeFrozen')?.addEventListener('click', async () => {
      const ok = await sbConfirm({ icon:'🧊', title:'Unfreeze all users?', message:'Every frozen account will be restored.', confirmText:'Unfreeze all', confirmClass:'primary' });
      if (!ok) return;
      const frozen = mpGetFrozen(); const count = Object.keys(frozen).length;
      mpSetFrozen({});
      Object.keys(frozen).forEach(u => { try { window.RT?.emit?.('unfreeze', { username: u }); } catch (e) {} });
      mpToast({ title:'Purged', msg:`${count} unfrozen`, type:'success' });
      renderTools();
    });
    bodyEl.querySelector('#toolRoleManage')?.addEventListener('click', () => { closePanel(); openRoleManagement(); });
    bodyEl.querySelector('#toolBulkDMOnline')?.addEventListener('click', async () => {
      const online = (window.SafeBeef?.state?.zombies || []).filter(z => !z.isMe && z.visible !== false);
      const unique = [...new Map(online.map(z => [z.username, z])).values()];
      if (!unique.length) return mpToast({ title:'No one online', msg:'No other users connected', type:'warn' });
      const raw = await window.sbPrompt?.({ icon:'💌', title:`Message ${unique.length} online users`, label:'Message', multiline:true, confirmText:'Send' });
      const text = (typeof raw === 'string') ? raw : (raw && (raw.value || raw.text)) || '';
      if (!text) return;
      const now = Date.now();
      unique.forEach((z, i) => {
        const msgData = { id: ME.username + '-' + (now + i) + '-' + Math.random().toString(36).slice(2, 8), from: ME.username, fromDisplay: ME.display, to: z.username, ts: now + i, sentAt: now + i, type: 'text', text, fromMod: true, modBadge: true };
        try { const key = 'sb26_chat_' + [ME.username, z.username].sort().join('__'); const msgs = JSON.parse(localStorage.getItem(key) || '[]'); msgs.push(msgData); if (msgs.length > 800) msgs.splice(0, msgs.length - 800); localStorage.setItem(key, JSON.stringify(msgs)); } catch (e) {}
        try { window.RT?.emit?.('direct-notify', { from: ME.username, to: z.username, msg: text.slice(0, 80) }); } catch (e) {}
      });
      mpLogAction('bulk-dm-online', `(${unique.length} users)`, { reason: text.slice(0, 100) });
      mpToast({ title:'Bulk DM sent', msg:`${unique.length} online users`, type:'success' });
    });
    bodyEl.querySelector('#toolBulkDMWatched')?.addEventListener('click', async () => {
      const watched = Object.keys(mpGetWatched());
      if (!watched.length) return mpToast({ title:'No watched users', msg:'Watch someone first', type:'warn' });
      const raw = await window.sbPrompt?.({ icon:'💌', title:`Message ${watched.length} watched users`, label:'Message', multiline:true, confirmText:'Send' });
      const text = (typeof raw === 'string') ? raw : (raw && (raw.value || raw.text)) || '';
      if (!text) return;
      const now = Date.now();
      watched.forEach((u, i) => {
        const msgData = { id: ME.username + '-' + (now + i) + '-' + Math.random().toString(36).slice(2, 8), from: ME.username, fromDisplay: ME.display, to: u, ts: now + i, sentAt: now + i, type: 'text', text, fromMod: true, modBadge: true };
        try { const key = 'sb26_chat_' + [ME.username, u].sort().join('__'); const msgs = JSON.parse(localStorage.getItem(key) || '[]'); msgs.push(msgData); if (msgs.length > 800) msgs.splice(0, msgs.length - 800); localStorage.setItem(key, JSON.stringify(msgs)); } catch (e) {}
        try { window.RT?.emit?.('direct-notify', { from: ME.username, to: u, msg: text.slice(0, 80) }); } catch (e) {}
      });
      mpLogAction('bulk-dm-watched', `(${watched.length} users)`, { reason: text.slice(0, 100) });
      mpToast({ title:'Bulk DM sent', msg:`${watched.length} watched users`, type:'success' });
    });
    bodyEl.querySelector('#toolForceReloadAll')?.addEventListener('click', async () => {
      const ok = await sbConfirm({ icon:'🔄', title:'Force reload all tabs?', message:'Every connected user\'s tabs will refresh.', confirmText:'Reload all', confirmClass:'primary' });
      if (!ok) return;
      try { window.RT?.emit?.('force-reload', { username: '__ALL__' }); window.appChannel?.postMessage({ type: 'force-reload', username: '__ALL__' }); } catch (e) {}
      mpLogAction('force-reload-all', '(all)', {});
      mpToast({ title:'Reload sent', msg:'All tabs will refresh', type:'warn' });
    });
    bodyEl.querySelector('#toolTestNotify')?.addEventListener('click', () => { mpToast({ title:'Test notification', msg:'If you can read this, toasts work!', type:'success', dur: 3000 }); });
    bodyEl.querySelector('#toolPurgeAllExpired')?.addEventListener('click', () => {
      const bans = mpGetBans(); const mutes = mpGetMutes(); let nb = 0, nm = 0;
      Object.entries(bans.users || {}).forEach(([u,e]) => { if (e && e.expiresAt != null && e.expiresAt <= Date.now()) { delete bans.users[u]; nb++; } });
      Object.entries(mutes || {}).forEach(([u,e]) => { if (e && e.until != null && e.until <= Date.now()) { delete mutes[u]; nm++; } });
      if (window.Auth && Auth.saveBans) Auth.saveBans(bans); else mpWrite('sb26_bans', bans);
      if (window.Auth && Auth.saveMutes) Auth.saveMutes(mutes); else mpWrite('sb44_mutes', mutes);
      mpToast({ title:'Purged', msg:`${nb} bans, ${nm} mutes`, type:'success' });
      renderTools();
    });
    bodyEl.querySelector('#toolPurgeAppeals')?.addEventListener('click', async () => {
      const fresh = mpGetAppeals(); const remaining = fresh.filter(a => a.status === 'pending');
      const removed = fresh.length - remaining.length;
      if (!removed) return mpToast({ title:'Nothing to clear', msg:'No resolved appeals', type:'warn' });
      const ok = await sbConfirm({ icon:'🗑', title:`Delete ${removed} resolved appeal${removed===1?'':'s'}?`, message:'This cannot be undone.', confirmText:'Delete all', confirmClass:'danger' });
      if (!ok) return;
      mpWrite('sb26_appeals', remaining);
      mpToast({ title:'Purged', msg:`${removed} removed`, type:'success' });
      renderTools();
    });
    bodyEl.querySelector('#toolPurgeReports')?.addEventListener('click', async () => {
      const fresh = mpGetReports(); const remaining = fresh.filter(r => !r.resolved);
      const removed = fresh.length - remaining.length;
      if (!removed) return mpToast({ title:'Nothing to clear', msg:'No resolved reports', type:'warn' });
      const ok = await sbConfirm({ icon:'🗑', title:`Delete ${removed} resolved report${removed===1?'':'s'}?`, message:'This cannot be undone.', confirmText:'Delete all', confirmClass:'danger' });
      if (!ok) return;
      mpWrite('sb26_reports', remaining);
      mpToast({ title:'Purged', msg:`${removed} removed`, type:'success' });
      renderTools();
    });
    bodyEl.querySelector('#toolClearRateLimits')?.addEventListener('click', async () => {
      const slow = mpGetSlowMode(); const count = Object.keys(slow).length;
      if (!count) return mpToast({ title:'No rate limits', msg:'Nothing to clear', type:'warn' });
      const ok = await sbConfirm({ icon:'🐢', title:`Clear ${count} rate limit${count===1?'':'s'}?`, message:'All users will be able to send without delay.', confirmText:'Clear all', confirmClass:'primary' });
      if (!ok) return;
      mpWrite('sb26_slowmode', {});
      mpLogAction('clear-rate-limits', '(all)', {});
      mpToast({ title:'Cleared', msg:`${count} removed`, type:'success' });
      renderTools();
    });
    bodyEl.querySelector('#toolClearWarnings')?.addEventListener('click', async () => {
      const warnings = mpGetWarnings(); const count = Object.keys(warnings).length;
      if (!count) return mpToast({ title:'No warnings', msg:'Nothing to clear', type:'warn' });
      const ok = await sbConfirm({ icon:'⚠', title:`Clear warnings for ${count} user${count===1?'':'s'}?`, message:'All warnings will be deleted.', confirmText:'Clear all', confirmClass:'danger' });
      if (!ok) return;
      mpWrite('sb26_warnings', {});
      mpLogAction('clear-warnings-all', '(all)', {});
      mpToast({ title:'Cleared', msg:`Warnings for ${count} users removed`, type:'success' });
      renderTools();
    });
    bodyEl.querySelector('#toolUnfreezeAll')?.addEventListener('click', async () => {
      const frozen = mpGetFrozen(); const count = Object.keys(frozen).length;
      if (!count) return mpToast({ title:'No frozen users', msg:'Nothing to unfreeze', type:'warn' });
      const ok = await sbConfirm({ icon:'☀', title:`Unfreeze ${count} user${count===1?'':'s'}?`, message:'Everyone will get access back.', confirmText:'Unfreeze all', confirmClass:'primary' });
      if (!ok) return;
      mpSetFrozen({});
      Object.keys(frozen).forEach(u => { try { window.RT?.emit?.('unfreeze', { username: u }); } catch (e) {} });
      mpLogAction('mass-unfreeze', '(all)', {});
      mpToast({ title:'Unfrozen', msg:`${count} user${count===1?'':'s'}`, type:'success' });
      renderTools();
    });
    bodyEl.querySelector('#toolSignoutStaff')?.addEventListener('click', async () => {
      const ok = await sbConfirm({ icon:'🔒', title:'Sign out all staff?', message:'Every moderator except you will be signed out.', confirmText:'Sign out staff', confirmClass:'danger' });
      if (!ok) return;
      const users = mpGetUsers(); let count = 0;
      Object.values(users).forEach(u => { if (u.username === ME.username) return; if (u.role !== 'mod' && u.role !== 'owner') return; try { window.RT?.forceSignout?.(u.username); count++; } catch (e) {} });
      mpLogAction('signout-staff', '(all)', { reason:`Kicked ${count} staff` });
      mpToast({ title:'Staff signed out', msg:`${count} mod${count===1?'':'s'}`, type:'warn' });
    });
    bodyEl.querySelector('#toolResetHistory')?.addEventListener('click', async () => {
      const ok1 = await sbConfirm({ icon:'⚠️', title:'Clear entire ban history?', message:'This cannot be undone and removes all audit records.', confirmText:'Continue', confirmClass:'danger' });
      if (!ok1) return;
      const ok2 = await sbConfirm({ icon:'🗑', title:'Are you really sure?', message:'This wipes ALL mod history permanently.', confirmText:'Yes, delete everything', confirmClass:'danger' });
      if (!ok2) return;
      const bans = mpGetBans();
      bans.history = [];
      if (window.Auth && Auth.saveBans) Auth.saveBans(bans); else mpWrite('sb26_bans', bans);
      mpToast({ title:'History reset', msg:'All audit records deleted', type:'success' });
      renderTools();
    });
  }

  function renderSettings() {
    const s = mpGetSettings();
    bodyEl.innerHTML = `
      <div class="mod-settings">
        <div class="mod-settings-group"><div class="mod-settings-label">Confirmations</div>
          <label class="mod-settings-row"><div class="mod-settings-body"><div class="mod-settings-title">Confirm before banning</div><div class="mod-settings-desc">Show confirmation dialog</div></div><div class="settings-toggle ${s.confirmBans?'on':''}" data-set="confirmBans"></div></label>
          <label class="mod-settings-row"><div class="mod-settings-body"><div class="mod-settings-title">Confirm before muting</div><div class="mod-settings-desc">Show confirmation dialog</div></div><div class="settings-toggle ${s.confirmMutes?'on':''}" data-set="confirmMutes"></div></label>
          <label class="mod-settings-row"><div class="mod-settings-body"><div class="mod-settings-title">Confirm before kicking</div><div class="mod-settings-desc">Show confirmation dialog</div></div><div class="settings-toggle ${s.confirmKicks?'on':''}" data-set="confirmKicks"></div></label>
          <label class="mod-settings-row"><div class="mod-settings-body"><div class="mod-settings-title">Require ban reason</div><div class="mod-settings-desc">Block banning without a written reason</div></div><div class="settings-toggle ${s.requireReason?'on':''}" data-set="requireReason"></div></label>
          <label class="mod-settings-row"><div class="mod-settings-body"><div class="mod-settings-title">Require mute reason</div><div class="mod-settings-desc">Block muting without a written reason</div></div><div class="settings-toggle ${s.requireReasonMutes?'on':''}" data-set="requireReasonMutes"></div></label>
        </div>
        <div class="mod-settings-group"><div class="mod-settings-label">Feedback</div>
          <label class="mod-settings-row"><div class="mod-settings-body"><div class="mod-settings-title">Sound alerts</div><div class="mod-settings-desc">Master toggle for all mod sounds</div></div><div class="settings-toggle ${s.soundAlerts?'on':''}" data-set="soundAlerts"></div></label>
          <label class="mod-settings-row"><div class="mod-settings-body"><div class="mod-settings-title">Beep on new reports</div><div class="mod-settings-desc">Sound when a report comes in</div></div><div class="settings-toggle ${s.beepOnReports?'on':''}" data-set="beepOnReports"></div></label>
          <label class="mod-settings-row"><div class="mod-settings-body"><div class="mod-settings-title">Beep on new appeals</div><div class="mod-settings-desc">Sound when an appeal comes in</div></div><div class="settings-toggle ${s.beepOnAppeals?'on':''}" data-set="beepOnAppeals"></div></label>
          <label class="mod-settings-row"><div class="mod-settings-body"><div class="mod-settings-title">Auto-refresh</div><div class="mod-settings-desc">Reload panel live as data changes</div></div><div class="settings-toggle ${s.autoRefresh?'on':''}" data-set="autoRefresh"></div></label>
        </div>
        <div class="mod-settings-group"><div class="mod-settings-label">Display</div>
          <label class="mod-settings-row"><div class="mod-settings-body"><div class="mod-settings-title">Show fingerprints</div><div class="mod-settings-desc">Display hardware fingerprint IDs</div></div><div class="settings-toggle ${s.showFingerprints?'on':''}" data-set="showFingerprints"></div></label>
          <label class="mod-settings-row"><div class="mod-settings-body"><div class="mod-settings-title">Compact mode</div><div class="mod-settings-desc">Tighter layout, more users visible</div></div><div class="settings-toggle ${s.compactMode?'on':''}" data-set="compactMode"></div></label>
          <label class="mod-settings-row"><div class="mod-settings-body"><div class="mod-settings-title">Show user IDs</div><div class="mod-settings-desc">Display internal user IDs in lists</div></div><div class="settings-toggle ${s.showUserIdInList?'on':''}" data-set="showUserIdInList"></div></label>
        </div>
        <div class="mod-settings-group"><div class="mod-settings-label">Defaults</div>
          <div class="mod-settings-row"><div class="mod-settings-body"><div class="mod-settings-title">Default ban duration</div><div class="mod-settings-desc">Pre-selected in ban dialog</div></div>
            <select id="mpDefaultBanDur" style="padding:7px 10px;background:var(--bg);border:1px solid var(--border-2);border-radius:8px;color:var(--text);font-size:11px;font-family:inherit;cursor:pointer;flex-shrink:0">
              <option value="1h" ${s.defaultBanDuration==='1h'?'selected':''}>1 hour</option>
              <option value="6h" ${s.defaultBanDuration==='6h'?'selected':''}>6 hours</option>
              <option value="12h" ${s.defaultBanDuration==='12h'?'selected':''}>12 hours</option>
              <option value="1d" ${s.defaultBanDuration==='1d'?'selected':''}>1 day</option>
              <option value="3d" ${s.defaultBanDuration==='3d'?'selected':''}>3 days</option>
              <option value="7d" ${s.defaultBanDuration==='7d'?'selected':''}>7 days</option>
              <option value="30d" ${s.defaultBanDuration==='30d'?'selected':''}>30 days</option>
              <option value="perm" ${s.defaultBanDuration==='perm'?'selected':''}>Permanent</option>
            </select>
          </div>
          <div class="mod-settings-row"><div class="mod-settings-body"><div class="mod-settings-title">Default mute duration</div><div class="mod-settings-desc">Pre-selected in mute dialog</div></div>
            <select id="mpDefaultMuteDur" style="padding:7px 10px;background:var(--bg);border:1px solid var(--border-2);border-radius:8px;color:var(--text);font-size:11px;font-family:inherit;cursor:pointer;flex-shrink:0">
              <option value="5m" ${s.defaultMuteDuration==='5m'?'selected':''}>5 min</option>
              <option value="15m" ${s.defaultMuteDuration==='15m'?'selected':''}>15 min</option>
              <option value="1h" ${s.defaultMuteDuration==='1h'?'selected':''}>1 hour</option>
              <option value="6h" ${s.defaultMuteDuration==='6h'?'selected':''}>6 hours</option>
              <option value="1d" ${s.defaultMuteDuration==='1d'?'selected':''}>1 day</option>
              <option value="7d" ${s.defaultMuteDuration==='7d'?'selected':''}>7 days</option>
              <option value="perm" ${s.defaultMuteDuration==='perm'?'selected':''}>Permanent</option>
            </select>
          </div>
        </div>
      </div>`;
    bodyEl.querySelectorAll('[data-set]').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.dataset.set;
        s[key] = !s[key];
        mpSaveSettings(s);
        el.classList.toggle('on', s[key]);
        if (key === 'autoRefresh') applyAutoRefresh();
        if (key === 'compactMode') mpApplyCompactMode();
        if (key === 'soundAlerts' && s[key]) mpBeep(1200, 0.08, 'sine', 0.06);
        mpToast({ title:'Saved', msg:`${key} = ${s[key]?'on':'off'}`, type:'success', dur:1200 });
      });
    });
    const banDurSel = bodyEl.querySelector('#mpDefaultBanDur');
    if (banDurSel) banDurSel.onchange = e => { s.defaultBanDuration = e.target.value; mpSaveSettings(s); mpToast({ title:'Saved', msg:'Default ban duration updated', type:'success', dur:1200 }); };
    const muteDurSel = bodyEl.querySelector('#mpDefaultMuteDur');
    if (muteDurSel) muteDurSel.onchange = e => { s.defaultMuteDuration = e.target.value; mpSaveSettings(s); mpToast({ title:'Saved', msg:'Default mute duration updated', type:'success', dur:1200 }); };
  }

  renderTabs(); renderBody(); applyAutoRefresh();
  const ipHandler = () => { if (activeTab === 'ipbans' || activeTab === 'logs' || activeTab === 'users') safeRefresh(); };
  window.addEventListener('sb-ip-ban-update', ipHandler);
  liveUnsubs.push(() => window.removeEventListener('sb-ip-ban-update', ipHandler));
  const obs = new MutationObserver(() => { if (!document.body.contains(panel)) { liveUnsubs.forEach(u => u()); obs.disconnect(); unlockScroll(); clearInterval(privWatcher); } });
  obs.observe(document.body, { childList:true });
}
window.openModPanel = openModPanel;