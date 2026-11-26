/* ==========================================================================
   SafeBeef v83 — Settings (tabbed UI) + Profile + Stats + Command Palette
   - 7-tab column layout
   - 15+ new account settings with working backend
   - Motion, contrast, quiet hours, auto-emoji, sound schemes
   ========================================================================== */
'use strict';

/* ---------- Motion CSS ---------- */
(function injectMotionCSS() {
  if (document.getElementById('sb-motion-css-v80')) return;
  const s = document.createElement('style');
  s.id = 'sb-motion-css-v80';
  s.textContent = `
    html[data-motion="off"] *,
    html[data-motion="off"] *::before,
    html[data-motion="off"] *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
  `;
  document.head.appendChild(s);
})();

function liveFormatNum(n) {
  if (n == null) return '—';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1) + 'k';
  return String(n);
}
function liveFormatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function liveFormatRelative(ts) {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  if (diff < 1000) return 'now';
  if (diff < 60000) return Math.floor(diff / 1000) + 's';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
  return Math.floor(diff / 86400000) + 'd';
}

/* ---------- Desktop notifications ---------- */
function requestDesktopNotifPermission() {
  if (!('Notification' in window)) return Promise.resolve('unsupported');
  if (Notification.permission === 'granted') return Promise.resolve('granted');
  if (Notification.permission === 'denied') return Promise.resolve('denied');
  return Notification.requestPermission();
}
function showDesktopNotification(title, body) {
  if (!window.settings || !window.settings.desktopNotif) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification(title, { body, tag: 'safebeef', silent: true }); } catch (e) {}
}
window.showDesktopNotification = showDesktopNotification;

/* ---------- Push notifications ---------- */
window.isPushSupported = function () {
  return !!(window.serviceWorker && 'PushManager' in window);
};

/* ---------- Quiet hours + auto-emoji helpers ---------- */
function isInQuietHours() {
  if (!window.settings || !window.settings.quietHoursEnabled) return false;
  const start = parseTimeToMin(window.settings.quietHoursStart || '22:00');
  const end = parseTimeToMin(window.settings.quietHoursEnd || '08:00');
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  if (start === end) return false;
  if (start < end) return currentMin >= start && currentMin < end;
  return currentMin >= start || currentMin < end;
}
function parseTimeToMin(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map(n => parseInt(n, 10) || 0);
  return h * 60 + m;
}
function applyAutoEmoji(text) {
  if (!text) return text;
  const map = [
    [/(^|\s):\)(?=\s|$)/g, '$1😊'],
    [/(^|\s):-\)(?=\s|$)/g, '$1😊'],
    [/(^|\s):D(?=\s|$)/g, '$1😄'],
    [/(^|\s):-\)D(?=\s|$)/g, '$1😄'],
    [/(^|\s):d(?=\s|$)/g, '$1😄'],
    [/(^|\s);\)(?=\s|$)/g, '$1😉'],
    [/(^|\s);-\)(?=\s|$)/g, '$1😉'],
    [/(^|\s):\((?=\s|$)/g, '$1😢'],
    [/(^|\s):-\((?=\s|$)/g, '$1😢'],
    [/(^|\s):P(?=\s|$)/g, '$1😛'],
    [/(^|\s):p(?=\s|$)/g, '$1😛'],
    [/(^|\s):-P(?=\s|$)/g, '$1😛'],
    [/(^|\s)<3(?=\s|$)/g, '$1❤️'],
    [/(^|\s):O(?=\s|$)/g, '$1😮'],
    [/(^|\s):o(?=\s|$)/g, '$1😮'],
    [/(^|\s):-O(?=\s|$)/g, '$1😮'],
    [/(^|\s):\*(?=\s|$)/g, '$1😘'],
    [/(^|\s):-\*(?=\s|$)/g, '$1😘'],
    [/(^|\s)B\)(?=\s|$)/g, '$1😎'],
    [/(^|\s)8\)(?=\s|$)/g, '$1😎'],
    [/(^|\s):\/(?=\s|$)/g, '$1😕'],
    [/(^|\s):-\/(?=\s|$)/g, '$1😕'],
    [/(^|\s):\|(?=\s|$)/g, '$1😐'],
    [/(^|\s):-\|(?=\s|$)/g, '$1😐'],
  ];
  let result = text;
  for (const [re, emoji] of map) result = result.replace(re, emoji);
  return result;
}

/* ---------- Wrap-based behavior settings (idempotent) ---------- */
function wrapOnce(name, factory) {
  const flag = '__sb_' + name + '_wrapped';
  if (window[flag]) return;
  const orig = window[name];
  if (typeof orig !== 'function') return;
  window[flag] = true;
  try { window[name] = factory(orig); } catch (e) { console.warn('[sb-settings] wrap ' + name, e); }
}

function applyBehaviorSettings() {
  if (!window.settings) window.settings = {};

  // CSS body classes
  document.body.classList.toggle('sb-high-contrast', !!window.settings.highContrast);
  document.body.classList.toggle('sb-reduce-transparency', !!window.settings.reduceTransparency);
  document.body.classList.toggle('sb-no-group', window.settings.messageGrouping === false);
  document.body.classList.toggle('sb-hide-timestamps', window.settings.hideTimestamps === true);

  // Wrap toast (message preview + quiet hours)
  wrapOnce('toast', (origToast) => function (a, b, c, d) {
    if (!window.settings) return origToast.call(this, a, b, c, d);
    if (isInQuietHours()) return;
    let opts;
    if (typeof a === 'object' && a) opts = a;
    else opts = { title: a, msg: b, type: c, dur: d };
    if (window.settings.messagePreview === false && opts.type === 'message' && opts.msg) {
      opts = { ...opts, msg: 'You have a new message' };
    }
    return origToast.call(this, opts);
  });

  // Wrap sendMessage (auto-emoji)
  wrapOnce('sendMessage', (origSend) => function (data) {
    if (data && data.type === 'text' && typeof data.text === 'string' && window.settings && window.settings.autoEmoji) {
      data.text = applyAutoEmoji(data.text);
    }
    return origSend.call(this, data);
  });

  // Wrap beep (sound scheme)
  wrapOnce('beep', (origBeep) => function (freq, dur, type, vol) {
    const scheme = window.settings && window.settings.soundScheme || 'default';
    if (scheme === 'soft') vol = (vol || 0.05) * 0.55;
    else if (scheme === 'chime') { type = 'triangle'; dur = (dur || 0.05) * 1.6; vol = (vol || 0.05) * 0.85; }
    else if (scheme === 'deep') { freq = (freq || 800) * 0.65; dur = (dur || 0.05) * 1.2; }
    return origBeep.call(this, freq, dur, type, vol);
  });
}

// Override applySettings to also apply behavior settings
(function patchApplySettings() {
  const orig = window.applySettings;
  window.applySettings = function () {
    try { if (orig) orig.apply(this, arguments); } catch (e) { console.warn('[sb-settings] applySettings:', e); }
    try { applyBehaviorSettings(); } catch (e) { console.warn('[sb-settings] behaviors:', e); }
  };
  try { applyBehaviorSettings(); } catch (e) {}
})();

/* ============================================================
   CUSTOM PROMPT MODAL (sync — used throughout settings + mod dialogs)
   ============================================================ */
function sbPrompt(config) {
  document.querySelectorAll('.sb-prompt-overlay').forEach(el => el.remove());
  const overlay = document.createElement('div');
  overlay.className = 'sb-prompt-overlay';
  const modal = document.createElement('div');
  modal.className = 'sb-prompt-modal';
  const buttons = config.buttons || [{ label: 'OK', class: 'primary', action: 'close' }];

  modal.innerHTML = `
    <div class="sb-prompt-head">
      <div class="sb-prompt-ico">${config.icon || '✏️'}</div>
      <div class="sb-prompt-titles">
        <h3>${esc(config.title || '')}</h3>
        ${config.subtitle ? `<div class="sb-prompt-sub">${esc(config.subtitle)}</div>` : ''}
      </div>
      <button class="sb-prompt-close" type="button" aria-label="Close">×</button>
    </div>
    <div class="sb-prompt-body">${config.content || ''}</div>
    <div class="sb-prompt-foot">
      ${buttons.map((b, i) => `<button type="button" class="sb-prompt-btn ${b.class || 'secondary'}" data-prompt-btn="${i}">${esc(b.label)}</button>`).join('')}
    </div>`;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  modal.querySelector('.sb-prompt-close').onclick = close;
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  buttons.forEach((b, i) => {
    const btn = modal.querySelector(`[data-prompt-btn="${i}"]`);
    if (!btn) return;
    btn.onclick = () => {
      if (b.action === 'close') { close(); return; }
      if (typeof b.action === 'function') b.action(modal, close);
    };
  });

  const escHandler = (e) => {
    if (e.key === 'Escape') { document.removeEventListener('keydown', escHandler); close(); }
  };
  document.addEventListener('keydown', escHandler);

  if (typeof config.onMount === 'function') {
    try { config.onMount(modal, close); } catch (e) { console.warn('[sbPrompt]', e); }
  }

  return { modal, overlay, close };
}
window.sbPrompt = sbPrompt;

