/* ==========================================================================
   SafeBeef v83 — Core app (fixed: direct-notify, demotion kick, profile sync)
   ========================================================================== */
'use strict';

const $ = id => document.getElementById(id);
const $$ = (sel, root = document) => root.querySelectorAll(sel);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
window.$ = $; window.$$ = $$; window.esc = esc;

/* ---------- Safe stringification for notification payloads ---------- */
function safeString(v, fallback = '') {
  if (v == null) return fallback;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    if (typeof v.text === 'string') return v.text;
    if (typeof v.value === 'string') return v.value;
    if (typeof v.reason === 'string') return v.reason;
    if (typeof v.msg === 'string') return v.msg;
    try { return JSON.stringify(v); } catch (e) { return fallback; }
  }
  return String(v);
}
window.__sbSafeString = safeString;

/* ---------- Mod UI cleanup helper ---------- */
function removeAllModUI() {
  try {
    document.querySelectorAll('.mod-panel, .mod-drill, .mod-dialog-overlay').forEach(el => el.remove());
  } catch (e) {}
  try { document.body.style.overflow = ''; } catch (e) {}
}
window.__sbRemoveAllModUI = removeAllModUI;

/* ---------- Show/hide mod entry points ---------- */
function setModEntryVisible(visible) {
  try {
    const m = document.getElementById('menuModItem');
    if (m) m.style.display = visible ? 'flex' : 'none';
    const s = document.getElementById('sheetModItem');
    if (s) s.style.display = visible ? 'flex' : 'none';
    const b = document.getElementById('btnMod');
    if (b) {
      b.style.display = visible ? 'grid' : 'none';
      if (visible) b.onclick = () => window.App?.openModPanel();
    }
  } catch (e) {}
}
window.__sbSetModEntryVisible = setModEntryVisible;

window.addEventListener('unhandledrejection', e => {
  console.warn('[app] unhandled promise rejection:', e.reason);
  try { window.SafeBeef?.log?.(`<span style="color:var(--amber-2)">⚠ ${esc(e.reason?.message || e.reason)}</span>`); } catch (_) {}
});
window.addEventListener('error', e => {
  console.warn('[app] runtime error:', e.message);
  try { window.SafeBeef?.log?.(`<span style="color:var(--red-2)">✕ ${esc(e.message)}</span>`); } catch (_) {}
});

const me = window.Auth ? Auth.current() : null;
if (!me) { location.replace('auth.html'); }

window.__sbOnKicked = function (username) {
  document.querySelectorAll('.sb-kick-overlay').forEach(el => el.remove());
  const overlay = document.createElement('div');
  overlay.className = 'sb-overlay-fullscreen sb-kick-overlay';
  overlay.style.cssText = 'background:rgba(0,0,0,.9);z-index:999999;cursor:default';
  overlay.innerHTML = `
    <div style="max-width:400px;padding:32px;background:var(--surface);border:1px solid var(--border-2);border-radius:16px;text-align:center;color:var(--text);font-family:var(--sans)">
      <div style="font-size:48px;margin-bottom:12px">🔒</div>
      <h2 style="font-size:18px;font-weight:800;margin-bottom:8px">Signed in elsewhere</h2>
      <p style="font-size:13px;color:var(--text-2);line-height:1.6;margin-bottom:20px"><strong>@${esc(username)}</strong> was just signed in on another tab.<br>This tab has been signed out.</p>
      <button class="btn primary" style="width:100%" onclick="location.href='auth.html'">Sign in again</button>
    </div>`;
  document.body.appendChild(overlay);
};

function getFrozenMap() { try { return JSON.parse(localStorage.getItem('sb26_frozen_users') || '{}') || {}; } catch (e) { return {}; } }
function isFrozen(username) { return !!getFrozenMap()[username]; }

function setPageTitle() {
  try {
    const display = (window.ME && window.ME.display) || me.display || me.username;
    document.title = isFrozen(me.username) ? `Frozen — ${display} · SafeBeef` : `SafeBeef — ${display}`;
  } catch (e) {}
}
window.setPageTitle = setPageTitle;
setPageTitle();

function showFreezeOverlay(reason) {
  document.querySelectorAll('.sb-freeze-overlay').forEach(el => el.remove());
  const info = getFrozenMap()[me.username] || {};
  const frozenAt = info.at || info.atLocal || Date.now();
  const by = info.by || 'a moderator';
  const caseId = 'FRZ-' + String(me.username || 'user').slice(0, 3).toUpperCase() + '-' +
    String(frozenAt).toString(36).slice(-6).toUpperCase();

  const ov = document.createElement('div');
  ov.className = 'sb-freeze-overlay sb-freeze-overlay-v83';
  ov.innerHTML = `
    <div class="sb-freeze-card">
      <div class="sb-freeze-hero">
        <div class="sb-freeze-hero-glow"></div>
        <div class="sb-freeze-icon">🧊</div>
        <div class="sb-freeze-badge">ACCOUNT FROZEN</div>
        <h1 class="sb-freeze-title">Your access is on hold</h1>
        <p class="sb-freeze-sub">A moderator has temporarily frozen your account. You can still read this message, but everything else is locked until your access is restored.</p>
        <div class="sb-freeze-timer"><span class="sb-freeze-timer-dot"></span>Frozen for <strong id="sbFreezeElapsed">just now</strong></div>
      </div>
      <div class="sb-freeze-info">
        <div class="sb-freeze-info-row">
          <div class="sb-freeze-info-ico">📝</div>
          <div class="sb-freeze-info-body"><div class="sb-freeze-info-label">Reason</div><div class="sb-freeze-info-value">${esc(reason || info.reason || 'No reason given')}</div></div>
        </div>
        <div class="sb-freeze-info-row">
          <div class="sb-freeze-info-ico">🕐</div>
          <div class="sb-freeze-info-body"><div class="sb-freeze-info-label">Frozen since</div><div class="sb-freeze-info-value">${esc(typeof frozenAt === 'number' ? new Date(frozenAt).toLocaleString() : frozenAt)}</div></div>
        </div>
        <div class="sb-freeze-info-row">
          <div class="sb-freeze-info-ico">🛡️</div>
          <div class="sb-freeze-info-body"><div class="sb-freeze-info-label">Frozen by</div><div class="sb-freeze-info-value">@${esc(by)}</div></div>
        </div>
        <div class="sb-freeze-info-row">
          <div class="sb-freeze-info-ico">🔖</div>
          <div class="sb-freeze-info-body"><div class="sb-freeze-info-label">Case reference</div><div class="sb-freeze-info-value sb-freeze-mono">${esc(caseId)}</div></div>
        </div>
      </div>
      <div class="sb-freeze-perm">
        <div class="sb-freeze-perm-col">
          <div class="sb-freeze-perm-head ok">✓ Still available</div>
          <ul class="sb-freeze-perm-list">
            <li>View this notice</li>
            <li>Sign out of your account</li>
            <li>Submit an appeal after signing in</li>
          </ul>
        </div>
        <div class="sb-freeze-perm-col">
          <div class="sb-freeze-perm-head no">✕ Locked</div>
          <ul class="sb-freeze-perm-list">
            <li>Chat &amp; messaging</li>
            <li>Modules &amp; tools</li>
            <li>Settings &amp; profile changes</li>
          </ul>
        </div>
      </div>
      <div class="sb-freeze-status">
        <div class="sb-freeze-status-dot"></div>
        <span>We're checking every 3 seconds — you'll be redirected automatically the moment your access is restored.</span>
      </div>
      <div class="sb-freeze-actions">
        <button class="sb-freeze-btn secondary" id="sbFreezeSignOutBtn" type="button"><span>🚪</span> Sign out</button>
        <button class="sb-freeze-btn primary" id="sbFreezeRetryBtn" type="button"><span>↻</span> Check now</button>
      </div>
      <div class="sb-freeze-foot"><span>Think this was a mistake? Sign out and sign back in, then submit an appeal — a moderator will review your case.</span></div>
    </div>`;
  document.body.appendChild(ov);
  document.body.classList.add('sb-frozen');
  setPageTitle();

  const elapsedEl = ov.querySelector('#sbFreezeElapsed');
  const fmtElapsed = ms => {
    if (ms < 0) ms = 0;
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };
  const tickElapsed = () => {
    if (!elapsedEl) return;
    const start = typeof frozenAt === 'number' ? frozenAt : Date.now();
    const t = fmtElapsed(Date.now() - start);
    elapsedEl.textContent = t === '0s' ? 'just now' : t;
  };
  tickElapsed();
  if (window.__sbFreezeElapsed) clearInterval(window.__sbFreezeElapsed);
  window.__sbFreezeElapsed = setInterval(tickElapsed, 1000);

  const outBtn = ov.querySelector('#sbFreezeSignOutBtn');
  if (outBtn) outBtn.onclick = () => {
    try { Auth.logout(); } catch (e) {}
    try { sessionStorage.removeItem('sb26_frozen'); } catch (e) {}
    location.href = 'auth.html';
  };
  const retry = ov.querySelector('#sbFreezeRetryBtn');
  if (retry) retry.onclick = () => {
    if (!isFrozen(me.username)) {
      hideFreezeOverlay();
      try { sessionStorage.removeItem('sb26_frozen'); } catch (e) {}
      try { toast({ title: 'Unfrozen', msg: 'Welcome back!', type: 'success', dur: 3500 }); } catch (e) {}
    } else {
      retry.innerHTML = '<span>⏳</span> Still frozen…'; retry.disabled = true;
      setTimeout(() => { retry.innerHTML = '<span>↻</span> Check now'; retry.disabled = false; }, 1500);
    }
  };

  if (window.__sbFreezePoller) clearInterval(window.__sbFreezePoller);
  window.__sbFreezePoller = setInterval(() => {
    if (!document.querySelector('.sb-freeze-overlay')) { clearInterval(window.__sbFreezePoller); return; }
    if (!isFrozen(me.username)) {
      hideFreezeOverlay();
      try { sessionStorage.removeItem('sb26_frozen'); } catch (e) {}
      try { toast({ title: 'Unfrozen', msg: 'A moderator restored your access', type: 'success', dur: 4000 }); } catch (e) {}
      clearInterval(window.__sbFreezePoller);
    }
  }, 3000);
}

