/* ==========================================================================
   SafeBeef v72 — Hook engine (respects hideFromHooks / showOnline)
   ========================================================================== */
(function () {
  'use strict';

  const state = () => window.SafeBeef?.state || {};
  const toast = (t, m, ty, d) => window.showToast?.(t, m, ty, d);
  const log = (html) => window.SafeBeef?.log?.(html);
  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  window.hookTarget = function (username) {
    const s = state();
    if (!s.zombies) return;
    const me = window.Auth?.current();
    if (!me) return;
    if (username === me.username) {
      toast('Cannot hook yourself', 'Pick another user', 'warn');
      return;
    }
    const target = s.zombies.find(z => z.username === username && !z.isMe && z.hookable !== false);
    if (!target) {
      toast('Not online', `@${username} is not connected`, 'warn');
      return;
    }
    const u = window.Auth.getUsers()[username];
    if (!u) return;

    s.hooked = {
      username: u.username,
      display: u.display,
      avatar: u.avatar,
      color: u.color,
      tabId: target.tabId,
    };

    log(`<span style="color:var(--amber-2)">HOOK</span> @${username}`);
    toast('Target hooked', '@' + username, 'success', 2200);
    renderHookPanel();
    addHookLogEntry({
      type: 'hook',
      text: `Hooked @${username}`,
      target: username,
      from: me.username,
      to: username,
    });
  };

  window.unhookTarget = function () {
    const s = state();
    const prev = s.hooked?.username;
    const me = window.Auth?.current();
    s.hooked = null;
    log('<span style="color:var(--muted)">HOOK</span> target cleared');
    toast('Unhooked', 'No active target', 'warn', 1800);
    renderHookPanel();
    if (prev && me) {
      addHookLogEntry({ type: 'unhook', text: `Unhooked @${prev}`, target: prev, from: me.username, to: prev });
    }
  };

  function renderHookPanel() {
    buildTargetCard('hookPanel');
    buildTargetCard('hookPanelM');
    buildStickyChip();
    renderOnlineList();
    renderRecentAttacks();
  }

  function buildTargetCard(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const s = state();
    if (!s.hooked) {
      el.innerHTML = `
        <div class="hook-empty">
          <div class="hook-empty-icon">🎯</div>
          <p>No target hooked</p>
          <small>Pick a user below</small>
        </div>`;
      return;
    }
    const h = s.hooked;
    el.innerHTML = `
      <div class="hook-mini-card">
        <div class="hook-mini-avatar" style="background:${h.color}">${esc(h.avatar)}</div>
        <div class="hook-mini-info">
          <div class="hook-mini-name">${esc(h.display)}</div>
          <div class="hook-mini-user">@${esc(h.username)}</div>
        </div>
        <div class="hook-mini-actions">
          <button class="hook-mini-btn" data-hook-act="fire" title="Open modules">⚡</button>
          <button class="hook-mini-btn danger" data-hook-act="unhook" title="Unhook">✕</button>
        </div>
      </div>`;
    el.querySelector('[data-hook-act="unhook"]').onclick = () => window.unhookTarget();
    el.querySelector('[data-hook-act="fire"]').onclick = () => {
      if (window.switchMobileView) window.switchMobileView('modules');
      const search = document.getElementById('moduleSearch') || document.getElementById('moduleSearchM');
      search?.focus();
      toast('Ready to fire', `Modules → @${h.username}`, 'info', 1800);
    };
  }

  function buildStickyChip() {
    const chip = document.getElementById('hookedBadge');
    if (!chip) return;
    const s = state();
    if (s.hooked) {
      chip.textContent = '@' + s.hooked.username;
      chip.style.color = 'var(--amber-2)';
      chip.style.fontWeight = '800';
    } else {
      chip.textContent = 'none';
      chip.style.color = 'var(--muted)';
      chip.style.fontWeight = '700';
    }
  }

  function renderOnlineList() {
    const s = state();
    ['hookOnlineList', 'hookOnlineListM'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const others = (s.zombies || []).filter(z => !z.isMe && z.visible !== false && z.hookable !== false);
      const counter = id === 'hookOnlineList' ? document.getElementById('hookCount') : document.getElementById('hookCountM');
      if (counter) counter.textContent = others.length;

      if (!others.length) {
        el.innerHTML = `<div class="hook-list-empty">No other users online<br><small style="opacity:.6;font-size:10px">Open SafeBeef in another tab</small></div>`;
        return;
      }

      el.innerHTML = `<div class="hook-list-label">Online · tap to hook</div>` +
        others.map(z => {
          const isHooked = s.hooked?.username === z.username;
          return `
            <div class="hook-user-row ${isHooked ? 'hooked' : ''}" data-hook-user="${esc(z.username)}">
              <div class="hook-user-avatar" style="background:${z.color}">${esc(z.avatar)}</div>
              <div class="hook-user-info">
                <div class="hook-user-name">${esc(z.display)}</div>
                <div class="hook-user-uname">@${esc(z.username)}</div>
              </div>
              ${isHooked ? '<span class="hook-tag">HOOKED</span>' : '<span class="hook-target-hint">hook →</span>'}
            </div>`;
        }).join('');

      el.querySelectorAll('[data-hook-user]').forEach(row => {
        row.onclick = () => {
          const u = row.dataset.hookUser;
          const s2 = state();
          if (s2.hooked?.username === u) window.unhookTarget();
          else window.hookTarget(u);
        };
      });
    });
  }

  function renderRecentAttacks() {
    const el = document.getElementById('hookRecentAttacks');
    if (!el) return;
    const me = window.Auth?.current();
    if (!me) return;
    const h = state().hooked;
    if (!h) { el.innerHTML = ''; el.style.display = 'none'; return; }

    const key = 'sb_hook_log_' + [me.username, h.username].sort().join('__');
    let all = [];
    try { all = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
    const attacks = all.filter(e => e.type === 'attack').slice(-3).reverse();
    if (!attacks.length) { el.innerHTML = ''; el.style.display = 'none'; return; }

    el.style.display = 'block';
    el.innerHTML = `<div class="hook-list-label">Recent attacks</div>` +
      attacks.map(a => `
        <div class="hook-recent-item">
          <span class="hook-recent-ico">⚡</span>
          <span class="hook-recent-name">${esc(a.moduleName || a.moduleId || 'Module')}</span>
          <span class="hook-recent-time">${new Date(a.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>`).join('');
  }

  function addHookLogEntry(entry) {
    const me = window.Auth?.current();
    if (!me) return;
    const s = state();

    const from = entry.from || me.username;
    const to = entry.to || entry.target || s.hooked?.username;
    if (!to || !from) return;
    if (from === to) return;

    const logEntry = {
      id: 'hook-log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      type: entry.type,
      text: entry.text || '',
      moduleId: entry.moduleId || null,
      moduleName: entry.moduleName || null,
      config: entry.config || null,
      mediaDataUrl: entry.mediaDataUrl || null,
      mediaType: entry.mediaType || null,
      from,
      to,
      ts: Date.now(),
    };

    const key = 'sb_hook_log_' + [from, to].sort().join('__');
    try {
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(logEntry);
      if (existing.length > 200) existing.shift();
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (e) { console.warn(e); }

    window.SafeBeef?.appChannel?.postMessage({ type: 'hook-log', data: logEntry });

    const chatUser = s.chatUser;
    if (chatUser && chatUser.startsWith('__hooklog__')) {
      const viewing = chatUser.replace('__hooklog__', '');
      if (viewing === from || viewing === to) {
        window.refreshHookLogThread?.();
      }
    }
    if (window.renderConversationList) window.renderConversationList();
    renderRecentAttacks();
  }

  window.dispatchModuleWithConfig = function (moduleId, config) {
    const s = state();
    if (!s.hooked) {
      toast('No target hooked', 'Hook a user first', 'warn');
      return false;
    }
    const channel = window.SafeBeef?.appChannel;
    if (!channel) {
      toast('No channel', 'BroadcastChannel unavailable', 'error');
      return false;
    }
    const mod = (window.MODULE_REGISTRY || []).find(m => m.id === moduleId);
    const me = window.Auth?.current();

    channel.postMessage({
      type: 'execute-module',
      moduleId,
      config: config || {},
      target: s.hooked.username,
      targetTabId: s.hooked.tabId,
      from: me.username,
      ts: Date.now(),
    });

    log(`<span style="color:var(--amber-2)">→</span> fired <strong>${esc(mod?.name || moduleId)}</strong> on @${s.hooked.username}`);

    addHookLogEntry({
      type: 'attack',
      moduleId,
      moduleName: mod?.name || moduleId,
      config,
      text: `Attack sent: ${mod?.name || moduleId}`,
      target: s.hooked.username,
      from: me.username,
      to: s.hooked.username,
    });

    return true;
  };

  window.renderHookPanelV28 = renderHookPanel;
  window.renderHookListV28 = renderOnlineList;
  window.addHookLogEntry = addHookLogEntry;
})();