/* ============================================================
   PROFILE
   ============================================================ */
function openProfile() {
  document.querySelectorAll('.profile-panel').forEach(el => el.remove());
  const users = Auth.getUsers();
  const meData = users[ME.username];
  if (!meData) return;

  function computeStats() {
    return {
      messages: Object.keys(localStorage).filter(k => k.startsWith('sb26_chat_') && k.includes(ME.username)).reduce((s, k) => {
        try { return s + (JSON.parse(localStorage.getItem(k)) || []).length; } catch (e) { return s; }
      }, 0),
      hooks: Object.keys(localStorage).filter(k => k.startsWith('sb_hook_log_') && k.includes(ME.username)).reduce((s, k) => {
        try { return s + (JSON.parse(localStorage.getItem(k)) || []).length; } catch (e) { return s; }
      }, 0),
      joined: meData.createdAt ? liveFormatDate(meData.createdAt) : '—',
      warnInfo: Auth.getWarningInfo(ME.username),
    };
  }

  const stats = computeStats();
  const bio = meData.bio || '';

  const panel = document.createElement('div');
  panel.className = 'profile-panel';
  panel.innerHTML = `
    <div class="settings-shell">
      <div class="settings-head">
        <div class="settings-head-left">
          <div class="settings-head-icon">👤</div>
          <div class="settings-head-text"><h2>My Profile</h2><div class="settings-head-meta">@${esc(ME.username)}</div></div>
        </div>
        <button class="imsg-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="profile-hero">
        <div class="profile-avatar" style="background:${meData.color}">${esc(meData.avatar)}</div>
        <div class="profile-name">${esc(meData.display)} ${roleBadgeFor(meData.username)}</div>
        ${bio ? `<div class="profile-bio">"${esc(bio)}"</div>` : `<div class="profile-bio empty">No bio yet — tap "Bio" below</div>`}
        <div class="profile-email">${esc(meData.email || '')}</div>
      </div>
      <div class="profile-grid">
        <div class="profile-stat"><div class="profile-stat-value" id="profMsgCount" style="color:var(--accent-2)">${liveFormatNum(stats.messages)}</div><div class="profile-stat-label">Messages</div></div>
        <div class="profile-stat"><div class="profile-stat-value" id="profHookCount" style="color:var(--amber-2)">${liveFormatNum(stats.hooks)}</div><div class="profile-stat-label">Hook Events</div></div>
        <div class="profile-stat"><div class="profile-stat-value" id="profJoined" style="color:var(--green-2);font-size:13px">${stats.joined}</div><div class="profile-stat-label">Joined</div></div>
        <div class="profile-stat"><div class="profile-stat-value" id="profWarnCount" style="color:${stats.warnInfo.count >= 3 ? 'var(--red-2)' : 'var(--text)'}">${stats.warnInfo.count}</div><div class="profile-stat-label">Warnings</div></div>
      </div>
      <div class="settings-body">
        <div class="settings-group">
          <div class="settings-label">Customize Profile</div>
          <button class="settings-row action" id="profileEditBtn">
            <div class="settings-row-ico">✏️</div>
            <div class="settings-row-body"><div class="settings-row-title">Display Name</div><div class="settings-row-desc">How others see you</div></div>
            <div class="settings-row-arrow">›</div>
          </button>
          <button class="settings-row action" id="profileAvatarBtn">
            <div class="settings-row-ico">🎭</div>
            <div class="settings-row-body"><div class="settings-row-title">Avatar</div><div class="settings-row-desc">Initials or emoji</div></div>
            <div class="settings-row-arrow">›</div>
          </button>
          <button class="settings-row action" id="profileColorBtn">
            <div class="settings-row-ico">🎨</div>
            <div class="settings-row-body"><div class="settings-row-title">Avatar Color</div><div class="settings-row-desc">Background color</div></div>
            <div class="settings-row-arrow">›</div>
          </button>
          <button class="settings-row action" id="profileBioBtn">
            <div class="settings-row-ico">💬</div>
            <div class="settings-row-body"><div class="settings-row-title">Bio / Status</div><div class="settings-row-desc">Short note shown on profile</div></div>
            <div class="settings-row-arrow">›</div>
          </button>
        </div>
        <div class="settings-group">
          <div class="settings-label">Appearance</div>
          <button class="settings-row action" id="profileAccentBtn">
            <div class="settings-row-ico">🌈</div>
            <div class="settings-row-body"><div class="settings-row-title">Accent Color</div><div class="settings-row-desc">Highlight color across the app</div></div>
            <div class="settings-row-arrow">›</div>
          </button>
        </div>
        <div class="settings-group">
          <button class="settings-row action danger" id="profileSignOut">
            <div class="settings-row-ico">🚪</div>
            <div class="settings-row-body"><div class="settings-row-title">Sign Out</div><div class="settings-row-desc">End this session</div></div>
            <div class="settings-row-arrow">›</div>
          </button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(panel);

  panel.querySelector('.imsg-close').onclick = () => panel.remove();
  panel.addEventListener('click', e => { if (e.target === panel) panel.remove(); });
  panel.querySelector('#profileSignOut').onclick = () => { Auth.logout(); location.replace('auth.html'); };

  panel.querySelector('#profileEditBtn').onclick = () => {
    sbPrompt({
      title: 'Display Name', subtitle: 'Shown in chats and lists', icon: '✏️',
      content: `
        <label class="sb-prompt-label">Display name</label>
        <input type="text" id="sbDisplayInput" class="sb-prompt-input" maxlength="32" value="${esc(meData.display)}" placeholder="Your display name" autocomplete="off">
        <div class="sb-prompt-hint">2-32 characters.</div>`,
      buttons: [
        { label: 'Cancel', class: 'secondary', action: 'close' },
        { label: 'Save', class: 'primary', action: (modal, close) => {
          const v = modal.querySelector('#sbDisplayInput').value.trim();
          if (v.length < 2) return toast('Too short', 'Display name must be at least 2 characters', 'warn');
          if (v.length > 32) return toast('Too long', 'Display name must be under 32 characters', 'warn');
          const u = Auth.getUsers(); u[ME.username].display = v; Auth.saveUsers(u);
          ME.display = v;
          try { window.appChannel?.postMessage({ type: 'profile-updated', username: ME.username, display: v }); } catch (_) {}
          try { setPageTitle(); } catch (_) {}
          close(); toast('Display name updated', v, 'success');
          panel.remove(); openProfile();
        }},
      ],
      onMount: (modal) => { setTimeout(() => { const i = modal.querySelector('#sbDisplayInput'); if (i) { i.focus(); i.select(); } }, 60); },
    });
  };

  panel.querySelector('#profileAvatarBtn').onclick = () => {
    const initials = ME.username.slice(0, 2).toUpperCase();
    const emojis = ['🐝','🤖','😎','🎩','👾','🦊','🐺','🐱','🐶','🦁','🐯','🐸','🦉','🐙','🦄','⚡','🔥','💎','⭐','🌙','☀️','🌈','🎮','🎧','🎨','🚀','🌸','🌺','🍀','🌵'];
    sbPrompt({
      title: 'Avatar', subtitle: 'Initials, an emoji, or type your own', icon: '🎭',
      content: `
        <label class="sb-prompt-label">Initials or emoji</label>
        <input type="text" id="sbAvatarInput" class="sb-prompt-input" maxlength="4" value="${esc(meData.avatar || '')}" placeholder="${esc(initials)}" autocomplete="off" style="text-align:center;font-size:16px;letter-spacing:1px">
        <div class="sb-prompt-hint">1-4 characters.</div>
        <div style="margin-top:18px">
          <label class="sb-prompt-label">Quick picks</label>
          <div class="sb-prompt-grid" id="sbAvatarGrid" style="grid-template-columns:repeat(6, 1fr)">
            <button type="button" data-avatar="${esc(initials)}" style="padding:10px 4px;background:var(--surface-2);border:1px solid var(--border-2);border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;color:var(--text);font-family:inherit">${esc(initials)}</button>
            ${emojis.map(e => `<button type="button" data-avatar="${e}" style="padding:8px 4px;background:var(--surface-2);border:1px solid var(--border-2);border-radius:8px;font-size:20px;cursor:pointer;color:var(--text);font-family:inherit">${e}</button>`).join('')}
          </div>
        </div>`,
      buttons: [
        { label: 'Cancel', class: 'secondary', action: 'close' },
        { label: 'Save', class: 'primary', action: (modal, close) => {
          const v = modal.querySelector('#sbAvatarInput').value.trim().slice(0, 4);
          if (!v) return toast('Empty', 'Enter at least 1 character', 'warn');
          const u = Auth.getUsers(); u[ME.username].avatar = v; Auth.saveUsers(u);
          ME.avatar = v;
          const av = document.getElementById('myAvatar'); if (av) av.textContent = v;
          try { window.appChannel?.postMessage({ type: 'profile-updated', username: ME.username, avatar: v }); } catch (_) {}
          close(); toast('Avatar updated', v, 'success');
          panel.remove(); openProfile();
        }},
      ],
      onMount: (modal) => {
        const grid = modal.querySelector('#sbAvatarGrid');
        if (grid) grid.querySelectorAll('[data-avatar]').forEach(btn => {
          btn.onclick = () => {
            const inp = modal.querySelector('#sbAvatarInput'); if (inp) inp.value = btn.dataset.avatar;
            grid.querySelectorAll('[data-avatar]').forEach(b => {
              b.style.borderColor = b === btn ? 'var(--accent)' : 'var(--border-2)';
              b.style.background = b === btn ? 'var(--accent-bg)' : 'var(--surface-2)';
            });
          };
        });
        setTimeout(() => { const i = modal.querySelector('#sbAvatarInput'); if (i) i.focus(); }, 60);
      },
    });
  };

  panel.querySelector('#profileColorBtn').onclick = () => {
    const colors = ['#4d9dff','#b586ff','#2ee6d6','#ff5a6e','#ffb340','#34d97f','#ff66ff','#6df0e3','#ff8fab','#7ee0c8','#f472b6','#a3e635','#fb923c','#94a3b8'];
    sbPrompt({
      title: 'Avatar Color', subtitle: 'Background of your avatar', icon: '🎨',
      content: `
        <label class="sb-prompt-label">Pick a color</label>
        <div class="sb-prompt-grid" id="sbColorGrid" style="grid-template-columns:repeat(7, 1fr)">
          ${colors.map(c => `<button type="button" data-color="${c}" style="aspect-ratio:1;border-radius:50%;background:${c};border:3px solid ${c === meData.color ? '#fff' : 'transparent'};box-shadow:0 2px 8px rgba(0,0,0,.35);cursor:pointer;padding:0"></button>`).join('')}
        </div>
        <div style="margin-top:18px">
          <label class="sb-prompt-label">Custom hex</label>
          <input type="text" id="sbColorCustom" class="sb-prompt-input" value="${esc(meData.color || '#4d9dff')}" placeholder="#4d9dff" maxlength="7" autocomplete="off" style="font-family:var(--mono);text-align:center;letter-spacing:1px">
        </div>`,
      buttons: [
        { label: 'Cancel', class: 'secondary', action: 'close' },
        { label: 'Save', class: 'primary', action: (modal, close) => {
          const picked = modal.querySelector('#sbColorCustom').value.trim();
          if (!/^#[0-9a-fA-F]{6}$/.test(picked)) return toast('Invalid hex', 'Use format #RRGGBB', 'warn');
          const u = Auth.getUsers(); u[ME.username].color = picked; Auth.saveUsers(u);
          ME.color = picked;
          const av = document.getElementById('myAvatar'); if (av) av.style.background = picked;
          try { window.appChannel?.postMessage({ type: 'profile-updated', username: ME.username, color: picked }); } catch (_) {}
          close(); toast('Avatar color updated', picked, 'success');
          panel.remove(); openProfile();
        }},
      ],
      onMount: (modal) => {
        const grid = modal.querySelector('#sbColorGrid');
        if (grid) grid.querySelectorAll('[data-color]').forEach(btn => {
          btn.onclick = () => {
            const inp = modal.querySelector('#sbColorCustom'); if (inp) inp.value = btn.dataset.color;
            grid.querySelectorAll('[data-color]').forEach(b => { b.style.borderColor = b === btn ? '#fff' : 'transparent'; });
          };
        });
      },
    });
  };

  panel.querySelector('#profileBioBtn').onclick = () => {
    sbPrompt({
      title: 'Bio / Status', subtitle: 'Short note on your profile', icon: '💬',
      content: `
        <label class="sb-prompt-label">Your bio</label>
        <textarea id="sbBioInput" class="sb-prompt-input sb-prompt-textarea" maxlength="100" placeholder="What are you up to?">${esc(meData.bio || '')}</textarea>
        <div class="sb-prompt-hint"><span id="sbBioCount">${(meData.bio || '').length}</span> / 100 characters</div>`,
      buttons: [
        { label: 'Cancel', class: 'secondary', action: 'close' },
        { label: 'Save', class: 'primary', action: (modal, close) => {
          const v = modal.querySelector('#sbBioInput').value.trim();
          if (v.length > 100) return toast('Too long', 'Bio must be 100 characters or less', 'warn');
          const u = Auth.getUsers(); u[ME.username].bio = v; Auth.saveUsers(u);
          ME.bio = v;
          try { window.appChannel?.postMessage({ type: 'profile-updated', username: ME.username, bio: v }); } catch (_) {}
          close(); toast('Bio updated', v || 'Cleared', 'success');
          panel.remove(); openProfile();
        }},
      ],
      onMount: (modal) => {
        const inp = modal.querySelector('#sbBioInput');
        const count = modal.querySelector('#sbBioCount');
        if (inp && count) inp.addEventListener('input', () => {
          count.textContent = String(inp.value.length);
          count.style.color = inp.value.length > 100 ? 'var(--red-2)' : '';
        });
        setTimeout(() => { if (inp) inp.focus(); }, 60);
      },
    });
  };

  panel.querySelector('#profileAccentBtn').onclick = () => {
    const colors = ['#4d9dff','#b586ff','#2ee6d6','#ff5a6e','#ffb340','#34d97f','#ff66ff','#6df0e3','#ff8fab','#7ee0c8','#f472b6','#a3e635'];
    const current = (window.settings && window.settings.accent) || '#4d9dff';
    sbPrompt({
      title: 'Accent Color', subtitle: 'Highlight color for the whole app', icon: '🌈',
      content: `
        <label class="sb-prompt-label">Pick a color</label>
        <div class="sb-prompt-grid" id="sbAccentGrid" style="grid-template-columns:repeat(6, 1fr)">
          ${colors.map(c => `<button type="button" data-accent="${c}" style="aspect-ratio:1;border-radius:10px;background:${c};border:3px solid ${c === current ? '#fff' : 'transparent'};box-shadow:0 2px 8px rgba(0,0,0,.3);cursor:pointer;padding:0"></button>`).join('')}
        </div>
        <div style="margin-top:18px">
          <label class="sb-prompt-label">Custom hex</label>
          <input type="text" id="sbAccentCustom" class="sb-prompt-input" value="${esc(current)}" placeholder="#4d9dff" maxlength="7" autocomplete="off" style="font-family:var(--mono);text-align:center;letter-spacing:1px">
        </div>`,
      buttons: [
        { label: 'Cancel', class: 'secondary', action: 'close' },
        { label: 'Save', class: 'primary', action: (modal, close) => {
          const picked = modal.querySelector('#sbAccentCustom').value.trim();
          if (!/^#[0-9a-fA-F]{6}$/.test(picked)) return toast('Invalid hex', 'Use format #RRGGBB', 'warn');
          window.settings.accent = picked;
          applySettings();
          close(); toast('Accent updated', picked, 'success');
        }},
      ],
      onMount: (modal) => {
        const grid = modal.querySelector('#sbAccentGrid');
        if (grid) grid.querySelectorAll('[data-accent]').forEach(btn => {
          btn.onclick = () => {
            const inp = modal.querySelector('#sbAccentCustom'); if (inp) inp.value = btn.dataset.accent;
            grid.querySelectorAll('[data-accent]').forEach(b => { b.style.borderColor = b === btn ? '#fff' : 'transparent'; });
          };
        });
      },
    });
  };

  const unsubs = [];
  const refresh = () => {
    if (!document.body.contains(panel)) return;
    const s = computeStats();
    const msgEl = panel.querySelector('#profMsgCount');
    const hookEl = panel.querySelector('#profHookCount');
    const warnEl = panel.querySelector('#profWarnCount');
    if (msgEl) msgEl.textContent = liveFormatNum(s.messages);
    if (hookEl) hookEl.textContent = liveFormatNum(s.hooks);
    if (warnEl) { warnEl.textContent = s.warnInfo.count; warnEl.style.color = s.warnInfo.count >= 3 ? 'var(--red-2)' : 'var(--text)'; }
  };
  if (window.Live) {
    ['profile','stats','chat','hookPanel'].forEach(t => {
      const off = Live.on(t, refresh);
      if (typeof off === 'function') unsubs.push(off);
    });
  }
  const obs = new MutationObserver(() => {
    if (!document.body.contains(panel)) { unsubs.forEach(u => u()); obs.disconnect(); }
  });
  obs.observe(document.body, { childList: true });
}
window.openProfile = openProfile;

/* ============================================================
   SETTINGS — tabbed column layout
   ============================================================ */
const SB_SETTINGS_TABS = [
  { id: 'account', label: 'Account', icon: '👤' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'privacy', label: 'Privacy', icon: '🔒' },
  { id: 'advanced', label: 'Advanced', icon: '🧠' },
  { id: 'data', label: 'Data', icon: '⚠️' },
];

let _sbSettingsOverlay = null;
let _sbSettingsTab = 'account';

function _sbEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function _sbRow(icon, title, desc, control, isNew) {
  return `<div class="sb-set-row">
    <div class="sb-set-row-ico">${icon}</div>
    <div class="sb-set-row-body">
      <div class="sb-set-row-title">${_sbEsc(title)}${isNew ? '<span class="sb-set-badge">NEW</span>' : ''}</div>
      ${desc ? `<div class="sb-set-row-desc">${_sbEsc(desc)}</div>` : ''}
    </div>
    <div class="sb-set-row-ctrl">${control}</div>
  </div>`;
}
function _sbToggle(key, on) {
  return `<button type="button" class="sb-set-toggle ${on ? 'on' : ''}" data-toggle="${_sbEsc(key)}" aria-pressed="${on}"><span class="sb-set-toggle-knob"></span></button>`;
}
function _sbSelect(key, value, options) {
  const opts = options.map(o => `<option value="${_sbEsc(o.value)}" ${o.value === value ? 'selected' : ''}>${_sbEsc(o.label)}</option>`).join('');
  return `<select class="sb-set-select" data-select="${_sbEsc(key)}">${opts}</select>`;
}
function _sbSeg(key, value, options) {
  return `<div class="sb-set-seg" data-seg-group="${_sbEsc(key)}">${options.map(o =>
    `<button type="button" data-seg="${_sbEsc(key)}:${_sbEsc(o.value)}" class="${o.value === value ? 'on' : ''}">${_sbEsc(o.label)}</button>`
  ).join('')}</div>`;
}
function _sbRange(key, value, min, max, step, unit) {
  return `<input type="range" class="sb-set-range" data-range="${_sbEsc(key)}" value="${value}" min="${min}" max="${max}" step="${step || 1}" style="width:110px;accent-color:var(--accent);flex-shrink:0" data-unit="${_sbEsc(unit || '')}">
    <span class="sb-set-range-val" data-range-val="${_sbEsc(key)}" style="font-family:var(--mono);font-size:11px;color:var(--text-3);min-width:34px;text-align:right">${value}${_sbEsc(unit || '')}</span>`;
}
function _sbTime(key, value) {
  return `<input type="time" class="sb-set-time" data-time="${_sbEsc(key)}" value="${_sbEsc(value || '')}">`;
}

function _sbSetKey(key, value) {
  if (!window.settings) window.settings = {};
  window.settings[key] = value;
  try { window.applySettings && window.applySettings(); } catch (e) {}
}

function _sbRenderSettingsContent(s) {
  switch (_sbSettingsTab) {
    case 'account': return `
      <div class="sb-set-section">
        <div class="sb-set-section-label">Profile</div>
        ${_sbRow('👤', 'My Profile', `${_sbEsc(ME.display)} · @${_sbEsc(ME.username)}`, `<button class="sb-set-action" data-action="open-profile">Open ›</button>`)}
        ${_sbRow('✉️', 'Email Address', ME.email || 'Not set', `<button class="sb-set-action" data-action="change-email">Edit</button>`)}
        ${_sbRow('🔑', 'Password', 'Update your sign-in password', `<button class="sb-set-action" data-action="change-password">Change</button>`)}
      </div>
      <div class="sb-set-section">
        <div class="sb-set-section-label">Sessions & Security</div>
        ${_sbRow('🚪', 'Auto Sign-Out', s.autoLogoutMin > 0 ? `${s.autoLogoutMin} min of inactivity` : 'Never (not recommended)',
          _sbSelect('autoLogoutMin', String(s.autoLogoutMin || 0), [
            { value: '0', label: 'Never' }, { value: '5', label: '5 min' }, { value: '15', label: '15 min' },
            { value: '30', label: '30 min' }, { value: '60', label: '1 hour' }, { value: '240', label: '4 hours' },
          ]))}
        ${_sbRow('🔐', 'Sign Out Other Sessions', 'Force sign-out on all other tabs', `<button class="sb-set-action" data-action="signout-others">Sign out</button>`)}
        ${_sbRow('📱', 'Active Sessions', 'Devices currently signed in', `<button class="sb-set-action" data-action="view-sessions">View ›</button>`)}
      </div>
      <div class="sb-set-section">
        <div class="sb-set-section-label">Preferences</div>
        ${_sbRow('🌐', 'Language', 'Interface language', _sbSelect('language', s.language || 'en', [
          { value: 'en', label: 'English' }, { value: 'es', label: 'Español' }, { value: 'fr', label: 'Français' },
          { value: 'de', label: 'Deutsch' }, { value: 'ja', label: '日本語' },
        ]), true)}
      </div>`;

    case 'appearance': return `
      <div class="sb-set-section">
        <div class="sb-set-section-label">Theme</div>
        ${_sbRow('🌗', 'Color Theme', 'Switch between dark, light, or auto',
          _sbSeg('theme', s.theme || 'dark', [
            { value: 'dark', label: '🌙 Dark' }, { value: 'light', label: '☀️ Light' }, { value: 'auto', label: '🌓 Auto' },
          ]))}
        ${_sbRow('🌈', 'Accent Color', 'Primary highlight color',
          `<div class="sb-set-colors" data-colors="accent">
            ${['#4d9dff','#34d97f','#ff5a6e','#ffb340','#b586ff','#2ee6d6','#ff66ff','#ff8a3d'].map(c =>
              `<button type="button" class="sb-set-color ${s.accent === c ? 'on' : ''}" style="--c:${c}" data-color="${c}"></button>`).join('')}
          </div>`)}
      </div>
      <div class="sb-set-section">
        <div class="sb-set-section-label">Display</div>
        ${_sbRow('🔤', 'Font Size', `${s.fontSize || 13}px base size`,
          _sbSelect('fontSize', String(s.fontSize || 13), [
            { value: '11', label: 'Small (11px)' }, { value: '13', label: 'Default (13px)' },
            { value: '15', label: 'Large (15px)' }, { value: '17', label: 'Extra Large (17px)' },
          ]))}
        ${_sbRow('🎬', 'Reduce Motion', 'Disable animations', _sbToggle('motion', s.motion === 'off'))}
        ${_sbRow('📐', 'Compact Mode', 'Tighter padding and spacing', _sbToggle('compact', !!s.compact))}
        ${_sbRow('🌓', 'High Contrast', 'Increase contrast for better visibility', _sbToggle('highContrast', !!s.highContrast), true)}
        ${_sbRow('🔮', 'Reduce Transparency', 'Disable blur effects for lower GPU use', _sbToggle('reduceTransparency', !!s.reduceTransparency), true)}
      </div>
      <div class="sb-set-section">
        <div class="sb-set-section-label">Chat Appearance</div>
        ${_sbRow('📚', 'Message Grouping', 'Group consecutive messages from the same person', _sbToggle('messageGrouping', s.messageGrouping !== false), true)}
        ${_sbRow('🕐', 'Show Timestamps', 'Display time next to each message', _sbToggle('hideTimestamps', s.hideTimestamps !== true), true)}
      </div>`;

    case 'chat': return `
      <div class="sb-set-section">
        <div class="sb-set-section-label">Input & Sending</div>
        ${_sbRow('↵', 'Press Enter to Send', 'When off, Enter adds a new line', _sbToggle('enterToSend', s.enterToSend !== false))}
        ${_sbRow('✍️', 'Auto-grow Textarea', 'Textarea expands as you type', _sbToggle('autoGrowInput', s.autoGrowInput !== false), true)}
        ${_sbRow('😀', 'Auto Emoji', 'Convert :) :D <3 into emoji automatically', _sbToggle('autoEmoji', !!s.autoEmoji), true)}
        ${_sbRow('🔗', 'Link Previews', 'Show previews for URLs in messages', _sbToggle('linkPreviews', s.linkPreviews !== false), true)}
      </div>
      <div class="sb-set-section">
        <div class="sb-set-section-label">Behavior</div>
        ${_sbRow('⌨️', 'Typing Indicators', 'Show when others are typing', _sbToggle('typingIndicators', s.typingIndicators !== false))}
        ${_sbRow('✓', 'Read Receipts', 'Show delivered and read status', _sbToggle('readReceipts', s.readReceipts !== false))}
        ${_sbRow('✨', 'Message Effects', 'Enable confetti, fireworks, and shake', _sbToggle('effects', s.effects !== false))}
        ${_sbRow('⬇️', 'Auto-scroll to New Messages', 'Jump to bottom when a new message arrives', _sbToggle('autoScroll', s.autoScroll !== false), true)}
        ${_sbRow('📖', 'Auto-mark as Read', 'Mark messages read when you open the chat', _sbToggle('autoMarkRead', s.autoMarkRead !== false), true)}
      </div>
      <div class="sb-set-section">
        <div class="sb-set-section-label">History</div>
        ${_sbRow('🗑', 'Auto-delete Messages', s.autoDeleteDays > 0 ? `Delete messages older than ${s.autoDeleteDays} days` : 'Never delete',
          _sbSelect('autoDeleteDays', String(s.autoDeleteDays || 0), [
            { value: '0', label: 'Never' }, { value: '7', label: 'After 7 days' },
            { value: '30', label: 'After 30 days' }, { value: '90', label: 'After 90 days' }, { value: '365', label: 'After 1 year' },
          ]))}
      </div>`;

    case 'notifications': return `
      <div class="sb-set-section">
        <div class="sb-set-section-label">Delivery</div>
        ${_sbRow('💬', 'In-App Toasts', 'Show notifications as toast popups', _sbToggle('notifications', s.notifications !== 'none' && s.notifications !== false))}
        ${_sbRow('🔔', 'Desktop Notifications', 'Native OS-level notifications', _sbToggle('desktopNotif', !!s.desktopNotif))}
        ${window.isPushSupported?.() ? _sbRow('📱', 'Push Notifications', 'Receive notifications even when the tab is closed', _sbToggle('pushNotif', !!s.pushNotif)) : ''}
        ${_sbRow('📄', 'Message Preview', 'Show message text in notifications', _sbToggle('messagePreview', s.messagePreview !== false), true)}
      </div>
      <div class="sb-set-section">
        <div class="sb-set-section-label">What to notify me about</div>
        ${_sbRow('📬', 'New Messages', 'Notifications for new chat messages', _sbToggle('notifMessages', s.notifMessages !== false))}
        ${_sbRow('🎣', 'Hook Events', 'When someone hooks your session', _sbToggle('notifHooks', s.notifHooks !== false))}
        ${_sbRow('⚠️', 'Warnings & Mutes', 'When a moderator warns or mutes you', _sbToggle('notifWarns', s.notifWarns !== false))}
        ${_sbRow('🚫', 'Ban Events', 'When you are banned or unbanned', _sbToggle('notifBans', s.notifBans !== false), true)}
      </div>
      <div class="sb-set-section">
        <div class="sb-set-section-label">Quiet Hours</div>
        ${_sbRow('🌙', 'Quiet Hours', 'Suppress notifications during set hours', _sbToggle('quietHoursEnabled', !!s.quietHoursEnabled), true)}
        ${_sbRow('🕐', 'From', 'Start of quiet window', _sbTime('quietHoursStart', s.quietHoursStart || '22:00'), true)}
        ${_sbRow('🕐', 'To', 'End of quiet window', _sbTime('quietHoursEnd', s.quietHoursEnd || '08:00'), true)}
      </div>
      <div class="sb-set-section">
        <div class="sb-set-section-label">Sound</div>
        ${_sbRow('🔊', 'Sound Effects', 'Master toggle for all sounds', _sbToggle('sound', s.sound !== false))}
        ${_sbRow('🎚', 'Volume', `${Math.round((s.volume || 0.6) * 100)}%`, _sbRange('volume', Math.round((s.volume || 0.6) * 100), 0, 100, 5, '%'))}
        ${_sbRow('🎵', 'Sound Scheme', 'Style of sound effects',
          _sbSeg('soundScheme', s.soundScheme || 'default', [
            { value: 'default', label: 'Default' }, { value: 'soft', label: 'Soft' }, { value: 'chime', label: 'Chime' }, { value: 'deep', label: 'Deep' },
          ]), true)}
      </div>`;

    case 'privacy': return `
      <div class="sb-set-section">
        <div class="sb-set-section-label">Visibility</div>
        ${_sbRow('🟢', 'Show Online Status', 'Others see when you\'re active', _sbToggle('showOnline', s.showOnline !== false))}
        ${_sbRow('🙈', 'Hide from Hook List', 'Don\'t appear as a hook target', _sbToggle('hideFromHooks', !!s.hideFromHooks))}
        ${_sbRow('👤', 'Show Last Seen', 'Let others see when you were last active', _sbToggle('showLastSeen', s.showLastSeen !== false), true)}
        ${_sbRow('👁', 'Profile Visibility', 'Who can view your full profile',
          _sbSeg('profileVisibility', s.profileVisibility || 'everyone', [
            { value: 'everyone', label: 'Everyone' }, { value: 'friends', label: 'Friends' }, { value: 'private', label: 'Private' },
          ]), true)}
        ${_sbRow('✉️', 'Allow DMs', 'Who can send you direct messages',
          _sbSeg('allowDMs', s.allowDMs || 'everyone', [
            { value: 'everyone', label: 'Everyone' }, { value: 'friends', label: 'Friends' }, { value: 'nobody', label: 'Nobody' },
          ]), true)}
      </div>
      <div class="sb-set-section">
        <div class="sb-set-section-label">Blocked Users</div>
        <div class="sb-set-blocked" id="sbSetBlockedList"></div>
      </div>`;

    case 'advanced': return `
      <div class="sb-set-section">
        <div class="sb-set-section-label">Developer</div>
        ${_sbRow('🐞', 'Debug Mode', 'Verbose console logging', _sbToggle('debugMode', !!s.debugMode))}
        ${_sbRow('🚀', 'Live Updates', 'Auto-refresh as data changes', _sbToggle('liveUpdates', s.liveUpdates !== false), true)}
      </div>
      <div class="sb-set-section">
        <div class="sb-set-section-label">Maintenance</div>
        ${_sbRow('🔄', 'Reload App', 'Fresh start with current data', `<button class="sb-set-action" data-action="reload">Reload</button>`)}
        ${_sbRow('🧹', 'Clear Cache', 'Remove cached hook data and prefs', `<button class="sb-set-action" data-action="clear-cache">Clear ›</button>`)}
      </div>
      <div class="sb-set-section">
        <div class="sb-set-section-label">About</div>
        ${_sbRow('ℹ️', 'Version', 'SafeBeef v83', `<span style="font-family:var(--mono);font-size:11px;color:var(--text-3)">v83.0</span>`)}
      </div>`;

    case 'data': return `
      <div class="sb-set-section">
        <div class="sb-set-section-label">Export</div>
        ${_sbRow('📦', 'Export All Data', 'Download complete backup as JSON', `<button class="sb-set-action" data-action="export-all">Download</button>`)}
        ${_sbRow('📥', 'Export Settings Only', 'Just your preferences', `<button class="sb-set-action" data-action="export-settings">Download</button>`, true)}
        ${_sbRow('📤', 'Import Settings', 'Restore from a JSON file', `<button class="sb-set-action" data-action="import-settings">Upload</button>`, true)}
      </div>
      <div class="sb-set-section">
        <div class="sb-set-section-label">Danger zone</div>
        <div class="sb-set-danger">
          <div class="sb-set-danger-ico">🗑️</div>
          <div class="sb-set-danger-body">
            <div class="sb-set-danger-title">Clear All Data</div>
            <div class="sb-set-danger-desc">Delete all messages, chat history, hook logs, and preferences. Your account and bans are kept. <strong>This cannot be undone.</strong></div>
            <button type="button" class="sb-set-danger-btn" data-action="clear-data">Delete everything</button>
          </div>
        </div>
        <div class="sb-set-danger">
          <div class="sb-set-danger-ico">♻️</div>
          <div class="sb-set-danger-body">
            <div class="sb-set-danger-title">Reset All Settings</div>
            <div class="sb-set-danger-desc">Return every preference to its default value. Messages and account are not affected.</div>
            <button type="button" class="sb-set-danger-btn" data-action="reset-settings">Reset settings</button>
          </div>
        </div>
      </div>`;
    default: return '';
  }
}

function _sbRenderSettings() {
  if (!_sbSettingsOverlay) return;
  const s = window.settings || {};
  const tabsEl = _sbSettingsOverlay.querySelector('.sb-set-tabs');
  const bodyEl = _sbSettingsOverlay.querySelector('.sb-set-body');
  if (!tabsEl || !bodyEl) return;

  tabsEl.innerHTML = SB_SETTINGS_TABS.map(t =>
    `<button type="button" class="sb-set-tab ${_sbSettingsTab === t.id ? 'on' : ''} ${t.id === 'data' ? 'danger' : ''}" data-settings-tab="${t.id}">
      <span class="sb-set-tab-ico">${t.icon}</span><span class="sb-set-tab-label">${t.label}</span>
    </button>`
  ).join('');
  tabsEl.querySelectorAll('[data-settings-tab]').forEach(btn => {
    btn.onclick = () => { _sbSettingsTab = btn.dataset.settingsTab; _sbRenderSettings(); };
  });

  bodyEl.innerHTML = _sbRenderSettingsContent(s);
  _sbWireSettingsBody(s);
}

function _sbWireSettingsBody(s) {
  const root = _sbSettingsOverlay;
  if (!root) return;

  // Toggles
  root.querySelectorAll('[data-toggle]').forEach(el => {
    el.onclick = async () => {
      const key = el.dataset.toggle;
      const next = !el.classList.contains('on');
      el.classList.toggle('on', next);
      el.setAttribute('aria-pressed', String(next));
      _sbSetKey(key, next);

      // Desktop notifications: request browser permission when enabling
      if (key === 'desktopNotif' && next) {
        try {
          const perm = await requestDesktopNotifPermission();
          if (perm === 'granted') {
            toast('Desktop notifications enabled', 'You will receive native notifications', 'success', 2500);
          } else if (perm === 'denied') {
            // User denied; revert the toggle
            el.classList.toggle('on', false);
            el.setAttribute('aria-pressed', 'false');
            _sbSetKey(key, false);
            toast('Permission denied', 'Desktop notifications were blocked by the browser', 'warn', 2500);
          } else {
            toast('Permission not granted', 'Desktop notifications may not appear', 'warn', 2500);
          }
        } catch (e) {
          toast('Error', 'Could not request notification permission', 'error', 2500);
        }
      }

      // Push notifications: subscribe/unsubscribe
      if (key === 'pushNotif') {
        if (next && window.isPushSupported && window.isPushSupported()) {
          const result = await window.subscribePush?.();
          if (result.subscribed) {
            toast('Push notifications enabled', 'You will receive push notifications even when the tab is closed', 'success', 2500);
          } else if (result.error) {
            el.classList.toggle('on', false);
            el.setAttribute('aria-pressed', 'false');
            _sbSetKey(key, false);
            toast('Push unavailable', result.error, 'warn', 2500);
          }
        } else if (!next) {
          await window.unsubscribePush?.();
          toast('Push notifications disabled', 'You will no longer receive push notifications', 'info', 2500);
        }
      }

      if (key === 'compact') document.body.classList.toggle('compact-mode', next);
      if (key === 'motion') { if (window.settings) window.settings.motion = next ? 'off' : 'auto'; applySettings(); }
      if (key === 'sound' && next) try { beep(1200, 0.08); } catch (e) {}
      if (key === 'highContrast' || key === 'reduceTransparency' || key === 'messageGrouping' || key === 'hideTimestamps') applyBehaviorSettings();

      // Toast confirmation for other toggles
      if (key !== 'desktopNotif' && key !== 'pushNotif' && key !== 'sound') {
        const label = el.querySelector('.settings-row-title')?.textContent || key;
        toast(`${next ? 'Enabled' : 'Disabled'}`, label, 'success', 1200);
      }
    };
  });

  // Selects
  root.querySelectorAll('[data-select]').forEach(el => {
    el.onchange = () => {
      const key = el.dataset.select;
      let v = el.value;
      if (key === 'autoLogoutMin' || key === 'autoDeleteDays') v = parseInt(v, 10) || 0;
      if (key === 'fontSize') v = parseInt(v, 10) || 13;
      _sbSetKey(key, v);
    };
  });

  // Segmented
  root.querySelectorAll('[data-seg]').forEach(btn => {
    btn.onclick = () => {
      const [key, val] = btn.dataset.seg.split(':');
      _sbSetKey(key, val);
      _sbRenderSettings();
    };
  });

  // Color swatches
  root.querySelectorAll('[data-color]').forEach(btn => {
    btn.onclick = () => { _sbSetKey('accent', btn.dataset.color); _sbRenderSettings(); };
  });

  // Range
  root.querySelectorAll('[data-range]').forEach(el => {
    const update = () => {
      const key = el.dataset.range;
      const unit = el.dataset.unit || '';
      let v = parseFloat(el.value);
      if (key === 'volume') v = v / 100;
      _sbSetKey(key, v);
      const display = root.querySelector(`[data-range-val="${el.dataset.range}"]`);
      if (display) display.textContent = el.value + unit;
    };
    el.oninput = update;
    el.onchange = () => { try { beep(800, 0.06); } catch (e) {} };
  });

  // Time
  root.querySelectorAll('[data-time]').forEach(el => {
    el.onchange = () => _sbSetKey(el.dataset.time, el.value);
  });

  // Actions
  root.querySelectorAll('[data-action]').forEach(btn => {
    btn.onclick = () => _sbHandleAction(btn.dataset.action);
  });

  // Blocked users list
  const blockedEl = root.querySelector('#sbSetBlockedList');
  if (blockedEl && _sbSettingsTab === 'privacy') {
    _sbRenderBlockedList(blockedEl);
  }
}

function _sbHandleAction(action) {
  const panel = _sbSettingsOverlay;
  if (action === 'open-profile') { panel?.remove(); openProfile(); return; }
  if (action === 'reload') {
    sbPrompt({
      title: 'Reload App', subtitle: 'Data preserved', icon: '🔄',
      content: `<p style="font-size:12.5px;color:var(--text-2);line-height:1.6">Reload the page? Your data is preserved.</p>`,
      buttons: [{ label: 'Cancel', action: 'close' }, { label: 'Reload', class: 'primary', action: () => location.reload() }],
    });
    return;
  }
  if (action === 'clear-cache') { _sbClearCache(); return; }
  if (action === 'export-all') { panel?.remove(); exportAllData(); return; }
  if (action === 'export-settings') {
    const blob = new Blob([JSON.stringify(window.settings || {}, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `safebeef-settings-${Date.now()}.json`; a.click();
    toast('Exported', 'Settings downloaded', 'success');
    return;
  }
  if (action === 'import-settings') {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files[0]; if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON');
        Object.assign(window.settings, parsed);
        applySettings();
        _sbRenderSettings();
        toast('Imported', 'Settings restored', 'success');
      } catch (e) { toast('Import failed', e.message, 'error'); }
    };
    input.click();
    return;
  }
  if (action === 'clear-data') {
    sbPrompt({
      title: 'Clear All Data?', subtitle: 'This cannot be undone', icon: '⚠️',
      content: `<div style="padding:12px 14px;background:rgba(255,90,110,.08);border:1px solid rgba(255,90,110,.35);border-radius:10px;color:#ff8294;line-height:1.5;font-size:12px"><strong>All SafeBeef data will be deleted:</strong><br>Messages, chat history, hook logs, preferences, settings, reports. Your account and bans are kept.</div>`,
      buttons: [
        { label: 'Cancel', action: 'close' },
        { label: 'Delete Everything', class: 'danger', action: (m, c) => { c(); panel?.remove(); clearAllData(); } },
      ],
    });
    return;
  }
  if (action === 'reset-settings') {
    sbPrompt({
      title: 'Reset All Settings?', subtitle: 'Default values will be restored', icon: '♻️',
      content: `<p style="font-size:12.5px;color:var(--text-2);line-height:1.6">Every preference returns to its default. Messages and account are untouched.</p>`,
      buttons: [
        { label: 'Cancel', action: 'close' },
        { label: 'Reset', class: 'danger', action: (m, c) => {
          try { localStorage.removeItem('sb26_settings'); } catch (e) {}
          if (window.DEFAULT_SETTINGS) Object.assign(window.settings, window.DEFAULT_SETTINGS);
          applySettings();
          _sbRenderSettings();
          c();
          toast('Reset', 'All settings restored to defaults', 'success');
        }},
      ],
    });
    return;
  }
  if (action === 'change-email') return _sbChangeEmail();
  if (action === 'change-password') return _sbChangePassword();
  if (action === 'signout-others') return _sbSignoutOthers();
  if (action === 'view-sessions') return _sbViewSessions();
}

function _sbChangeEmail() {
  sbPrompt({
    title: 'Email Address', subtitle: 'Used for account recovery', icon: '✉️',
    content: `
      <label class="sb-prompt-label">Current email</label>
      <div style="padding:10px 12px;background:var(--bg);border:1px solid var(--border-2);border-radius:8px;font-family:var(--mono);font-size:12px;color:var(--text-2);word-break:break-all">${_sbEsc(ME.email || 'Not set')}</div>
      <label class="sb-prompt-label" style="margin-top:14px">New email</label>
      <input type="email" id="sbEmailInput" class="sb-prompt-input" placeholder="you@example.com" autocomplete="off">
      <div class="sb-prompt-hint">Valid format required.</div>`,
    buttons: [
      { label: 'Cancel', class: 'secondary', action: 'close' },
      { label: 'Save', class: 'primary', action: (modal, close) => {
        const v = modal.querySelector('#sbEmailInput').value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return toast('Invalid email', 'Enter a valid email address', 'warn');
        const users = Auth.getUsers();
        if (Object.values(users).some(u => u.email === v && u.username !== ME.username)) return toast('In use', 'That email is already registered', 'warn');
        users[ME.username].email = v; Auth.saveUsers(users);
        ME.email = v;
        close(); _sbRenderSettings();
        toast('Email updated', v, 'success');
      }},
    ],
    onMount: (modal) => setTimeout(() => { const i = modal.querySelector('#sbEmailInput'); if (i) i.focus(); }, 60),
  });
}

function _sbChangePassword() {
  sbPrompt({
    title: 'Change Password', subtitle: 'Update your sign-in password', icon: '🔑',
    content: `
      <label class="sb-prompt-label">Current password</label>
      <input type="password" id="sbOldPass" class="sb-prompt-input" placeholder="Current password" autocomplete="current-password">
      <label class="sb-prompt-label" style="margin-top:12px">New password</label>
      <input type="password" id="sbNewPass" class="sb-prompt-input" placeholder="At least 6 characters" autocomplete="new-password">
      <label class="sb-prompt-label" style="margin-top:12px">Confirm new password</label>
      <input type="password" id="sbConfirmPass" class="sb-prompt-input" placeholder="Type it again" autocomplete="new-password">`,
    buttons: [
      { label: 'Cancel', class: 'secondary', action: 'close' },
      { label: 'Save', class: 'primary', action: (modal, close) => {
        const oldP = modal.querySelector('#sbOldPass').value;
        const newP = modal.querySelector('#sbNewPass').value;
        const conf = modal.querySelector('#sbConfirmPass').value;
        if (!oldP) return toast('Required', 'Enter current password', 'warn');
        if (newP.length < 6) return toast('Too short', 'At least 6 characters', 'warn');
        if (newP !== conf) return toast('Mismatch', 'Passwords do not match', 'warn');
        const users = Auth.getUsers();
        const user = users[ME.username];
        try {
          const salt = user.salt || Math.random().toString(36).slice(2, 12);
          user.salt = salt;
          const hash = (str) => {
            let h = 0x811c9dc5;
            for (let it = 0; it < 3; it++) for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i) + it; h = Math.imul(h, 0x01000193); }
            return (h >>> 0).toString(16).padStart(8, '0');
          };
          user.hash = hash(salt + '::' + newP + '::sb44');
        } catch (e) {}
        Auth.saveUsers(users);
        close(); toast('Password updated', 'Use new password next sign-in', 'success');
      }},
    ],
  });
}

function _sbSignoutOthers() {
  sbPrompt({
    title: 'Sign Out Other Sessions', subtitle: 'You will stay signed in here', icon: '🔐',
    content: `<p style="font-size:12.5px;color:var(--text-2);line-height:1.6">Other tabs signed into <strong>@${_sbEsc(ME.username)}</strong> will be signed out.</p>`,
    buttons: [
      { label: 'Cancel', class: 'secondary', action: 'close' },
      { label: 'Sign Out All', class: 'danger', action: (modal, close) => {
        try {
          const inv = JSON.parse(localStorage.getItem('sb26_session_invalidated') || '{}');
          inv[ME.username] = Date.now();
          localStorage.setItem('sb26_session_invalidated', JSON.stringify(inv));
          sessionStorage.setItem('sb26_session_ts', String(Date.now()));
          window.RT?.emit?.('force-signout', { username: ME.username });
        } catch (e) {}
        try { window.appChannel?.postMessage({ type: 'force-signout-others', from: ME.username, tabId: (window.state && state.tabId) || null }); } catch (_) {}
        close(); toast('Other sessions signed out', 'You remain signed in here', 'success');
      }},
    ],
  });
}

function _sbViewSessions() {
  sbPrompt({
    title: 'Active Sessions', subtitle: 'Tabs signed into your account', icon: '📱',
    content: `<div id="sbSessionsList" style="max-height:300px;overflow-y:auto;min-height:60px"><div style="text-align:center;padding:20px;color:var(--text-3);font-size:12px">Loading…</div></div>`,
    buttons: [{ label: 'Close', class: 'primary', action: 'close' }],
    onMount: (modal) => {
      setTimeout(() => {
        const list = modal.querySelector('#sbSessionsList');
        if (!list) return;
        const zombies = (window.state && window.state.zombies) || [];
        const tabs = zombies.filter(z => z.username === ME.username);
        if (!tabs.length) { list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-3);font-size:12px">No sessions detected</div>'; return; }
        list.innerHTML = tabs.map(t => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border-2);border-radius:8px;margin-bottom:6px">
            <div style="width:32px;height:32px;border-radius:50%;background:${t.color};display:grid;place-items:center;color:#fff;font-weight:800;font-size:12px">${_sbEsc(t.avatar)}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12.5px;font-weight:700">${t.isMe ? 'This Tab' : 'Other Tab'}</div>
              <div style="font-size:10px;color:var(--text-3);font-family:var(--mono)">${_sbEsc(t.tabId || '—')} · ${liveFormatRelative(t.lastSeen || Date.now())}</div>
            </div>
            ${t.isMe ? '<span style="font-size:9px;padding:2px 8px;background:var(--green-bg);color:var(--green-2);border:1px solid var(--green-border);border-radius:5px;font-weight:800">CURRENT</span>' : ''}
          </div>
        `).join('');
      }, 200);
    },
  });
}