function hideFreezeOverlay() {
  document.querySelectorAll('.sb-freeze-overlay').forEach(el => el.remove());
  document.body.classList.remove('sb-frozen');
  if (window.__sbFreezeElapsed) { clearInterval(window.__sbFreezeElapsed); window.__sbFreezeElapsed = null; }
  if (window.__sbFreezePoller) { clearInterval(window.__sbFreezePoller); window.__sbFreezePoller = null; }
  setPageTitle();
}

try { Auth.startHeartbeat(); } catch (e) { console.warn('[app] heartbeat:', e); }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    try { Auth.startHeartbeat(); } catch (_) {}
    setPageTitle();
    if (isFrozen(me.username) && !document.querySelector('.sb-freeze-overlay')) {
      const info = getFrozenMap()[me.username];
      showFreezeOverlay(info.reason);
      try { sessionStorage.setItem('sb26_frozen', '1'); } catch (_) {}
    } else if (!isFrozen(me.username) && document.querySelector('.sb-freeze-overlay')) {
      hideFreezeOverlay();
      try { sessionStorage.removeItem('sb26_frozen'); } catch (_) {}
    }
  }
});

const state = {
  user: me,
  tabId: (Auth.getTabId && Auth.getTabId()) || 'tab-' + Math.random().toString(36).slice(2, 8),
  keys: 0, clicks: 0, modulesRun: 0,
  zombies: [], hooked: null, chatUser: null, unread: 0,
  typingTimeout: null, lastTypingSent: 0,
  pendingPreview: null, pendingEffect: null, pendingReply: null,
  digitalTool: 'draw', payAmount: '0',
  voiceRecorder: null, voiceChunks: [], voiceStream: null,
  voiceStartTime: 0, voiceTimerInt: null,
  voiceAudioCtx: null, voiceAnalyser: null, voiceData: null, voiceRafId: null, voiceBlobUrl: null,
  recentModules: [], mutedUsers: new Set(), pinnedUsers: new Set(),
  settings: { theme: 'dark', sound: true, notifications: 'all' },
};
window.SafeBeef = window.SafeBeef || {};
Object.assign(window.SafeBeef, {
  state,
  refresh: () => {
    try { if (Auth.isUserBanned(me.username) && !Auth.isOwner(me.username) && !Auth.isMod(me.username)) { location.replace('banned.html'); return; } } catch (_) {}
    window.refreshPrivilegeFlags?.();
    window.renderConversationList?.();
    window.renderHookListV28?.();
    window.updateChatBadge?.();
    window.updateMePanel?.();
  },
});
window.state = state;

let AM_OWNER = Auth.isOwner(me.username);
let AM_MOD = Auth.isMod(me.username);
let AM_PRIVILEGED = AM_OWNER || AM_MOD;
window.AM_OWNER = AM_OWNER;
window.AM_MOD = AM_MOD;
window.AM_PRIVILEGED = AM_PRIVILEGED;
window.ME = me;
window.refreshPrivilegeFlags = function () {
  AM_OWNER = Auth.isOwner(me.username);
  AM_MOD = Auth.isMod(me.username);
  AM_PRIVILEGED = AM_OWNER || AM_MOD;
  window.AM_OWNER = AM_OWNER; window.AM_MOD = AM_MOD; window.AM_PRIVILEGED = AM_PRIVILEGED;
  return { AM_OWNER, AM_MOD, AM_PRIVILEGED };
};

const SETTINGS_KEY = 'sb26_settings';
const DEFAULT_SETTINGS = {
  accent: '#4d9dff', motion: 'auto', theme: 'dark',
  sound: true, notifications: 'all',
  desktopNotif: false, pushNotif: false, enterToSend: true, typingIndicators: true,
  readReceipts: true, effects: true, showOnline: true, hideFromHooks: false, compact: false,
  volume: 1,
  notifMessages: true, notifHooks: true, notifWarns: true, notifBans: true,
  autoLogoutMin: 0, autoDeleteDays: 0, debugMode: false, fontSize: 13,
};
window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
let settings = { ...DEFAULT_SETTINGS };
try { const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); settings = { ...DEFAULT_SETTINGS, ...stored }; } catch (e) {}
window.settings = settings;

function applySettings() {
  document.documentElement.style.setProperty('--accent', settings.accent);
  document.documentElement.dataset.motion = settings.motion;
  let theme = settings.theme || 'dark';
  if (theme === 'auto') theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  document.body.classList.toggle('compact-mode', !!settings.compact);
  const fs = parseInt(settings.fontSize, 10);
  document.body.style.fontSize = (fs && fs >= 10 && fs <= 20 ? fs : 13) + 'px';
  state.settings = { ...settings };
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) {}
  try { const bc = new BroadcastChannel('sb26_settings_sync'); bc.postMessage({ action: 'settings-changed', settings: { ...settings } }); bc.close(); } catch (e) {}
}
window.applySettings = applySettings;
applySettings();

try {
  const bc = new BroadcastChannel('sb26_settings_sync');
  bc.onmessage = (e) => {
    const m = e.data || {};
    if (m.action === 'settings-changed' && m.settings) {
      settings = { ...DEFAULT_SETTINGS, ...m.settings };
      window.settings = settings;
      document.documentElement.style.setProperty('--accent', settings.accent);
      document.documentElement.dataset.motion = settings.motion;
      let theme = settings.theme || 'dark';
      if (theme === 'auto') theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      document.documentElement.dataset.theme = theme;
      document.body.classList.toggle('compact-mode', !!settings.compact);
      const fs = parseInt(settings.fontSize, 10);
      document.body.style.fontSize = (fs && fs >= 10 && fs <= 20 ? fs : 13) + 'px';
      state.settings = { ...settings };
    }
  };
} catch (e) {}

const USER_PREFS_KEY = 'sb26_user_prefs_' + me.username;
try {
  const prefs = JSON.parse(localStorage.getItem(USER_PREFS_KEY) || '{}');
  if (prefs.mutedUsers) state.mutedUsers = new Set(prefs.mutedUsers);
  if (prefs.pinnedUsers) state.pinnedUsers = new Set(prefs.pinnedUsers);
  if (prefs.recentModules) state.recentModules = prefs.recentModules;
} catch (e) {}

