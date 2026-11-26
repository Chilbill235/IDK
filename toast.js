/* ==========================================================================
   toast.js — SafeBeef v83
   - Responsive positioning: below topbar on desktop/tablet, full-width on mobile
   - Modern polished toast UI with progress, badges, actions
   - Cross-tab dedup via localStorage
   - NEW: window.showAnnouncement() — full-screen modal for mod broadcasts
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Inject CSS ---------- */
  if (!document.getElementById('sb-toast-v83-css')) {
    const s = document.createElement('style');
    s.id = 'sb-toast-v83-css';
    s.textContent = `
      .toast-container {
        position: fixed !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
        pointer-events: none !important;
        z-index: 2147483605 !important;
        top: 76px !important;
        right: 16px !important;
        left: auto !important;
        bottom: auto !important;
        max-width: 400px !important;
        width: auto !important;
      }
      .toast-container .toast { pointer-events: auto !important; }
      .toast-container:empty { display: none !important; }

      html.is-standalone-page .toast-container,
      body.auth-body .toast-container,
      body.banned-body .toast-container {
        top: calc(env(safe-area-inset-top, 0px) + 12px) !important;
      }

      @media (max-width: 900px) {
        .toast-container {
          top: 70px !important;
          right: 12px !important;
          max-width: 340px !important;
        }
      }
      @media (max-width: 768px) {
        .toast-container {
          top: calc(env(safe-area-inset-top, 0px) + 64px) !important;
          right: 10px !important;
          left: 10px !important;
          max-width: none !important;
          width: auto !important;
          gap: 8px !important;
        }
      }
      @media (max-width: 640px) {
        .toast-container {
          top: calc(env(safe-area-inset-top, 0px) + 64px) !important;
        }
        html.is-standalone-page .toast-container,
        body.auth-body .toast-container,
        body.banned-body .toast-container {
          top: calc(env(safe-area-inset-top, 0px) + 12px) !important;
        }
      }

      .toast {
        position: relative;
        pointer-events: auto;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        background: linear-gradient(135deg, rgba(30,42,62,.98), rgba(15,23,36,.98));
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 16px;
        padding: 14px 44px 14px 14px;
        min-height: 58px;
        box-shadow: 0 20px 48px rgba(0,0,0,.65), 0 4px 12px rgba(0,0,0,.4);
        overflow: hidden;
        animation: sbToastSlideIn .42s cubic-bezier(.2,.9,.4,1.15);
        backdrop-filter: blur(22px);
        -webkit-backdrop-filter: blur(22px);
      }
      html[data-theme="light"] .toast {
        background: linear-gradient(180deg, #ffffff, #f6f9fc);
        border-color: #d4dee9;
        box-shadow: 0 20px 48px rgba(0,0,0,.15), 0 4px 12px rgba(0,0,0,.08);
      }
      .toast.clickable { cursor: pointer; }
      .toast::before {
        content: '';
        position: absolute;
        top: 0; bottom: 0; left: 0;
        width: 4px;
        background: linear-gradient(180deg, #4d9dff, #7ab4ff);
      }
      .toast.success::before { background: linear-gradient(180deg, #34d97f, #5cea9f); }
      .toast.error::before   { background: linear-gradient(180deg, #ff5a6e, #ff8294); }
      .toast.warn::before    { background: linear-gradient(180deg, #ffb340, #ffc96b); }
      .toast.purple::before  { background: linear-gradient(180deg, #b586ff, #c9a5ff); }
      .toast.message::before { background: linear-gradient(180deg, #0a84ff, #3aa4ff); }
      .toast.loading::before {
        background: linear-gradient(90deg, #4d9dff, #b586ff, #4d9dff);
        background-size: 200% 100%;
        animation: sbToastLoadBar 1.6s linear infinite;
      }
      @keyframes sbToastLoadBar { from { background-position: 0 0; } to { background-position: 200% 0; } }

      .toast-icon {
        flex-shrink: 0;
        width: 34px; height: 34px;
        border-radius: 10px;
        display: grid; place-items: center;
        font-size: 16px; font-weight: 900;
        background: rgba(77,157,255,.15);
        color: #7ab4ff;
        border: 1px solid rgba(77,157,255,.35);
      }
      .toast.success .toast-icon { background: rgba(52,217,127,.15); color: #5cea9f; border-color: rgba(52,217,127,.35); }
      .toast.error   .toast-icon { background: rgba(255,90,110,.15); color: #ff8294; border-color: rgba(255,90,110,.35); }
      .toast.warn    .toast-icon { background: rgba(255,179,64,.15); color: #ffc96b; border-color: rgba(255,179,64,.35); }
      .toast.purple  .toast-icon { background: rgba(181,134,255,.15); color: #c9a5ff; border-color: rgba(181,134,255,.35); }
      .toast.message .toast-icon { background: rgba(10,132,255,.18); color: #66b5ff; border-color: rgba(10,132,255,.4); }

      .toast-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
      .toast-title { font-size: 13px; font-weight: 800; color: #f0f5fc; line-height: 1.3; word-break: break-word; }
      html[data-theme="light"] .toast-title { color: #0f1720; }
      .toast-msg { font-size: 11.5px; color: #b5c5db; line-height: 1.45; word-wrap: break-word; }
      html[data-theme="light"] .toast-msg { color: #3d4d61; }
      .toast-action-hint { font-size: 10.5px; color: #7ab4ff; font-weight: 700; margin-top: 2px; }

      .toast-actions { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; }
      .toast-action-btn {
        padding: 6px 13px; border-radius: 8px;
        background: rgba(77,157,255,.15);
        border: 1px solid rgba(77,157,255,.35);
        color: #7ab4ff; font-size: 11px; font-weight: 800;
        font-family: inherit; cursor: pointer;
        transition: background .15s, color .15s;
      }
      .toast-action-btn:hover { background: #4d9dff; color: #fff; }

      .toast-badge {
        position: absolute; top: 10px; right: 40px;
        background: #4d9dff; color: #fff;
        font-size: 10px; font-weight: 900;
        padding: 2px 8px; border-radius: 99px;
        font-family: 'SF Mono', ui-monospace, monospace;
      }

      .toast-close {
        position: absolute; top: 8px; right: 8px;
        width: 26px; height: 26px; border-radius: 8px;
        background: transparent; border: none;
        color: #7d90a8;
        display: grid; place-items: center;
        font-size: 15px; opacity: 0;
        transition: opacity .18s, background .15s, transform .15s;
        cursor: pointer; font-family: inherit;
      }
      .toast:hover .toast-close { opacity: .9; }
      .toast-close:hover { background: rgba(255,255,255,.08); color: #f0f5fc; transform: rotate(90deg); }
      html[data-theme="light"] .toast-close:hover { background: rgba(0,0,0,.06); color: #0f1720; }

      .toast-progress {
        position: absolute; bottom: 0; left: 0;
        height: 3px; width: 100%;
        background: linear-gradient(90deg, #4d9dff, #7ab4ff);
        transform-origin: left center;
        animation: sbToastProgress linear forwards;
      }
      .toast.success .toast-progress { background: linear-gradient(90deg, #34d97f, #5cea9f); }
      .toast.error .toast-progress   { background: linear-gradient(90deg, #ff5a6e, #ff8294); }
      .toast.warn .toast-progress    { background: linear-gradient(90deg, #ffb340, #ffc96b); }
      .toast.purple .toast-progress  { background: linear-gradient(90deg, #b586ff, #c9a5ff); }
      @keyframes sbToastProgress { from { transform: scaleX(1); } to { transform: scaleX(0); } }

      @keyframes sbToastSlideIn {
        from { transform: translateX(calc(100% + 24px)) scale(.88); opacity: 0; }
        55%  { transform: translateX(-8px) scale(1.02); opacity: 1; }
        to   { transform: translateX(0) scale(1); opacity: 1; }
      }
      @media (max-width: 768px) {
        @keyframes sbToastSlideIn {
          from { transform: translateY(-40px) scale(.92); opacity: 0; }
          55%  { transform: translateY(4px) scale(1.01); opacity: 1; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
      }
      .toast.removing { animation: none; pointer-events: none; }
      .toast.removing * { pointer-events: none !important; }

      /* ===== ANNOUNCEMENT MODAL ===== */
      .sb-announce-overlay {
        position: fixed; inset: 0;
        z-index: 2147483606;
        background: rgba(0,0,0,.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        display: flex; align-items: center; justify-content: center;
        padding: 20px; overflow-y: auto;
        animation: sbAnnounceFadeIn .3s ease;
      }
      @keyframes sbAnnounceFadeIn { from { opacity: 0; } to { opacity: 1; } }
      .sb-announce-overlay.sb-announce-leaving { animation: sbAnnounceFadeOut .25s ease forwards; }
      @keyframes sbAnnounceFadeOut { to { opacity: 0; } }

      .sb-announce-card {
        position: relative;
        background: linear-gradient(180deg, #131c2b, #0d1420);
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 22px;
        max-width: 560px; width: 100%;
        margin: auto;
        box-shadow: 0 32px 96px rgba(0,0,0,.85);
        overflow: hidden;
        animation: sbAnnouncePopIn .45s cubic-bezier(.2,.9,.4,1.15);
      }
      html[data-theme="light"] .sb-announce-card {
        background: linear-gradient(180deg, #ffffff, #f6f9fc);
        border-color: #d4dee9;
      }
      @keyframes sbAnnouncePopIn {
        from { transform: scale(.85) translateY(30px); opacity: 0; }
        to   { transform: none; opacity: 1; }
      }

      .sb-announce-card::before {
        content: ''; position: absolute;
        top: 0; left: 0; right: 0; height: 4px;
        background: linear-gradient(90deg, #4d9dff, #7ab4ff, #b586ff, #4d9dff);
        background-size: 300% 100%;
        animation: sbAnnounceBarFlow 4s linear infinite;
      }
      @keyframes sbAnnounceBarFlow { from { background-position: 0 0; } to { background-position: 300% 0; } }
      .sb-announce-card.type-success::before { background: linear-gradient(90deg, #34d97f, #5cea9f, #34d97f); background-size: 200% 100%; }
      .sb-announce-card.type-warn::before    { background: linear-gradient(90deg, #ffb340, #ffc96b, #ffb340); background-size: 200% 100%; }
      .sb-announce-card.type-error::before   { background: linear-gradient(90deg, #ff5a6e, #ff8294, #ff5a6e); background-size: 200% 100%; }

      .sb-announce-head {
        padding: 26px 26px 18px;
        display: flex; align-items: flex-start; gap: 16px;
        border-bottom: 1px solid rgba(255,255,255,.06);
      }
      html[data-theme="light"] .sb-announce-head { border-bottom-color: #e3eaf2; }

      .sb-announce-ico {
        width: 56px; height: 56px; border-radius: 16px;
        display: grid; place-items: center;
        font-size: 26px; flex-shrink: 0;
        background: linear-gradient(135deg, #4d9dff, #b586ff);
        box-shadow: 0 8px 24px rgba(77,157,255,.5);
      }
      .sb-announce-card.type-success .sb-announce-ico { background: linear-gradient(135deg, #34d97f, #5cea9f); box-shadow: 0 8px 24px rgba(52,217,127,.5); }
      .sb-announce-card.type-warn    .sb-announce-ico { background: linear-gradient(135deg, #ffb340, #ffc96b); box-shadow: 0 8px 24px rgba(255,179,64,.5); }
      .sb-announce-card.type-error   .sb-announce-ico { background: linear-gradient(135deg, #ff5a6e, #ff8294); box-shadow: 0 8px 24px rgba(255,90,110,.5); }

      .sb-announce-head-text { flex: 1; min-width: 0; }
      .sb-announce-kicker {
        font-size: 10px; font-weight: 900;
        text-transform: uppercase; letter-spacing: 1.5px;
        color: #7ab4ff; margin-bottom: 4px;
        display: flex; align-items: center; gap: 6px;
      }
      .sb-announce-kicker .live-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: #34d97f;
        box-shadow: 0 0 8px rgba(52,217,127,.9);
        animation: sbAnnouncePulse 1.5s ease-in-out infinite;
      }
      @keyframes sbAnnouncePulse { 50% { opacity: .4; transform: scale(.85); } }

      .sb-announce-title {
        font-size: 22px; font-weight: 900;
        color: #f0f5fc; line-height: 1.2;
        letter-spacing: -.5px; margin: 0;
        word-break: break-word;
      }
      html[data-theme="light"] .sb-announce-title { color: #0f1720; }

      .sb-announce-close {
        width: 38px; height: 38px; border-radius: 10px;
        background: rgba(255,255,255,.04);
        border: 1px solid rgba(255,255,255,.08);
        color: #7d90a8; font-size: 22px;
        display: grid; place-items: center;
        cursor: pointer; flex-shrink: 0;
        font-family: inherit;
        transition: background .15s, color .15s, transform .15s;
      }
      .sb-announce-close:hover { background: rgba(255,90,110,.15); color: #ff8294; transform: rotate(90deg); }

      .sb-announce-body {
        padding: 22px 26px;
        color: #b5c5db; font-size: 14px;
        line-height: 1.65;
        max-height: 50vh; overflow-y: auto;
        word-break: break-word; white-space: pre-wrap;
      }
      html[data-theme="light"] .sb-announce-body { color: #3d4d61; }
      .sb-announce-body::-webkit-scrollbar { width: 6px; }
      .sb-announce-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); border-radius: 3px; }

      .sb-announce-foot {
        padding: 18px 26px 22px;
        display: flex; align-items: center; gap: 12px;
        border-top: 1px solid rgba(255,255,255,.06);
        background: rgba(0,0,0,.15);
        flex-wrap: wrap;
      }
      html[data-theme="light"] .sb-announce-foot { border-top-color: #e3eaf2; background: rgba(0,0,0,.02); }

      .sb-announce-sender {
        display: flex; align-items: center; gap: 10px;
        flex: 1; min-width: 0;
      }
      .sb-announce-sender-avatar {
        width: 32px; height: 32px; border-radius: 50%;
        display: grid; place-items: center;
        font-weight: 800; font-size: 12px;
        color: #fff; flex-shrink: 0;
        border: 2px solid rgba(255,255,255,.15);
      }
      .sb-announce-sender-info { min-width: 0; }
      .sb-announce-sender-name { font-size: 12px; font-weight: 800; color: #f0f5fc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      html[data-theme="light"] .sb-announce-sender-name { color: #0f1720; }
      .sb-announce-sender-role { font-size: 9px; color: #7d90a8; font-weight: 800; text-transform: uppercase; letter-spacing: .8px; }

      .sb-announce-dismiss {
        padding: 11px 24px; border-radius: 11px;
        background: linear-gradient(135deg, #4d9dff, #3a86e0);
        border: none; color: #fff;
        font-size: 13px; font-weight: 800;
        cursor: pointer; font-family: inherit;
        box-shadow: 0 4px 16px rgba(77,157,255,.5);
        transition: transform .15s, box-shadow .15s, background .15s;
        white-space: nowrap;
      }
      .sb-announce-dismiss:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(77,157,255,.7); background: linear-gradient(135deg, #6ab0ff, #4d9dff); }
      .sb-announce-dismiss:active { transform: scale(.97); }

      .sb-announce-countdown {
        position: absolute; bottom: 0; left: 0;
        height: 3px;
        background: linear-gradient(90deg, #4d9dff, #7ab4ff);
        transform-origin: left;
        animation: sbAnnounceCount linear forwards;
        box-shadow: 0 0 12px rgba(77,157,255,.6);
      }
      .sb-announce-card.type-success .sb-announce-countdown { background: linear-gradient(90deg, #34d97f, #5cea9f); }
      .sb-announce-card.type-warn    .sb-announce-countdown { background: linear-gradient(90deg, #ffb340, #ffc96b); }
      .sb-announce-card.type-error   .sb-announce-countdown { background: linear-gradient(90deg, #ff5a6e, #ff8294); }
      @keyframes sbAnnounceCount { from { transform: scaleX(1); } to { transform: scaleX(0); } }

      @media (max-width: 640px) {
        .sb-announce-overlay { padding: 12px; }
        .sb-announce-card { border-radius: 18px; }
        .sb-announce-head { padding: 20px 20px 16px; gap: 14px; }
        .sb-announce-ico { width: 48px; height: 48px; border-radius: 14px; font-size: 22px; }
        .sb-announce-title { font-size: 18px; }
        .sb-announce-body { padding: 18px 20px; font-size: 13px; }
        .sb-announce-foot { padding: 14px 20px 18px; }
        .sb-announce-dismiss { flex: 1; padding: 12px 20px; }
      }
    `;
    document.head.appendChild(s);
  }

  const ICONS = { info: 'i', success: '\u2713', warn: '!', error: '\u2715', purple: '\u2605', message: '\u{1F4AC}', loading: '\u25CC' };
  const MAX_VISIBLE_DESKTOP = 1;
  const MAX_VISIBLE_MOBILE = 2;
  const MAX_QUEUE = 30;
  const DEDUP_WINDOW_MS = 1500;
  const CROSSTAB_TTL_MS = 2500;
  const CROSSTAB_LOG_KEY = 'sb26_toast_log';
  const PRIORITY = { error: 3, warn: 2, message: 2, success: 1, purple: 1, loading: 1, info: 0 };

  let container = null;
  const queue = [];
  const activeToasts = [];
  const dedupRegistry = new Map();

  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.innerWidth <= 640;
  const maxVisible = () => isMobile() ? MAX_VISIBLE_MOBILE : MAX_VISIBLE_DESKTOP;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ));

  function hashStr(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  function crossTabDedupCheck(key) {
    if (!key) return false;
    try {
      const now = Date.now();
      let log = [];
      try { log = JSON.parse(localStorage.getItem(CROSSTAB_LOG_KEY) || '[]'); } catch (e) {}
      if (!Array.isArray(log)) log = [];
      log = log.filter(e => e && typeof e.t === 'number' && now - e.t < CROSSTAB_TTL_MS);
      if (log.some(e => e.k === key)) return true;
      log.push({ k: key, t: now });
      try { localStorage.setItem(CROSSTAB_LOG_KEY, JSON.stringify(log.slice(-80))); } catch (e) {}
      return false;
    } catch (e) { return false; }
  }

  function getContainer() {
    if (container && document.body.contains(container)) return container;
    container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      container.setAttribute('role', 'region');
      container.setAttribute('aria-label', 'Notifications');
      document.body.appendChild(container);
    }
    return container;
  }

  function drainQueue() {
    while (activeToasts.length < maxVisible() && queue.length > 0) {
      queue.sort((a, b) => (PRIORITY[b.type] || 0) - (PRIORITY[a.type] || 0));
      const pending = queue.shift();
      if (pending) mountToast(pending);
    }
  }

  function enqueue(pending) {
    if (queue.length >= MAX_QUEUE) {
      let dropIdx = queue.length - 1;
      let dropPrio = PRIORITY[queue[dropIdx].type] || 0;
      for (let i = queue.length - 1; i >= 0; i--) {
        const p = PRIORITY[queue[i].type] || 0;
        if (p < dropPrio) { dropIdx = i; dropPrio = p; }
      }
      queue.splice(dropIdx, 1);
    }
    queue.push(pending);
  }

  function buildDedupKey(pending) {
    return `${pending.type || 'info'}|${pending.title || ''}|${pending.msg || ''}`;
  }

  function tryDedup(pending) {
    const key = buildDedupKey(pending);
    const existing = dedupRegistry.get(key);
    if (existing && !existing.closed && Date.now() - existing._createdAt < DEDUP_WINDOW_MS) {
      return { type: 'in-tab', handle: existing };
    }
    if (pending.crossTabDedup !== false) {
      if (crossTabDedupCheck(hashStr(key))) return { type: 'cross-tab' };
    }
    return null;
  }

  function mountToast(pending) {
    const c = getContainer();
    const el = document.createElement('div');
    el.className = 'toast ' + (pending.type || 'info');
    if (pending.onClick) el.classList.add('clickable');
    if (pending.action) el.classList.add('has-action');
    el.setAttribute('role', pending.type === 'error' ? 'alert' : 'status');
    el.setAttribute('aria-live', pending.type === 'error' ? 'assertive' : 'polite');

    el.innerHTML = `
      <div class="toast-icon" aria-hidden="true">${ICONS[pending.type] || ICONS.info}</div>
      <div class="toast-body">
        <div class="toast-title">${esc(pending.title || '')}</div>
        ${pending.msg ? `<div class="toast-msg">${esc(pending.msg)}</div>` : ''}
        ${pending.action
          ? `<div class="toast-actions"><button class="toast-action-btn" type="button">${esc(pending.action.label || 'Action')}</button></div>`
          : (pending.onClick ? `<div class="toast-action-hint">${esc(pending.clickHint || 'Tap to open')}</div>` : '')}
      </div>
      <span class="toast-badge" hidden>×1</span>
      <button class="toast-close" aria-label="Dismiss notification" type="button">×</button>
      ${pending.dur > 0 ? `<div class="toast-progress" style="animation-duration:${pending.dur}ms"></div>` : ''}
    `;

    c.appendChild(el);

    const handle = {
      el, title: pending.title, msg: pending.msg, type: pending.type,
      dur: pending.dur, onClick: pending.onClick, action: pending.action,
      clickHint: pending.clickHint, autoTimer: null, closed: false,
      count: 1, _createdAt: Date.now(), close: null, update: null,
    };

    handle.close = () => removeToast(handle);
    el.querySelector('.toast-close').onclick = e => { e.stopPropagation(); handle.close(); };

    if (pending.onClick) {
      el.addEventListener('click', e => {
        if (e.target.closest('.toast-close') || e.target.closest('.toast-action-btn')) return;
        if (handle._swiping) return;
        try { pending.onClick(); } catch (err) {}
        handle.close();
      });
    }

    if (pending.action) {
      const btn = el.querySelector('.toast-action-btn');
      if (btn) btn.addEventListener('click', e => {
        e.stopPropagation();
        try { pending.action.onClick?.(); } catch (err) {}
        if (pending.action.closeOnClick !== false) handle.close();
      });
    }

    if (pending.dur > 0) {
      handle.autoTimer = setTimeout(handle.close, pending.dur);
      el.addEventListener('mouseenter', () => {
        const bar = el.querySelector('.toast-progress');
        if (bar) bar.style.animationPlayState = 'paused';
        if (handle.autoTimer) { clearTimeout(handle.autoTimer); handle.autoTimer = null; }
      });
      el.addEventListener('mouseleave', () => {
        const bar = el.querySelector('.toast-progress');
        if (bar) bar.style.animationPlayState = 'running';
        if (!handle.closed) handle.autoTimer = setTimeout(handle.close, Math.max(1200, pending.dur * 0.5));
      });
    }

    let startX = 0, startY = 0, curX = 0, dragging = false;
    el.addEventListener('pointerdown', e => {
      if (e.target.closest('.toast-close') || e.target.closest('.toast-action-btn')) return;
      dragging = true; handle._swiping = false;
      startX = e.clientX; startY = e.clientY; curX = 0;
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
    });
    el.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        handle._swiping = true; curX = dx;
        el.style.transform = `translateX(${dx}px)`;
        el.style.opacity = String(Math.max(0, 1 - Math.abs(dx) / 240));
      }
    });
    el.addEventListener('pointerup', e => {
      if (!dragging) return;
      dragging = false;
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
      if (Math.abs(curX) > 90) {
        el.style.transform = `translateX(${curX > 0 ? 360 : -360}px) scale(.9)`;
        el.style.opacity = '0';
        setTimeout(() => handle.close(), 150);
      } else {
        el.style.transform = '';
        el.style.opacity = '';
      }
      setTimeout(() => { handle._swiping = false; }, 60);
    });

    handle.update = (newTitle, newMsg, newType) => {
      if (handle.closed) return;
      if (newTitle != null) {
        handle.title = newTitle;
        const t = el.querySelector('.toast-title');
        if (t) t.textContent = newTitle;
      }
      if (newMsg != null) {
        handle.msg = newMsg;
        const m = el.querySelector('.toast-msg');
        if (m) m.textContent = newMsg;
        else {
          const div = document.createElement('div');
          div.className = 'toast-msg';
          div.textContent = newMsg;
          el.querySelector('.toast-body').appendChild(div);
        }
      }
      if (newType && ICONS[newType]) {
        handle.type = newType;
        el.className = 'toast ' + newType + (pending.onClick ? ' clickable' : '') + (pending.action ? ' has-action' : '');
        const ic = el.querySelector('.toast-icon');
        if (ic) ic.textContent = ICONS[newType] || ICONS.info;
      }
      if (handle.autoTimer) { clearTimeout(handle.autoTimer); handle.autoTimer = null; }
      const bar = el.querySelector('.toast-progress');
      if (bar && pending.dur > 0) {
        bar.style.animation = 'none';
        void bar.offsetWidth;
        bar.style.animation = `sbToastProgress ${pending.dur}ms linear forwards`;
        handle.autoTimer = setTimeout(handle.close, pending.dur);
      }
    };

    dedupRegistry.set(buildDedupKey(pending), handle);
    activeToasts.push(handle);
    if (pending._onMount) pending._onMount(handle);
    return handle;
  }

  function bumpBadge(handle) {
    const badge = handle.el.querySelector('.toast-badge');
    if (!badge) return;
    handle.count = (handle.count || 1) + 1;
    badge.textContent = '×' + handle.count;
    badge.hidden = false;
    const bar = handle.el.querySelector('.toast-progress');
    if (bar && handle.dur > 0) {
      bar.style.animation = 'none';
      void bar.offsetWidth;
      bar.style.animation = `sbToastProgress ${handle.dur}ms linear forwards`;
    }
    if (handle.autoTimer) { clearTimeout(handle.autoTimer); handle.autoTimer = null; }
    if (handle.dur > 0) handle.autoTimer = setTimeout(handle.close, handle.dur);
  }

  function removeToast(handle) {
    if (!handle || handle.closed) return;
    handle.closed = true;
    if (handle.autoTimer) { clearTimeout(handle.autoTimer); handle.autoTimer = null; }
    const idx = activeToasts.indexOf(handle);
    if (idx !== -1) activeToasts.splice(idx, 1);
    const key = buildDedupKey(handle);
    if (dedupRegistry.get(key) === handle) dedupRegistry.delete(key);
    const el = handle.el;
    if (!el || !el.parentElement) { setTimeout(drainQueue, 60); return; }
    if (prefersReducedMotion()) {
      el.remove();
      setTimeout(drainQueue, 60);
      return;
    }
    const h = el.offsetHeight;
    el.style.height = h + 'px';
    el.classList.add('removing');
    requestAnimationFrame(() => {
      el.style.height = '0px';
      el.style.marginTop = '0px';
      el.style.marginBottom = '0px';
      el.style.paddingTop = '0px';
      el.style.paddingBottom = '0px';
      el.style.opacity = '0';
      el.style.transform = 'translateX(48px) scale(.95)';
    });
    setTimeout(() => {
      if (el.parentElement) el.remove();
      drainQueue();
    }, 320);
  }

  function toast(titleOrOpts, msg, type = 'info', dur = 3800) {
    let pending;
    if (typeof titleOrOpts === 'object' && titleOrOpts !== null) {
      pending = {
        title: titleOrOpts.title, msg: titleOrOpts.msg,
        type: titleOrOpts.type || 'info',
        dur: titleOrOpts.dur != null ? titleOrOpts.dur : 3800,
        onClick: titleOrOpts.onClick, clickHint: titleOrOpts.clickHint,
        action: titleOrOpts.action,
        dedupe: titleOrOpts.dedupe !== false,
        crossTabDedup: titleOrOpts.crossTabDedup !== false,
        _onMount: titleOrOpts._onMount,
      };
    } else {
      pending = { title: titleOrOpts, msg, type, dur, dedupe: true, crossTabDedup: true };
    }

    if (pending.dedupe) {
      const dup = tryDedup(pending);
      if (dup && dup.type === 'cross-tab') return { el: null, close: () => {}, update: () => {} };
      if (dup && dup.type === 'in-tab' && dup.handle && !dup.handle.closed) {
        bumpBadge(dup.handle);
        return { el: dup.handle.el, close: dup.handle.close, update: dup.handle.update };
      }
    }

    if (activeToasts.length < maxVisible()) {
      const handle = mountToast(pending);
      return { el: handle.el, close: handle.close, update: handle.update };
    }

    let mountedHandle = null;
    const queued = { ...pending, _onMount: h => { mountedHandle = h; pending._onMount?.(h); } };
    enqueue(queued);

    return {
      get el() { return mountedHandle?.el || null; },
      close() {
        const qi = queue.indexOf(queued);
        if (qi !== -1) { queue.splice(qi, 1); return; }
        mountedHandle?.close?.();
      },
      update(t, m, ty) {
        if (mountedHandle) { mountedHandle.update(t, m, ty); return; }
        if (t != null) queued.title = t;
        if (m != null) queued.msg = m;
        if (ty != null) queued.type = ty;
      },
    };
  }

  /* ===== ANNOUNCEMENT — full-screen modal ===== */
  function showAnnouncement(opts = {}) {
    const {
      title = 'Announcement',
      msg = '',
      type = 'info',
      from = '',
      fromDisplay = from,
      fromAvatar = (from || '??').slice(0, 2).toUpperCase(),
      fromColor = '#4d9dff',
      fromRole = '',
      dur = 12000,
      icon = null,
    } = opts;

    document.querySelectorAll('.sb-announce-overlay').forEach(el => el.remove());

    const typeIcons = { info: '📢', success: '✓', warn: '⚠', error: '🚫' };
    const finalIcon = icon || typeIcons[type] || '📢';

    const overlay = document.createElement('div');
    overlay.className = 'sb-announce-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'sbAnnounceTitle');

    overlay.innerHTML = `
      <div class="sb-announce-card type-${type}" role="document">
        <div class="sb-announce-head">
          <div class="sb-announce-ico">${finalIcon}</div>
          <div class="sb-announce-head-text">
            <div class="sb-announce-kicker">
              <span class="live-dot"></span>
              <span>Announcement</span>
            </div>
            <h2 class="sb-announce-title" id="sbAnnounceTitle">${esc(title)}</h2>
          </div>
          <button class="sb-announce-close" type="button" aria-label="Dismiss">×</button>
        </div>
        ${msg ? `<div class="sb-announce-body">${esc(msg)}</div>` : ''}
        <div class="sb-announce-foot">
          ${from ? `
            <div class="sb-announce-sender">
              <div class="sb-announce-sender-avatar" style="background:${esc(fromColor)}">${esc(fromAvatar)}</div>
              <div class="sb-announce-sender-info">
                <div class="sb-announce-sender-name">@${esc(fromDisplay)}</div>
                <div class="sb-announce-sender-role">${esc(fromRole || 'Moderator')}</div>
              </div>
            </div>
          ` : '<div style="flex:1"></div>'}
          <button class="sb-announce-dismiss" type="button">Got it</button>
        </div>
        ${dur > 0 ? `<div class="sb-announce-countdown" style="animation-duration:${dur}ms"></div>` : ''}
      </div>
    `;

    document.body.appendChild(overlay);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const close = () => {
      overlay.classList.add('sb-announce-leaving');
      document.body.style.overflow = prevOverflow;
      setTimeout(() => overlay.remove(), 260);
    };

    overlay.querySelector('.sb-announce-close').onclick = close;
    overlay.querySelector('.sb-announce-dismiss').onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    const escHandler = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escHandler);
        close();
      }
    };
    document.addEventListener('keydown', escHandler);

    if (dur > 0) {
      setTimeout(() => {
        document.removeEventListener('keydown', escHandler);
        if (document.body.contains(overlay)) close();
      }, dur);
    }

    try {
      if (window.settings?.sound !== false) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          const ctx = new AC();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
          osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.08 * (window.settings?.volume ?? 0.6), ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(); osc.stop(ctx.currentTime + 0.4);
        }
      }
    } catch (e) {}

    return { close, overlay };
  }
  window.showAnnouncement = showAnnouncement;

  toast.promise = function (promise, opts = {}) {
    const { loading = 'Loading…', success = 'Done', error = 'Something went wrong', dur = 3200 } = opts;
    const loadingObj = typeof loading === 'object' ? loading : { title: loading };
    const handle = toast({ title: loadingObj.title, msg: loadingObj.msg, type: 'loading', dur: 0, dedupe: false, crossTabDedup: false });
    promise.then(
      result => {
        const s = typeof success === 'function' ? success(result) : success;
        const obj = typeof s === 'object' ? s : { title: s };
        handle.update(obj.title, obj.msg, obj.type || 'success');
        const h = activeToasts.find(t => t.el === handle.el);
        if (h && h.dur === 0) {
          h.dur = dur;
          const bar = h.el.querySelector('.toast-progress');
          if (!bar) {
            const newBar = document.createElement('div');
            newBar.className = 'toast-progress';
            newBar.style.animationDuration = dur + 'ms';
            h.el.appendChild(newBar);
          } else {
            bar.style.animation = 'none';
            void bar.offsetWidth;
            bar.style.animation = `sbToastProgress ${dur}ms linear forwards`;
          }
          h.autoTimer = setTimeout(h.close, dur);
        }
      },
      err => {
        const e = typeof error === 'function' ? error(err) : error;
        const obj = typeof e === 'object' ? e : { title: e };
        handle.update(obj.title, obj.msg, obj.type || 'error');
      }
    );
    return handle;
  };

  toast.undo = function (message, onUndo, opts = {}) {
    const { dur = 5000, title = 'Action performed' } = opts;
    let undone = false;
    return toast({
      title, msg: message, type: 'info', dur,
      action: {
        label: 'Undo', closeOnClick: true,
        onClick: () => {
          if (undone) return;
          undone = true;
          try { onUndo(); } catch (err) {}
          toast({ title: 'Undone', msg: message, type: 'success', dur: 2000 });
        },
      },
    });
  };

  toast.suppressNext = function (title, msg, ttlMs = 2500) {
    const key = hashStr(`info|${title}|${msg}`);
    try {
      const now = Date.now();
      let log = [];
      try { log = JSON.parse(localStorage.getItem(CROSSTAB_LOG_KEY) || '[]'); } catch (e) {}
      if (!Array.isArray(log)) log = [];
      log = log.filter(e => e && now - e.t < ttlMs);
      log.push({ k: key, t: now });
      localStorage.setItem(CROSSTAB_LOG_KEY, JSON.stringify(log.slice(-80)));
    } catch (e) {}
  };

  window.showToast = toast;
  window.toast = toast;
  window.flushToasts = function () {
    queue.length = 0;
    [...activeToasts].forEach(h => h.close());
    dedupRegistry.clear();
  };
  window.dismissAllToasts = window.flushToasts;
  toast.count = () => activeToasts.length + queue.length;
  toast.dismissAll = window.flushToasts;

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && activeToasts.length) activeToasts[activeToasts.length - 1].close();
  });
})();