function _sbRenderBlockedList(el) {
  const KEY = 'sb26_blocks';
  let blocked = [];
  try { const m = JSON.parse(localStorage.getItem(KEY) || '{}'); blocked = Array.isArray(m[ME.username]) ? m[ME.username] : []; } catch (e) {}
  const users = Auth.getUsers();
  const others = Object.values(users).filter(u => u.username !== ME.username);

  if (!blocked.length) {
    el.innerHTML = `<div class="sb-set-blocked-empty">No blocked users.</div>`;
    return;
  }

  el.innerHTML = blocked.map(u => {
    const usr = users[u] || { display: u, avatar: (u || '??').slice(0, 2).toUpperCase(), color: '#666' };
    return `<div class="sb-set-blocked-row">
      <div class="sb-set-blocked-avatar" style="background:${_sbEsc(usr.color || '#666')}">${_sbEsc(usr.avatar || '??')}</div>
      <div class="sb-set-blocked-info">
        <div class="sb-set-blocked-name">${_sbEsc(usr.display || u)}</div>
        <div class="sb-set-blocked-user">@${_sbEsc(u)}</div>
      </div>
      <button type="button" class="sb-set-blocked-unblock" data-unblock-user="${_sbEsc(u)}">Unblock</button>
    </div>`;
  }).join('');

  el.querySelectorAll('[data-unblock-user]').forEach(btn => {
    btn.onclick = () => {
      const u = btn.dataset.unblockUser;
      try {
        if (window.SBBlocks) SBBlocks.unblock(ME.username, u);
        else {
          const m = JSON.parse(localStorage.getItem(KEY) || '{}');
          if (Array.isArray(m[ME.username])) m[ME.username] = m[ME.username].filter(x => x !== u);
          localStorage.setItem(KEY, JSON.stringify(m));
        }
      } catch (e) {}
      _sbRenderBlockedList(el);
      toast('Unblocked', '@' + u, 'success');
    };
  });
}