function saveUserPrefs() {
  try { localStorage.setItem(USER_PREFS_KEY, JSON.stringify({ mutedUsers: [...state.mutedUsers], pinnedUsers: [...state.pinnedUsers], recentModules: state.recentModules.slice(0, 8) })); } catch (e) {}
}
window.saveUserPrefs = saveUserPrefs;

const toast = window.showToast || function () {};
window.toast = toast;

let _audioCtx = null;
function beep(freq = 800, dur = 0.05, type = 'sine', vol = 0.05) {
  if (!settings.sound) return;
  const volumeMultiplier = (typeof settings.volume === 'number' ? settings.volume : 0.6);
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = _audioCtx.createOscillator(); const gain = _audioCtx.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol * volumeMultiplier, _audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + dur);
    osc.connect(gain); gain.connect(_audioCtx.destination);
    osc.start(); osc.stop(_audioCtx.currentTime + dur);
  } catch (e) {}
}
window.beep = beep;

function log(html) {
  [$('consoleOut'), $('consoleOutM')].forEach(out => {
    if (!out) return;
    const line = document.createElement('div');
    line.className = 'line'; line.innerHTML = html;
    out.appendChild(line); out.scrollTop = out.scrollHeight;
    while (out.children.length > 500) out.removeChild(out.firstChild);
  });
  if (settings.debugMode) console.log('[SafeBeef]', html.replace(/<[^>]+>/g, ''));
}
window.log = log;
window.SafeBeef.log = log;

function showDialog(opts) {
  const buttons = opts.buttons || [{ label: 'Close', action: 'close' }];
  const overlay = document.createElement('div');
  overlay.className = 'sb-overlay-fullscreen';
  overlay.style.background = 'rgba(0,0,0,.75)'; overlay.style.backdropFilter = 'blur(6px)'; overlay.style.cursor = 'default';
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--surface);border:1px solid var(--border-2);border-radius:16px;max-width:600px;width:100%;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow-xl)';
  card.innerHTML = `
    <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;background:var(--surface-2)"><div style="font-size:22px">${opts.icon || '🐝'}</div><div style="flex:1"><h3 style="font-size:14px;font-weight:800">${esc(opts.title)}</h3>${opts.subtitle ? `<div style="font-size:11px;color:var(--text-3)">${esc(opts.subtitle)}</div>` : ''}</div><button class="dlg-close" style="background:none;border:none;color:var(--text-3);font-size:22px">×</button></div>
    <div style="padding:20px;overflow-y:auto;flex:1">${opts.bodyHtml || ''}</div>
    <div class="dlg-foot" style="padding:16px 20px;border-top:1px solid var(--border);display:flex;gap:10px;justify-content:flex-end;background:var(--surface-2)">${buttons.map((b, i) => `<button class="btn ${b.class || ''}" data-idx="${i}">${esc(b.label)}</button>`).join('')}</div>`;
  overlay.appendChild(card); document.body.appendChild(overlay);
  const close = () => overlay.remove();
  card.querySelector('.dlg-close').onclick = close;
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  buttons.forEach((b, i) => { const btn = card.querySelector(`[data-idx="${i}"]`); if (btn) btn.onclick = () => { if (b.action === 'close') close(); else if (typeof b.action === 'function') b.action(); }; });
  return { close, overlay, card };
}
window.showDialog = showDialog;

if (typeof window.reportUser !== 'function') {
  window.reportUser = function (target, reason, reportedMessage) {
    if (!target) return { error: 'No target specified' };
    if (!reason) return { error: 'No reason specified' };
    if (target === me.username) return { error: 'You cannot report yourself' };
    let reports = [];
    try { reports = JSON.parse(localStorage.getItem('sb26_reports') || '[]') || []; } catch (e) {}
    if (!Array.isArray(reports)) reports = [];
    const recent = reports.find(r => r.target === target && r.reporter === me.username && !r.resolved && Date.now() - r.at < 60000);
    if (recent) return { error: 'Already reported recently' };
    reports.push({ id: 'r-' + Date.now(), target, reporter: me.username, reason, reportedMessage: reportedMessage || '', at: Date.now(), resolved: false });
    if (reports.length > 500) reports = reports.slice(-500);
    try { localStorage.setItem('sb26_reports', JSON.stringify(reports)); } catch (e) {}
    try { window.appChannel?.postMessage({ type: 'report-created' }); } catch (e) {}
    return { success: true };
  };
}

/* ---------- REPORT USER DIALOG ---------- */
function openReportDialog() {
  const users = (window.Auth && Auth.getUsers) ? Auth.getUsers() : {};
  const others = Object.values(users).filter(u => u && u.username && u.username !== me.username);
  if (!others.length) {
    toast({ title: 'No users to report', msg: 'There are no other users right now', type: 'warn' });
    return;
  }
  others.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
  const optsHtml = others.map(u =>
    `<option value="${esc(u.username)}">${esc(u.display || u.username)} (@${esc(u.username)})</option>`
  ).join('');
  const dlg = showDialog({
    icon: '🚩',
    title: 'Report a User',
    subtitle: 'Submit a report to the moderation team',
    bodyHtml: `
      <div style="display:flex;flex-direction:column;gap:14px">
        <div>
          <label style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-3);font-weight:800;display:block;margin-bottom:6px">User to report</label>
          <select id="reportUserSel" style="width:100%;padding:11px 14px;background:var(--bg);border:1px solid var(--border-2);border-radius:10px;color:var(--text);font-size:13px;font-family:inherit;outline:none;cursor:pointer">${optsHtml}</select>
        </div>
        <div>
          <label style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-3);font-weight:800;display:block;margin-bottom:6px">Reason</label>
          <textarea id="reportReason" placeholder="Describe what happened…" style="width:100%;padding:11px 14px;background:var(--bg);border:1px solid var(--border-2);border-radius:10px;color:var(--text);font-size:13px;font-family:inherit;outline:none;min-height:100px;resize:vertical;line-height:1.5;box-sizing:border-box"></textarea>
        </div>
        <div style="padding:10px 12px;background:var(--amber-bg);border:1px solid var(--amber-border);border-radius:9px;font-size:11.5px;color:var(--amber-2);line-height:1.5">⚠ False or abusive reports may result in action against your own account.</div>
      </div>`,
    buttons: [
      { label: 'Cancel', action: 'close' },
      { label: 'Submit Report', class: 'primary', action: () => {
        const sel = dlg.card.querySelector('#reportUserSel');
        const reasonEl = dlg.card.querySelector('#reportReason');
        const target = sel ? sel.value : '';
        const reason = reasonEl ? reasonEl.value.trim() : '';
        if (!target) { toast({ title: 'No user', msg: 'Select a user to report', type: 'warn' }); return; }
        if (!reason) { toast({ title: 'Reason required', msg: 'Describe the issue', type: 'warn' }); return; }
        const res = window.reportUser ? window.reportUser(target, reason, '') : { error: 'Reporting not available' };
        if (res && res.error) { toast({ title: 'Cannot report', msg: res.error, type: 'error' }); return; }
        toast({ title: 'Report submitted', msg: 'A moderator will review it shortly', type: 'success', dur: 5000 });
        try { window.SafeBeef?.appChannel?.postMessage({ type: 'report-created' }); } catch (e) {}
        try { window.Live?.emit?.('modPanel'); } catch (e) {}
        dlg.close();
      }}
    ]
  });
}
window.openReportDialog = openReportDialog;

function addZombie(profile, isMe) {
  if (!profile || !profile.username) return;
  const existing = state.zombies.find(z => z.tabId === profile.tabId);
  if (existing) {
    existing.lastSeen = Date.now();
    if (typeof profile.visible !== 'undefined') existing.visible = profile.visible;
    if (typeof profile.hookable !== 'undefined') existing.hookable = profile.hookable;
    if (profile.display) existing.display = profile.display;
    if (profile.avatar) existing.avatar = profile.avatar;
    if (profile.color) existing.color = profile.color;
  } else {
    state.zombies.push({ username: profile.username, display: profile.display, avatar: profile.avatar, color: profile.color, tabId: profile.tabId, isMe, lastSeen: Date.now(), visible: profile.visible !== false, hookable: profile.hookable !== false });
  }
  window.renderHookListV28?.();
  window.renderConversationList?.();
  updateOnlineCount();
}
function removeZombie(tabId) {
  state.zombies = state.zombies.filter(z => z.tabId !== tabId);
  window.renderHookListV28?.();
  window.renderConversationList?.();
  updateOnlineCount();
}
function updateOnlineCount() {
  const el = $('onlineCount');
  if (el) el.textContent = state.zombies.filter(z => !z.isMe && z.visible !== false).length;
}
setInterval(() => {
  const now = Date.now();
  const before = state.zombies.length;
  state.zombies = state.zombies.filter(z => z.isMe || now - z.lastSeen < 10000);
  if (state.zombies.length !== before) { window.renderHookListV28?.(); window.renderConversationList?.(); updateOnlineCount(); }
}, 5000);

