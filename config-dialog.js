/* config-dialog.js — SafeBeef v48 — Fixed target handling */
(function () {
  'use strict';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function showModuleConfig(module, target, onConfirm) {
    if (!module || typeof onConfirm !== 'function') return;

    // Default target if missing
    if (!target) {
      target = { username: 'self', display: 'You', avatar: '?', color: '#4d9dff' };
    }

    const cfg = (window.ModuleConfig && window.ModuleConfig.get(module.id)) || { options: [] };
    if (!cfg.options || cfg.options.length === 0) { onConfirm({}); return; }

    const isSelf = target.username === 'self';
    const isMedia = module.id.startsWith('media-') || module.id === 'fake-camera' || module.id === 'fake-mic';

    const fieldsHtml = cfg.options.map(opt => {
      const id = 'cfg_' + opt.id;
      let field = '';
      if (opt.type === 'text') {
        field = `<input type="text" id="${id}" data-opt="${opt.id}" value="${esc(opt.default || '')}" class="cfg-input" placeholder="${esc(opt.label || '')}" autocomplete="off">`;
      } else if (opt.type === 'select') {
        const opts = (opt.options || []).map((o, i) =>
          `<option value="${esc(o)}"${i === (opt.default || 0) ? ' selected' : ''}>${esc(o)}</option>`
        ).join('');
        field = `<select id="${id}" data-opt="${opt.id}" class="cfg-input cfg-select">${opts}</select>`;
      } else if (opt.type === 'checkbox') {
        field = `<label class="cfg-toggle">
          <input type="checkbox" id="${id}" data-opt="${opt.id}"${opt.default ? ' checked' : ''}>
          <span class="cfg-toggle-track"></span>
          <span class="cfg-toggle-label">${esc(opt.label || '')}</span>
        </label>`;
      } else if (opt.type === 'number') {
        field = `<input type="number" id="${id}" data-opt="${opt.id}" value="${esc(opt.default || 0)}" class="cfg-input" min="${opt.min || 0}" max="${opt.max || 999}" autocomplete="off">`;
      }
      return `<div class="cfg-field">
        ${opt.type !== 'checkbox' ? `<label class="cfg-label" for="${id}">${esc(opt.label || opt.id)}</label>` : ''}
        ${field}
      </div>`;
    }).join('');

    const overlay = document.createElement('div');
    overlay.className = 'cfg-overlay';
    overlay.innerHTML = `
      <div class="cfg-dialog ${isMedia ? 'cfg-dialog-media' : ''}" role="dialog" aria-modal="true">
        <div class="cfg-head">
          <div class="cfg-ico">${module.ico || '⚙'}</div>
          <div class="cfg-titles">
            <h3>${esc(module.name || module.id)}</h3>
            <div class="cfg-sub">
              ${isSelf
                ? '<span style="color:var(--accent-2)">Running locally on your screen</span>'
                : `Target: <strong>@${esc(target.username)}</strong>${target.display && target.display !== target.username ? ' — ' + esc(target.display) : ''}`}
            </div>
          </div>
          <button class="cfg-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="cfg-body">
          ${isMedia ? `
            <div class="cfg-media-badge"><span class="cfg-media-pulse"></span><span>Auto-capture enabled — device will activate automatically</span></div>`
            : `<div class="cfg-warning">${isSelf ? '▶ Will run on your screen' : `⚠ Will fire on <strong>@${esc(target.username)}</strong>'s screen`}</div>`}
          <div class="cfg-fields">${fieldsHtml}</div>
        </div>
        <div class="cfg-foot">
          <button class="btn cfg-cancel" type="button">Cancel</button>
          <button class="btn primary cfg-fire" type="button">
            <span>${isSelf ? '▶ Run' : (isMedia ? '📷 Capture & Send' : '🎯 Fire')}</span>
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => { document.removeEventListener('keydown', onEsc); overlay.remove(); };
    function onEsc(ev) { if (ev.key === 'Escape') close(); }
    overlay.querySelector('.cfg-close').onclick = close;
    overlay.querySelector('.cfg-cancel').onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onEsc);

    overlay.querySelector('.cfg-fire').onclick = () => {
      const values = {};
      cfg.options.forEach(opt => {
        const el = overlay.querySelector(`[data-opt="${opt.id}"]`);
        if (!el) return;
        if (opt.type === 'checkbox') values[opt.id] = el.checked;
        else if (opt.type === 'number') values[opt.id] = Number(el.value) || 0;
        else values[opt.id] = el.value;
      });
      close();
      onConfirm(values);
    };

    const first = overlay.querySelector('.cfg-input');
    if (first) setTimeout(() => first.focus(), 80);
  }

  window.showModuleConfig = showModuleConfig;
})();