function _sbClearCache() {
  sbPrompt({
    title: 'Clear Cache', subtitle: 'Frees up local space', icon: '🧹',
    content: `<p style="font-size:12.5px;color:var(--text-2);line-height:1.6">Clears cached hook data, recent module history, and stale session data. Account, messages, and settings are <strong>not</strong> deleted.</p>`,
    buttons: [
      { label: 'Cancel', class: 'secondary', action: 'close' },
      { label: 'Clear Cache', class: 'primary', action: (modal, close) => {
        let count = 0;
        try { localStorage.removeItem('sb26_user_prefs_' + ME.username); count++; } catch (e) {}
        const cutoff = Date.now() - 7 * 86400000;
        Object.keys(localStorage).filter(k => k.startsWith('sb_hook_log_')).forEach(key => {
          try {
            const log = JSON.parse(localStorage.getItem(key) || '[]');
            const filtered = log.filter(e => (e.ts || 0) >= cutoff);
            if (filtered.length !== log.length) { localStorage.setItem(key, JSON.stringify(filtered)); count++; }
          } catch (e) {}
        });
        try { localStorage.removeItem('sb26_session_invalidated'); count++; } catch (e) {}
        close();
        toast('Cache cleared', count + ' item' + (count === 1 ? '' : 's') + ' cleaned', 'success', 2500);
        _sbRenderSettings();
      }},
    ],
  });
}