function isUserOnline(username) { return !!state.zombies.find(z => z.username === username && !z.isMe && z.visible !== false); }
window.isUserOnline = isUserOnline;

function reportAction(actionType) {
  if (window.AM_PRIVILEGED) return;
  if (!window.Auth || !Auth.reportSuspiciousAction) return;
  let result;
  try { result = Auth.reportSuspiciousAction(me.username, actionType); } catch (e) { return; }
  if (!result) return;
  if (result.action === 'ban') {
    toast({ title: 'Auto-banned', msg: 'Suspicious activity detected — redirecting…', type: 'error', dur: 6000 });
    setTimeout(() => location.replace('banned.html'), 1200);
  } else if (result.action === 'warn') {
    const c = result.count || 0;
    toast({ title: 'Warning issued', msg: `${c} automated warning${c === 1 ? '' : 's'} on file.`, type: 'warn', dur: 6000 });
  }
}
window.reportAction = reportAction;

function roleBadgeFor(username) {
  if (Auth.isOwner(username)) return '<span class="role-tag owner">OWNER</span>';
  if (Auth.isMod(username)) return '<span class="role-tag mod">MOD</span>';
  return '';
}
window.roleBadgeFor = roleBadgeFor;

function trackRecentModule(id) {
  state.recentModules = [id, ...state.recentModules.filter(x => x !== id)].slice(0, 8);
  saveUserPrefs(); renderRecentModules();
}
window.trackRecentModule = trackRecentModule;

function renderRecentModules() {
  ['recentModulesBar', 'recentModulesBarM'].forEach(barId => {
    const bar = $(barId); if (!bar) return;
    if (!state.recentModules.length) { bar.innerHTML = ''; bar.style.display = 'none'; return; }
    bar.style.display = 'flex';
    bar.innerHTML = state.recentModules.slice(0, 5).map(id => { const mod = (window.MODULE_REGISTRY || []).find(x => x.id === id); if (!mod) return ''; return `<button class="recent-module-chip" data-module-id="${esc(id)}"><span class="ico">${mod.ico}</span><span>${esc(mod.name)}</span></button>`; }).join('');
    bar.querySelectorAll('[data-module-id]').forEach(btn => { btn.onclick = () => window.runModule?.(btn.dataset.moduleId); });
  });
}
window.renderRecentModules = renderRecentModules;

function renderModules(filter = '') {
  const q = filter.trim().toLowerCase();
  const grouped = {};
  (window.MODULE_REGISTRY || []).forEach(m => {
    if (q && !(m.name.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))) return;
    (grouped[m.cat] = grouped[m.cat] || []).push(m);
  });
  let html = '';
  for (const cat in grouped) {
    html += `<div class="m-cat-group"><div class="m-cat-title">${esc(cat)}</div><div class="modules">`;
    grouped[cat].forEach(m => { html += `<button class="module" data-module-id="${esc(m.id)}" data-cat="${esc(m.cat)}"><span class="m-ico">${m.ico}</span><span class="m-name">${esc(m.name)}</span><span class="m-desc">${esc(m.desc)}</span></button>`; });
    html += `</div></div>`;
  }
  const d = $('modulesWrap'); if (d) d.innerHTML = html || '<div class="empty-state">No modules match.</div>';
  const mm = $('modulesWrapMobile'); if (mm) mm.innerHTML = html || '<div class="empty-state">No modules match.</div>';
}
window.renderModules = renderModules;

function wireConsole() {
  [['consoleIn', 'consoleRun'], ['consoleInM', 'consoleRunM']].forEach(([i, b]) => {
    const input = $(i), btn = $(b); if (!input || !btn) return;
    const hist = []; let hi = -1;
    const run = () => { const v = input.value; input.value = ''; hi = -1; if (v.trim()) { hist.push(v); runCommand(v); } };
    btn.addEventListener('click', run);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); run(); }
      else if (e.key === 'ArrowUp' && hist.length && hi < hist.length - 1) { hi++; input.value = hist[hist.length - 1 - hi]; e.preventDefault(); }
      else if (e.key === 'ArrowDown') { if (hi > 0) { hi--; input.value = hist[hist.length - 1 - hi]; } else { hi = -1; input.value = ''; } e.preventDefault(); }
    });
  });
}

function runCommand(cmd) {
  log(`<span style="color:var(--accent)">❯</span> ${esc(cmd)}`);
  const parts = cmd.trim().split(/\s+/);
  const c = parts[0].toLowerCase();
  if (c === 'help') log('Available: <code>help</code> <code>clear</code> <code>hook &lt;user&gt;</code> <code>unhook</code> <code>msg &lt;user&gt;</code> <code>modules</code> <code>ver</code> <code>stats</code> <code>settings</code> <code>report &lt;user&gt; &lt;reason&gt;</code>' + (window.AM_PRIVILEGED ? ' <code>mod</code> <code>freeze &lt;user&gt;</code> <code>unfreeze &lt;user&gt;</code>' : ''));
  else if (c === 'clear') [$('consoleOut'), $('consoleOutM')].forEach(o => { if (o) o.innerHTML = ''; });
  else if (c === 'hook' && parts[1]) window.hookTarget?.(parts[1]);
  else if (c === 'unhook') window.unhookTarget?.();
  else if (c === 'msg' && parts[1]) window.App?.chatWith(parts[1]);
  else if (c === 'report' && parts[1]) { const reason = parts.slice(2).join(' ') || 'Reported from console'; const res = window.reportUser?.(parts[1], reason, ''); if (res && res.error) log(`<span style="color:var(--red-2)">✕ ${esc(res.error)}</span>`); else log(`<span style="color:var(--green-2)">✓</span> report filed on @${esc(parts[1])}`); }
  else if (c === 'freeze' && parts[1] && window.AM_PRIVILEGED) { const map = JSON.parse(localStorage.getItem('sb26_frozen_users') || '{}'); map[parts[1]] = { reason: 'Frozen via console', at: Date.now(), by: me.username }; localStorage.setItem('sb26_frozen_users', JSON.stringify(map)); try { window.RT?.emit?.('freeze', { username: parts[1], reason: 'Frozen via console' }); } catch (e) {} log(`<span style="color:var(--purple-2)">🧊 Frozen</span> @${esc(parts[1])}`); }
  else if (c === 'unfreeze' && parts[1] && window.AM_PRIVILEGED) { const map = JSON.parse(localStorage.getItem('sb26_frozen_users') || '{}'); delete map[parts[1]]; localStorage.setItem('sb26_frozen_users', JSON.stringify(map)); try { window.RT?.emit?.('unfreeze', { username: parts[1] }); } catch (e) {} log(`<span style="color:var(--green-2)">☀ Unfrozen</span> @${esc(parts[1])}`); }
  else if (c === 'modules') log(`Loaded: ${(window.MODULE_REGISTRY || []).length} modules`);
  else if (c === 'stats') window.App?.openStats();
  else if (c === 'settings') window.App?.openSettings();
  else if (c === 'mod' && window.AM_PRIVILEGED) window.App?.openModPanel();
  else if (c === 'ver') log('SafeBeef v83 — Full upgrade');
  else log(`Unknown: <code>${esc(c)}</code>`);
}
window.runCommand = runCommand;

function initResizers() {
  const root = document.documentElement;
  const MIN_LEFT = 0, MAX_LEFT = 560;
  const MIN_RIGHT = 0, MAX_RIGHT = 800;
  const COLLAPSE_THRESHOLD = 40;
  const DEFAULT_LEFT = 220, DEFAULT_RIGHT = 360;
  const leftPane = document.getElementById('paneLeft');
  const rightPane = document.getElementById('paneRight');
  function applyCollapse(pane, width) { if (!pane) return; if (width < COLLAPSE_THRESHOLD) pane.classList.add('pane-collapsed'); else pane.classList.remove('pane-collapsed'); }
  function setLeft(w) { w = Math.max(MIN_LEFT, Math.min(MAX_LEFT, Math.round(w))); root.style.setProperty('--pane-left-w', w + 'px'); applyCollapse(leftPane, w); return w; }
  function setRight(w) { w = Math.max(MIN_RIGHT, Math.min(MAX_RIGHT, Math.round(w))); root.style.setProperty('--pane-right-w', w + 'px'); applyCollapse(rightPane, w); return w; }
  document.querySelectorAll('.pane-resizer').forEach(handle => {
    handle.addEventListener('mousedown', e => {
      e.preventDefault();
      const side = handle.dataset.resize; const startX = e.clientX;
      const startL = parseInt(getComputedStyle(root).getPropertyValue('--pane-left-w'), 10) || DEFAULT_LEFT;
      const startR = parseInt(getComputedStyle(root).getPropertyValue('--pane-right-w'), 10) || DEFAULT_RIGHT;
      document.body.style.userSelect = 'none'; document.body.style.cursor = 'col-resize';
      const move = ev => { if (side === 'left') setLeft(startL + (ev.clientX - startX)); else setRight(startR - (ev.clientX - startX)); };
      const up = () => {
        document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up);
        document.body.style.userSelect = ''; document.body.style.cursor = '';
        try { const lw = parseInt(getComputedStyle(root).getPropertyValue('--pane-left-w'), 10) || 0; const rw = parseInt(getComputedStyle(root).getPropertyValue('--pane-right-w'), 10) || 0; localStorage.setItem('sb26_leftW', lw); localStorage.setItem('sb26_rightW', rw); } catch (_) {}
      };
      document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    });
    handle.addEventListener('dblclick', e => {
      e.preventDefault();
      const side = handle.dataset.resize;
      if (side === 'left') { const cur = parseInt(getComputedStyle(root).getPropertyValue('--pane-left-w'), 10) || 0; const target = cur < COLLAPSE_THRESHOLD ? DEFAULT_LEFT : 0; setLeft(target); try { localStorage.setItem('sb26_leftW', target); } catch (_) {} }
      else { const cur = parseInt(getComputedStyle(root).getPropertyValue('--pane-right-w'), 10) || 0; const target = cur < COLLAPSE_THRESHOLD ? DEFAULT_RIGHT : 0; setRight(target); try { localStorage.setItem('sb26_rightW', target); } catch (_) {} }
    });
  });
  try { const sl = localStorage.getItem('sb26_leftW'); const sr = localStorage.getItem('sb26_rightW'); if (sl !== null) setLeft(parseInt(sl, 10) || 0); if (sr !== null) setRight(parseInt(sr, 10) || 0); } catch (_) {}
  const cycleStyles = ['default', 'minimal', 'glow', 'glass'];
  const styleKeyFor = side => side === 'left' ? 'sb26_pane_left_style' : 'sb26_pane_right_style';
  function applyPaneStyle(pane, key, style) { if (!pane) return; if (style && cycleStyles.includes(style)) pane.dataset.paneStyle = style; else delete pane.dataset.paneStyle; try { localStorage.setItem(key, pane.dataset.paneStyle || 'default'); } catch (_) {} }
  function injectStyleCycler(pane, side) {
    if (!pane) return; const head = pane.querySelector('.pane-head'); if (!head) return; if (head.querySelector('.pane-style-btn')) return;
    const btn = document.createElement('button'); btn.className = 'pane-style-btn'; btn.type = 'button'; btn.title = 'Cycle pane style'; btn.textContent = '✦';
    btn.onclick = (e) => { e.stopPropagation(); const cur = pane.dataset.paneStyle || 'default'; const idx = cycleStyles.indexOf(cur); const next = cycleStyles[(idx + 1) % cycleStyles.length]; applyPaneStyle(pane, styleKeyFor(side), next); try { toast?.('Pane style', side === 'left' ? `Hook · ${next}` : `Console · ${next}`, 'success', 1400); } catch (_) {} };
    head.appendChild(btn);
  }
  try { const ls = localStorage.getItem('sb26_pane_left_style') || 'default'; const rs = localStorage.getItem('sb26_pane_right_style') || 'default'; if (leftPane && ls !== 'default') leftPane.dataset.paneStyle = ls; if (rightPane && rs !== 'default') rightPane.dataset.paneStyle = rs; } catch (_) {}
  injectStyleCycler(leftPane, 'left'); injectStyleCycler(rightPane, 'right');
}

async function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try { const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' }); await navigator.serviceWorker.ready; return reg; } catch (e) { console.warn('[app] SW registration failed:', e); return null; }
}

window.switchMobileView = function (view) { document.querySelectorAll('.mobile-view').forEach(v => v.classList.remove('on')); const target = document.getElementById('view-' + view); if (target) target.classList.add('on'); document.querySelectorAll('.mnav-btn').forEach(b => { b.classList.toggle('on', b.dataset.view === view); }); };
window.openSheet = function (id) { const sheet = document.getElementById(id); if (sheet) sheet.classList.add('show'); };
window.closeSheet = function (id) { const sheet = document.getElementById(id); if (sheet) sheet.classList.remove('show'); };

function updateInputBlockState() {
  const input = document.getElementById('imsgInput'); const sendBtn = document.getElementById('imsgSendBtn'); const plusBtn = document.getElementById('imsgPlusBtn');
  if (!input) return;
  const block = Auth.canSendMessages(ME.username);
  if (block) {
    input.disabled = true; input.placeholder = `${block.label} — ${block.detail}`; input.classList.add('imsg-input-blocked');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.classList.remove('active'); }
    if (plusBtn) plusBtn.disabled = true;
    let banner = document.getElementById('imsgBlockBanner');
    if (!banner) {
      banner = document.createElement('div'); banner.id = 'imsgBlockBanner'; banner.className = 'imsg-block-banner';
      const inputRow = document.querySelector('.imsg-input-row'); if (inputRow) inputRow.parentElement.insertBefore(banner, inputRow);
    }
    const icon = block.reason === 'banned' ? '🚫' : block.reason === 'frozen' ? '🧊' : '🔇';
    banner.innerHTML = `<div class="imsg-block-icon">${icon}</div><div class="imsg-block-body"><div class="imsg-block-title">${esc(block.label)}</div><div class="imsg-block-detail">${esc(block.detail)}</div><div class="imsg-block-time">${block.permanent ? '<span style="color:var(--red-2)">Permanent</span>' : block.until ? `Remaining: <strong data-countdown="${block.until}">${block.remainingLabel}</strong>` : ''}</div></div>`;
  } else {
    input.disabled = false; input.placeholder = 'iMessage'; input.classList.remove('imsg-input-blocked');
    if (sendBtn) sendBtn.disabled = false; if (plusBtn) plusBtn.disabled = false;
    document.getElementById('imsgBlockBanner')?.remove();
  }
}
window.updateInputBlockState = updateInputBlockState;

setInterval(() => {
  document.querySelectorAll('[data-countdown]').forEach(el => {
    const until = parseInt(el.dataset.countdown, 10); if (!until) return;
    const remaining = until - Date.now();
    if (remaining <= 0) { el.textContent = 'Expired'; updateInputBlockState(); return; }
    el.textContent = Auth.formatDuration(remaining);
  });
}, 1000);

/* ============================================================================
   REALTIME WIRING — all handlers hardened
   ============================================================================ */