function openSettings() {
  if (_sbSettingsOverlay && document.body.contains(_sbSettingsOverlay)) {
    _sbRenderSettings();
    return;
  }
  document.querySelectorAll('.settings-panel, .sb-set-overlay').forEach(el => el.remove());

  _sbSettingsOverlay = document.createElement('div');
  _sbSettingsOverlay.className = 'sb-set-overlay';
  _sbSettingsOverlay.innerHTML = `
    <div class="sb-set-shell" role="dialog" aria-modal="true">
      <header class="sb-set-head">
        <div class="sb-set-head-left">
          <div class="sb-set-head-ico">⚙️</div>
          <div>
            <h2 class="sb-set-head-title">Settings</h2>
            <div class="sb-set-head-sub">${_sbEsc(ME.display)} · @${_sbEsc(ME.username)}</div>
          </div>
        </div>
        <button type="button" class="sb-set-close" aria-label="Close">×</button>
      </header>
      <div class="sb-set-content">
        <nav class="sb-set-tabs" role="tablist"></nav>
        <main class="sb-set-body"></main>
      </div>
    </div>`;
  document.body.appendChild(_sbSettingsOverlay);

  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const close = () => {
    document.body.style.overflow = prevOverflow;
    if (!_sbSettingsOverlay) return;
    _sbSettingsOverlay.style.opacity = '0';
    _sbSettingsOverlay.style.transition = 'opacity .18s';
    const el = _sbSettingsOverlay;
    _sbSettingsOverlay = null;
    setTimeout(() => el.remove(), 180);
  };

  _sbSettingsOverlay.querySelector('.sb-set-close').onclick = close;
  _sbSettingsOverlay.addEventListener('click', e => { if (e.target === _sbSettingsOverlay) close(); });
  const escH = (e) => { if (e.key === 'Escape') { document.removeEventListener('keydown', escH); close(); } };
  document.addEventListener('keydown', escH);

  // Live re-render on external changes
  try {
    const bc = new BroadcastChannel('sb26_settings_sync');
    bc.onmessage = (e) => {
      if (e.data && e.data.action === 'settings-changed' && _sbSettingsOverlay) _sbRenderSettings();
    };
  } catch (e) {}

  _sbRenderSettings();
}
window.openSettings = openSettings;