function wireRealtime() {
  if (!window.RT || typeof RT.on !== 'function') return;

  // Mirror a notification to the user's other subscribed devices (push). The
  // local `new Notification` calls below only reach an open tab; this reaches
  // closed tabs / phones for the same account.
  const pushTo = (username, title, body, extra) => {
    try {
      window.pushToUser?.(username, Object.assign({
        title, body, tag: 'safebeef', silent: true, type: 'info', url: './index.html',
      }, extra || {}));
    } catch (_) {}
  };

  RT.on('ban-changed', ({ username } = {}) => {
    let isBanned = false;
    try { isBanned = Auth.isUserBanned(username || ME.username); } catch (_) {}
    if (username === ME.username && !window.AM_PRIVILEGED && isBanned) {
      try { sessionStorage.removeItem('sb26_session'); } catch (_) {}
      try {
        sessionStorage.setItem('sb26_banned_preview', ME.username);
        const info = Auth.getBanInfo(ME.username);
        if (info) sessionStorage.setItem('sb26_banned_info', JSON.stringify({ username: ME.username, display: ME.display, avatar: ME.avatar, color: ME.color, info }));
      } catch (_) {}
      location.replace('banned.html'); return;
    }
    if (document.querySelector('.mod-panel') && window.AM_PRIVILEGED) { document.querySelector('.mod-panel').remove(); window.openModPanel?.(); }
    window.renderConversationList?.();
  });

  RT.on('ban-cleared', () => {
    if (document.querySelector('.mod-panel') && window.AM_PRIVILEGED) {
      document.querySelector('.mod-panel').remove();
      window.openModPanel?.();
    }
    window.renderConversationList?.();
  });

  /* ---------- Role change: full UI wipe when losing privileges ---------- */
  RT.on('role-changed', ({ username, role }) => {
    if (username === ME.username) {
      window.refreshPrivilegeFlags();
      const stillPriv = !!window.AM_PRIVILEGED;
      setModEntryVisible(stillPriv);
      if (!stillPriv) {
        // Nuke ALL mod UI layers, restore body scroll
        removeAllModUI();
      }
      toast({ title: 'Role updated', msg: `You are now ${role}`, type: role === 'mod' || role === 'owner' ? 'success' : 'warn', dur: 4000 });
      window.updateMePanel?.();
      window.renderConversationList?.();
      return;
    }
    if (document.querySelector('.mod-panel') && window.AM_PRIVILEGED) {
      document.querySelector('.mod-panel').remove();
      window.openModPanel?.();
    }
    window.renderConversationList?.();
  });

  RT.on('kick', ({ username, reason }) => {
    if (username !== ME.username) return;
    if (window.AM_PRIVILEGED) return;
    toast({ title: 'You were kicked', msg: reason || 'A moderator removed you from this session', type: 'error', dur: 5000 });
    if (settings.desktopNotif && Notification.permission === 'granted') {
      try { new Notification('You were kicked', { body: reason || 'A moderator removed you from this session', tag: 'safebeef', silent: true }); } catch (_) {}
    }
    pushTo(ME.username, 'You were kicked', reason || 'A moderator removed you from this session', { type: 'error' });
    try { Auth.logout(); } catch (_) {}
    document.querySelectorAll('.sb-kick-overlay').forEach(el => el.remove());
    const ov = document.createElement('div');
    ov.className = 'sb-overlay-fullscreen sb-kick-overlay';
    ov.style.cssText = 'background:rgba(0,0,0,.92);z-index:999999;cursor:default';
    ov.innerHTML = `<div style="max-width:420px;padding:32px;background:var(--surface);border:2px solid var(--red);border-radius:16px;text-align:center;color:var(--text)"><div style="font-size:56px;margin-bottom:16px">🚪</div><h2 style="font-size:20px;font-weight:900;margin-bottom:12px;color:var(--red-2)">You were kicked</h2><p style="font-size:13px;color:var(--text-2);line-height:1.6;margin-bottom:16px">${reason ? `<strong style="color:var(--amber-2)">${esc(reason)}</strong><br>` : ''}A moderator removed you from this session.</p><button class="btn primary" style="width:100%" onclick="location.href='auth.html'">Sign in again</button></div>`;
    document.body.appendChild(ov);
  });

  RT.on('mute', ({ username, until, reason }) => {
    if (username !== ME.username) return;
    if (settings.notifWarns === false) return;
    const untilLabel = until == null ? 'Permanent' : Auth.formatDuration(until - Date.now());
    toast({ title: 'You have been muted', msg: `${reason || 'Muted by moderator'}${until == null ? '' : ' · ' + untilLabel + ' remaining'}`, type: 'error', dur: 6000 });
    if (settings.desktopNotif && Notification.permission === 'granted') {
      try { new Notification('You have been muted', { body: reason || 'Muted by moderator', tag: 'safebeef', silent: true }); } catch (_) {}
    }
    pushTo(ME.username, 'You have been muted', `${reason || 'Muted by moderator'}${until == null ? '' : ' · ' + untilLabel + ' remaining'}`, { type: 'error' });
    updateInputBlockState();
  });

  RT.on('unmute', ({ username }) => {
    if (username !== ME.username) return;
    toast({ title: 'Unmuted', msg: 'You can send messages again', type: 'success', dur: 4000 });
    if (settings.desktopNotif && Notification.permission === 'granted') {
      try { new Notification('Unmuted', { body: 'You can send messages again', tag: 'safebeef', silent: true }); } catch (_) {}
    }
    pushTo(ME.username, 'Unmuted', 'You can send messages again', { type: 'success' });
    updateInputBlockState();
  });

  RT.on('freeze', ({ username, reason }) => {
    if (username !== ME.username) return;
    try { sessionStorage.setItem('sb26_frozen', '1'); } catch (_) {}
    showFreezeOverlay(reason);
    if (settings.desktopNotif && Notification.permission === 'granted') {
      try { new Notification('You have been frozen', { body: reason || 'Your access was frozen by a moderator', tag: 'safebeef', silent: true }); } catch (_) {}
    }
    pushTo(ME.username, 'You have been frozen', reason || 'Your access was frozen by a moderator', { type: 'error', requireInteraction: true });
    updateInputBlockState();
  });

  RT.on('unfreeze', ({ username }) => {
    if (username !== ME.username) return;
    try { sessionStorage.removeItem('sb26_frozen'); } catch (_) {}
    hideFreezeOverlay();
    toast({ title: 'Unfrozen', msg: 'A moderator restored your access', type: 'success', dur: 4000 });
    if (settings.desktopNotif && Notification.permission === 'granted') {
      try { new Notification('Unfrozen', { body: 'A moderator restored your access', tag: 'safebeef', silent: true }); } catch (_) {}
    }
    pushTo(ME.username, 'Unfrozen', 'A moderator restored your access', { type: 'success' });
    updateInputBlockState();
  });

  RT.on('warn-changed', ({ username, info }) => {
    if (username !== ME.username) return;
    if (settings.notifWarns === false) return;
    if (info && info.cleared) {
      toast({ title: 'Warnings cleared', msg: 'A moderator cleared your warnings', type: 'success', dur: 4000 });
      if (settings.desktopNotif && Notification.permission === 'granted') {
        try { new Notification('Warnings cleared', { body: 'A moderator cleared your warnings', tag: 'safebeef', silent: true }); } catch (_) {}
      }
      pushTo(ME.username, 'Warnings cleared', 'A moderator cleared your warnings', { type: 'success' });
      return;
    }
    toast({ title: 'Warning received', msg: `${(info && info.reason) || 'Rule violation'} · ${(info && info.count) || 0} total`, type: 'warn', dur: 6000 });
    if (settings.desktopNotif && Notification.permission === 'granted') {
      try { new Notification('Warning received', { body: `${(info && info.reason) || 'Rule violation'} · ${(info && info.count) || 0} total`, tag: 'safebeef', silent: true }); } catch (_) {}
    }
    pushTo(ME.username, 'Warning received', `${(info && info.reason) || 'Rule violation'} · ${(info && info.count) || 0} total`, { type: 'warn' });
  });

  RT.on('force-signout', ({ username }) => {
    if (username !== ME.username) return;
    if (window.AM_PRIVILEGED) return;
    toast({ title: 'Signed out', msg: 'You have been signed out by a moderator', type: 'error', dur: 4000 });
    if (settings.desktopNotif && Notification.permission === 'granted') {
      try { new Notification('Signed out', { body: 'You have been signed out by a moderator', tag: 'safebeef', silent: true }); } catch (_) {}
    }
    pushTo(ME.username, 'Signed out', 'You have been signed out by a moderator', { type: 'error' });
    try { Auth.logout(); } catch (_) {}
    location.replace('auth.html');
  });

  RT.on('message-blocked', ({ username, reason, until }) => {
    if (username !== ME.username) return;
    const untilLabel = until == null ? 'Permanent' : Auth.formatDuration(until - Date.now());
    toast({ title: 'Cannot send', msg: `${reason} · ${untilLabel}`, type: 'error', dur: 5000 });
    if (settings.desktopNotif && Notification.permission === 'granted') {
      try { new Notification('Cannot send', { body: `${reason} · ${untilLabel}`, tag: 'safebeef', silent: true }); } catch (_) {}
    }
    pushTo(ME.username, 'Cannot send', `${reason} · ${untilLabel}`, { type: 'error' });
  });

  /* ---------- FIX: direct-notify — never shows "object Object" ---------- */
  RT.on('direct-notify', ({ to, from, msg }) => {
    if (to !== ME.username) return;
    if (settings.notifMessages === false) return;
    const msgText = safeString(msg, '(no message)').slice(0, 200);
    toast({
      title: `📬 Message from @${from}`,
      msg: msgText,
      type: 'message',
      dur: 6000,
      onClick: () => window.App?.chatWith(from),
      clickHint: 'Open chat'
    });
    beep(1100, 0.12, 'sine', 0.07);
    if (settings.desktopNotif && Notification.permission === 'granted') {
      try { new Notification(`💬 Message from @${from}`, { body: msgText, tag: 'safebeef', silent: true }); } catch (_) {}
    }
    pushTo(ME.username, `Message from @${from}`, msgText, { type: 'message' });
  });

  RT.on('broadcast', ({ from, title, msg, type }) => {
    try { window.sendPushToAll?.({ title: `📢 ${safeString(title, 'Announcement')}`, body: `@${from}: ${safeString(msg, '')}`, type: type || 'info', tag: 'safebeef-announce' }); } catch (_) {}
    const users = (window.Auth && Auth.getUsers) ? Auth.getUsers() : {};
    const sender = users[from] || {};
    try {
      if (typeof window.showAnnouncement === 'function') {
        window.showAnnouncement({
          title: safeString(title, 'Announcement'),
          msg: safeString(msg, ''),
          type: type || 'info',
          from,
          fromDisplay: sender.display || from,
          fromAvatar: sender.avatar || (from || '??').slice(0, 2).toUpperCase(),
          fromColor: sender.color || '#4d9dff',
          fromRole: sender.role === 'owner' ? 'Owner' : sender.role === 'mod' ? 'Moderator' : 'Staff',
          dur: 12000
        });
      } else {
        toast({ title: `📢 ${safeString(title, 'Announcement')}`, msg: `@${from}: ${safeString(msg, '')}`, type: type || 'info', dur: 8000 });
      }
    } catch (err) {
      toast({ title: `📢 ${safeString(title, 'Announcement')}`, msg: `@${from}: ${safeString(msg, '')}`, type: type || 'info', dur: 8000 });
    }
  });

  RT.on('force-reload', ({ username }) => {
    if (username !== ME.username && username !== '__ALL__') return;
    if (window.AM_PRIVILEGED && username === '__ALL__') return;
    location.reload();
  });
}