/* ---------- Data helpers ---------- */
function exportAllData() {
  const dump = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith('sb')) continue;
    try { dump[k] = JSON.parse(localStorage.getItem(k)); } catch (e) { dump[k] = localStorage.getItem(k); }
  }
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `safebeef-backup-${Date.now()}.json`;
  a.click();
  toast('Exported', 'Complete backup downloaded', 'success');
}
function clearAllData() {
  Object.keys(localStorage).forEach(k => {
    if ((k.startsWith('sb26_') || k.startsWith('sb_hook_log_') || k.startsWith('sb44_') || k.startsWith('sb45_'))
        && !k.startsWith('sb26_users') && !k.startsWith('sb26_bans')) {
      localStorage.removeItem(k);
    }
  });
  toast('Data cleared', 'Reloading…', 'warn');
  setTimeout(() => location.reload(), 1500);
}

/* ============================================================
   COMMAND PALETTE
   ============================================================ */
function openCommandPalette() {
  document.querySelectorAll('.cmd-palette-overlay').forEach(el => el.remove());
  const overlay = document.createElement('div');
  overlay.className = 'cmd-palette-overlay';
  overlay.innerHTML = `
    <div class="cmd-palette">
      <div class="cmd-input-row">
        <span style="font-size:16px;opacity:0.5">🔍</span>
        <input type="text" id="cmdInput" placeholder="Search modules, users, commands…" autocomplete="off">
        <span class="cmd-kbd">ESC</span>
      </div>
      <div class="cmd-results" id="cmdResults"></div>
    </div>`;
  document.body.appendChild(overlay);
  const input = overlay.querySelector('#cmdInput');
  const results = overlay.querySelector('#cmdResults');
  const allItems = [];
  (window.MODULE_REGISTRY || []).forEach(m => {
    allItems.push({ ico: m.ico, label: m.name, cat: m.cat, action: () => { close(); window.runModule(m.id); } });
  });
  Auth.listOthers().forEach(u => {
    allItems.push({ ico: u.avatar, label: u.display + ' (@' + u.username + ')', cat: 'Chat', action: () => { close(); window.App.chatWith(u.username); } });
  });
  if (window.AM_PRIVILEGED) allItems.push({ ico: '🛡', label: 'Moderation Panel', cat: 'Admin', action: () => { close(); window.openModPanel(); } });
  allItems.push(
    { ico: '👤', label: 'My Profile', cat: 'App', action: () => { close(); openProfile(); } },
    { ico: '⚙', label: 'Settings', cat: 'App', action: () => { close(); openSettings(); } },
    { ico: '📊', label: 'Stats', cat: 'App', action: () => { close(); openStats(); } },
    { ico: '🚪', label: 'Sign out', cat: 'App', action: () => { close(); Auth.logout(); location.replace('auth.html'); } }
  );
  let activeIdx = 0;
  let currentItems = [];
  function render(q) {
    const query = (q || '').toLowerCase().trim();
    currentItems = allItems.filter(item => !query || item.label.toLowerCase().includes(query) || item.cat.toLowerCase().includes(query)).slice(0, 20);
    activeIdx = 0;
    results.innerHTML = currentItems.map((item, i) =>
      `<div class="cmd-result ${i === activeIdx ? 'active' : ''}" data-idx="${i}">
        <span class="cmd-ico">${item.ico}</span>
        <span class="cmd-label">${esc(item.label)}</span>
        <span class="cmd-cat">${esc(item.cat)}</span>
      </div>`
    ).join('');
    results.querySelectorAll('[data-idx]').forEach(el => {
      el.onclick = () => { const idx = parseInt(el.dataset.idx); currentItems[idx]?.action(); };
    });
  }
  function close() { overlay.remove(); document.removeEventListener('keydown', keyHandler); }
  function keyHandler(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (currentItems.length) { activeIdx = (activeIdx + 1) % currentItems.length; render(input.value); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (currentItems.length) { activeIdx = (activeIdx - 1 + currentItems.length) % currentItems.length; render(input.value); } }
    else if (e.key === 'Enter') { e.preventDefault(); if (currentItems[activeIdx]) currentItems[activeIdx].action(); }
  }
  input.addEventListener('input', () => render(input.value));
  document.addEventListener('keydown', keyHandler);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  render('');
  setTimeout(() => input.focus(), 50);
}
window.openCommandPalette = openCommandPalette;