window.addEventListener('storage', (e) => {
  if (e.key !== 'sb26_frozen_users') return;
  setPageTitle();
  if (isFrozen(me.username) && !document.querySelector('.sb-freeze-overlay')) {
    const info = getFrozenMap()[me.username];
    showFreezeOverlay(info?.reason);
    try { sessionStorage.setItem('sb26_frozen', '1'); } catch (_) {}
  } else if (!isFrozen(me.username) && document.querySelector('.sb-freeze-overlay')) {
    hideFreezeOverlay();
    try { sessionStorage.removeItem('sb26_frozen'); } catch (_) {}
  }
});

window.App = {
  chatWith(username) { window.openConversation?.(username); },
  openChat() { window.openChat?.(); },
  closeChat() { window.closeChat?.(); },
  openHookLog(username) { window.openHookLog?.(username); },
  openProfile() { window.openProfile?.(); },
  openSettings() { window.openSettings?.(); },
  openStats() { window.openStats?.(); },
  openModPanel() { window.openModPanel?.(); },
  openReportDialog() { window.openReportDialog?.(); },
  openAccounts() { location.href = 'auth.html'; },
  testPush() { window.pushNotification?.('Test', 'This is a test notification'); },
  logout() { try { Auth.logout(); } catch (_) {} location.replace('auth.html'); },
  openCommandPalette() { window.openCommandPalette?.(); },
  openLegalPage(path) {
    if (window.Router?.openLegalPage) { window.Router.openLegalPage(path); return; }
    // Fallback: navigate directly to the legal page file.
    const file = { about:'about.html', terms:'terms.html', privacy:'privacy.html', help:'help.html' }[path] || `${path}.html`;
    try { location.href = file; } catch (e) {}
  },
  reportUser(target, reason, message) { return window.reportUser?.(target, reason, message); },
};

const BC_NAME = 'safebeef_v26';
let appChannel = null;
window.appChannel = null;
window.SafeBeef.appChannel = null;

function initChannel() {
  if (typeof BroadcastChannel === 'undefined') return;
  try { appChannel = new BroadcastChannel(BC_NAME); } catch (e) { console.warn('[app] BroadcastChannel failed:', e); return; }
  window.appChannel = appChannel; window.SafeBeef.appChannel = appChannel;
  if (window.Live) Live.wireChannel(appChannel);
  const makeProfile = () => ({ username: me.username, display: me.display, avatar: me.avatar, color: me.color, tabId: state.tabId, ts: Date.now(), visible: window.settings.showOnline !== false, hookable: window.settings.hideFromHooks !== true });
  addZombie(makeProfile(), true);
  appChannel.postMessage({ type: 'join', profile: makeProfile() });
  appChannel.onmessage = e => {
    const m = e.data || {};
    if (m.type === 'join' || m.type === 'ping') { addZombie(m.profile, m.profile.username === me.username); if (m.type === 'join') appChannel.postMessage({ type: 'ack', profile: makeProfile() }); }
    else if (m.type === 'ack') addZombie(m.profile, m.profile.username === me.username);
    else if (m.type === 'leave') removeZombie(m.tabId);
    else if (m.type === 'chat') window.handleIncomingChat?.(m.data);
    else if (m.type === 'chat-typing') window.handleTyping?.(m);
    else if (m.type === 'chat-seen') window.handleSeen?.(m);
    else if (m.type === 'chat-delivered') window.handleDelivered?.(m);
    else if (m.type === 'chat-deleted') window.handleDelete?.(m);
    else if (m.type === 'chat-edited') window.handleEdited?.(m);
    else if (m.type === 'execute-module') window.handleRemoteModule?.(m);
    else if (m.type === 'hook-log') window.handleHookLogEntry?.(m.data);
    else if (m.type === 'media-captured') window.handleMediaCaptured?.(m);
    else if (m.type === 'report-created') { if (window.Live) { Live.emit('modPanel'); Live.emitDebounced('stats', null, 100); } }
    else if (m.type === 'pin-updated') { if (window.handlePinUpdate) window.handlePinUpdate(m); }
    else if (m.type === 'force-reload') { if (m.username === ME.username || m.username === '__ALL__') { if (!window.AM_PRIVILEGED || m.username === ME.username) location.reload(); } }
    else if (m.type === 'frozen-changed') {
      setPageTitle();
      if (isFrozen(me.username) && !document.querySelector('.sb-freeze-overlay')) {
        showFreezeOverlay(getFrozenMap()[me.username]?.reason);
        try { sessionStorage.setItem('sb26_frozen', '1'); } catch (_) {}
      } else if (!isFrozen(me.username) && document.querySelector('.sb-freeze-overlay')) {
        hideFreezeOverlay();
        try { sessionStorage.removeItem('sb26_frozen'); } catch (_) {}
      }
    }
    else if (m.type === 'profile-updated') {
      try {
        // Re-read fresh values from Auth
        const users = (window.Auth && Auth.getUsers) ? Auth.getUsers() : {};
        const fresh = users[me.username] || {};
        // Sync every profile field, in case the patch was extended
        const patch = m.patch || fresh || {};
        const fields = ['display','avatar','color','bio','pronouns','nameColor','avatarShape','fontStyle','bannerPattern','profileEffect','presence','statusText','bioVisibility','showOnline','showLastSeen','allowModDMs'];
        fields.forEach(k => {
          if (patch[k] !== undefined) me[k] = patch[k];
          else if (fresh[k] !== undefined) me[k] = fresh[k];
        });
        const av = document.getElementById('myAvatar');
        if (av) { av.textContent = me.avatar || '?'; av.style.background = me.color || '#4d9dff'; }
        setPageTitle();
        window.updateMePanel?.();
        window.renderConversationList?.();
        window.renderHookListV28?.();
      } catch (e) {}
    }
  };
  setInterval(() => { if (!appChannel) return; appChannel.postMessage({ type: 'ping', profile: makeProfile() }); }, 3000);
  window.addEventListener('beforeunload', () => { if (appChannel) appChannel.postMessage({ type: 'leave', tabId: state.tabId }); });
}