/* ============================================================
   STATS PANEL
   ============================================================ */
function openStats() {
  document.querySelectorAll('.stats-panel').forEach(el => el.remove());
  function computeAll() {
    const messagesCount = Object.keys(localStorage).filter(k => k.startsWith('sb26_chat_')).reduce((sum, k) => {
      try { return sum + (JSON.parse(localStorage.getItem(k))?.length || 0); } catch (e) { return sum; }
    }, 0);
    const hookLogsCount = Object.keys(localStorage).filter(k => k.startsWith('sb_hook_log_')).reduce((sum, k) => {
      try { return sum + (JSON.parse(localStorage.getItem(k))?.length || 0); } catch (e) { return sum; }
    }, 0);
    const zombies = (window.state && window.state.zombies) || [];
    return {
      keys: (window.state && window.state.keys) || 0,
      clicks: (window.state && window.state.clicks) || 0,
      modulesRun: (window.state && window.state.modulesRun) || 0,
      messagesCount, hookLogsCount,
      othersCount: Auth.listOthers().length,
      onlineCount: zombies.filter(z => !z.isMe && z.visible !== false).length,
      hooked: (window.state && window.state.hooked) ? '@' + window.state.hooked.username : '—',
    };
  }
  const data = computeAll();
  const panel = document.createElement('div');
  panel.className = 'stats-panel';
  panel.innerHTML = `
    <div class="settings-shell">
      <div class="settings-head">
        <div class="settings-head-left">
          <div class="settings-head-icon">📊</div>
          <div class="settings-head-text"><h2>Your Stats</h2><div class="settings-head-meta">@${esc(ME.username)} · <span id="statsUpdateTime">live</span></div></div>
        </div>
        <button class="imsg-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="settings-body">
        <div class="stats-grid">
          <div class="stats-card-item"><div class="stats-ico">⌨️</div><div class="stats-v" id="statKeys">${liveFormatNum(data.keys)}</div><div class="stats-k">Key presses</div></div>
          <div class="stats-card-item"><div class="stats-ico">🖱️</div><div class="stats-v" id="statClicks">${liveFormatNum(data.clicks)}</div><div class="stats-k">Clicks</div></div>
          <div class="stats-card-item"><div class="stats-ico">🧩</div><div class="stats-v" id="statModules">${liveFormatNum(data.modulesRun)}</div><div class="stats-k">Modules run</div></div>
          <div class="stats-card-item"><div class="stats-ico">💬</div><div class="stats-v" id="statMessages">${liveFormatNum(data.messagesCount)}</div><div class="stats-k">Messages</div></div>
          <div class="stats-card-item"><div class="stats-ico">🎣</div><div class="stats-v" id="statHooks">${liveFormatNum(data.hookLogsCount)}</div><div class="stats-k">Hook events</div></div>
          <div class="stats-card-item"><div class="stats-ico">👥</div><div class="stats-v" id="statOthers">${liveFormatNum(data.othersCount)}</div><div class="stats-k">Other accounts</div></div>
          <div class="stats-card-item"><div class="stats-ico">🌐</div><div class="stats-v" id="statOnline">${liveFormatNum(data.onlineCount)}</div><div class="stats-k">Online now</div></div>
          <div class="stats-card-item"><div class="stats-ico">🎯</div><div class="stats-v" id="statHooked" style="font-size:14px">${esc(data.hooked)}</div><div class="stats-k">Hooked target</div></div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(panel);
  panel.querySelector('.imsg-close').onclick = () => panel.remove();
  panel.addEventListener('click', e => { if (e.target === panel) panel.remove(); });

  let lastRefreshAt = 0;
  function refresh() {
    if (!document.body.contains(panel)) return;
    const d = computeAll();
    const set = (id, val) => { const el = panel.querySelector('#' + id); if (el) el.textContent = String(val); };
    set('statKeys', liveFormatNum(d.keys));
    set('statClicks', liveFormatNum(d.clicks));
    set('statModules', liveFormatNum(d.modulesRun));
    set('statMessages', liveFormatNum(d.messagesCount));
    set('statHooks', liveFormatNum(d.hookLogsCount));
    set('statOthers', liveFormatNum(d.othersCount));
    set('statOnline', liveFormatNum(d.onlineCount));
    set('statHooked', d.hooked);
    const timeEl = panel.querySelector('#statsUpdateTime');
    if (timeEl && Date.now() - lastRefreshAt > 500) {
      timeEl.textContent = 'updated ' + liveFormatRelative(Date.now());
      lastRefreshAt = Date.now();
    }
  }
  const unsubs = [];
  if (window.Live) {
    ['stats','chat','hookPanel','onlineUsers','userList','warnings'].forEach(t => {
      const off = Live.on(t, refresh);
      if (typeof off === 'function') unsubs.push(off);
    });
  }
  const tickInterval = setInterval(refresh, 500);
  const observer = new MutationObserver(() => {
    if (!document.body.contains(panel)) { clearInterval(tickInterval); unsubs.forEach(u => u()); observer.disconnect(); }
  });
  observer.observe(document.body, { childList: true });
}
window.openStats = openStats;