let _lastActivity = Date.now();
['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(evt => { window.addEventListener(evt, () => { _lastActivity = Date.now(); }, { passive: true }); });
setInterval(() => {
  const mins = parseInt(settings.autoLogoutMin, 10); if (!mins || mins < 1) return;
  if (Date.now() - _lastActivity > mins * 60000) { try { Auth.logout(); } catch (_) {} try { sessionStorage.setItem('sb26_autologout', '1'); } catch (_) {} location.replace('auth.html'); }
}, 30000);

function autoDeleteOldMessages() {
  const days = parseInt(settings.autoDeleteDays, 10); if (!days || days < 1) return;
  const cutoff = Date.now() - days * 86400000;
  let total = 0;
  Object.keys(localStorage).filter(k => k.startsWith('sb26_chat_')).forEach(key => {
    try { const msgs = JSON.parse(localStorage.getItem(key) || '[]'); if (!Array.isArray(msgs)) return; const filtered = msgs.filter(m => (m.ts || 0) >= cutoff); if (filtered.length !== msgs.length) { total += msgs.length - filtered.length; localStorage.setItem(key, JSON.stringify(filtered)); } } catch (_) {}
  });
  if (total > 0 && settings.debugMode) console.log('[app] auto-deleted', total, 'old messages');
}

async function init() {
  if (Auth.isUserBanned(me.username) && !Auth.isOwner(me.username) && !Auth.isMod(me.username)) {
    try { sessionStorage.removeItem('sb26_session'); } catch (_) {}
    try { sessionStorage.setItem('sb26_banned_preview', me.username); } catch (_) {}
    location.replace('banned.html'); return;
  }
  setPageTitle();
  const av = $('myAvatar'); if (av) { av.textContent = me.avatar; av.style.background = me.color; }
  const sid = $('sessId'); if (sid) sid.textContent = me.username;
  // Show mod entry points if privileged
  setModEntryVisible(!!window.AM_PRIVILEGED);
  if (isFrozen(me.username)) { const info = getFrozenMap()[me.username]; try { sessionStorage.setItem('sb26_frozen', '1'); } catch (_) {} showFreezeOverlay(info?.reason); }
  else { try { sessionStorage.removeItem('sb26_frozen'); } catch (_) {} }
  const btnMenu = $('btnMenu'); const btnChat = $('btnChat'); const btnProfile = $('btnProfile'); const menu = $('topMenu');
  btnMenu?.addEventListener('click', e => { e.stopPropagation(); menu?.classList.toggle('hidden'); });
  document.addEventListener('click', e => { if (!e.target.closest('#btnMenu') && !e.target.closest('#topMenu')) menu?.classList.add('hidden'); });
  btnChat?.addEventListener('click', () => window.App.openChat());
  btnProfile?.addEventListener('click', () => window.App.openProfile());
  $('btnCommand')?.addEventListener('click', () => window.App.openCommandPalette());
  document.addEventListener('click', e => { const btn = e.target.closest('[data-module-id]'); if (btn) window.runModule?.(btn.dataset.moduleId); });
  ['moduleSearch', 'moduleSearchM'].forEach(id => { $(id)?.addEventListener('input', e => renderModules(e.target.value)); });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); window.App.openCommandPalette(); return; }
    if (e.key === '/' && !e.target.matches('input,textarea')) { e.preventDefault(); $('moduleSearch')?.focus(); }
    if (e.key === 'Escape') window.App.closeChat?.();
  });
  window.addEventListener('keydown', () => { state.keys++; ['statKeys', 'statKeysM'].forEach(id => { const el = $(id); if (el) el.textContent = state.keys; }); });
  window.addEventListener('click', () => { state.clicks++; ['statClicks', 'statClicksM'].forEach(id => { const el = $(id); if (el) el.textContent = state.clicks; }); });
  initResizers(); initChannel(); wireRealtime(); renderModules(); renderRecentModules();
  window.renderHookPanelV28?.(); window.renderConversationList?.(); window.computeUnread?.(); wireConsole();
  window.updateChatBadge?.(); window.wireChatUI?.(); updateInputBlockState(); updateOnlineCount(); autoDeleteOldMessages();
  await initServiceWorker();
  log(`SafeBeef v83 — ${(window.MODULE_REGISTRY || []).length} modules ready.`);
  toast({ title: `Welcome, ${me.display}`, msg: window.AM_PRIVILEGED ? 'Privileged access enabled' : 'Ctrl+K for command palette', type: 'success', dur: 4000 });

  // Periodic sync with server (every 30 seconds)
  setInterval(() => {
    if (Auth.syncAllFromServer) Auth.syncAllFromServer(me.username).catch(() => {});
  }, 30000);
}

/* ============================================================================
   GLOBAL PRIVILEGE POLLER — checks every 2s
   Guarantees: demotion kicks you out of the mod panel instantly,
   even if realtime events are missed.
   ============================================================================ */
let _lastPriv = !!(window.AM_PRIVILEGED);
setInterval(() => {
  if (!window.ME) return;
  try {
    const nowPriv = !!(window.Auth && (Auth.isMod(ME.username) || Auth.isOwner(ME.username)));
    if (_lastPriv && !nowPriv) {
      // Just lost privileges
      window.refreshPrivilegeFlags?.();
      removeAllModUI();
      setModEntryVisible(false);
      toast({ title: 'Access revoked', msg: 'You are no longer a moderator', type: 'error', dur: 5000 });
      window.updateMePanel?.();
      window.renderConversationList?.();
    } else if (!_lastPriv && nowPriv) {
      // Just gained privileges
      window.refreshPrivilegeFlags?.();
      setModEntryVisible(true);
      toast({ title: 'Mod access granted', msg: 'You are now a moderator', type: 'success', dur: 5000 });
      window.updateMePanel?.();
      window.renderConversationList?.();
    }
    _lastPriv = nowPriv;
  } catch (e) {}
}, 2000);

(async function strictBootGate() {
  try { if (window.SB_Maintenance && SB_Maintenance.guard()) return; } catch (e) {}
  const freeze = document.createElement('div');
  freeze.id = 'sbBootFreeze';
  freeze.style.cssText = 'position:fixed;inset:0;background:#03050a;z-index:2147483647;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;font-family:system-ui';
  freeze.innerHTML = `<div style="width:48px;height:48px;border-radius:50%;border:4px solid rgba(77,157,255,.15);border-top-color:#4d9dff;animation:sbBootSpin 1s linear infinite"></div><div style="color:#7d90a8;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:800">Verifying access…</div><style>@keyframes sbBootSpin{to{transform:rotate(360deg)}}</style>`;
  document.body.appendChild(freeze);
  try {
    if (window.Auth && typeof Auth.strictBanGate === 'function') {
      const result = await Auth.strictBanGate();
      if (result && result.banned) {
        if (result.type === 'account' && window.Auth.getUsers) {
          const users = Auth.getUsers();
          const u = users[result.username];
          if (u) {
            try {
              sessionStorage.setItem('sb26_banned_preview', result.username);
              sessionStorage.setItem('sb26_banned_info', JSON.stringify({ username: u.username, display: u.display, avatar: u.avatar, color: u.color, info: result.info }));
            } catch (e) {}
          }
        }
        location.replace('banned.html'); return;
      }
    }
  } catch (e) { console.warn('[app] strict gate error:', e); }
  freeze.remove();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

try { window.SB_Maintenance && SB_Maintenance.startWatcher(); } catch (e) {}