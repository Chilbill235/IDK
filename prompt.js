/* SafeBeef v83 — Custom prompt/confirm/alert modals */
'use strict';
(function () {
  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function mount(opts) {
    return new Promise((resolve) => {
      const ov = document.createElement('div');
      ov.className = 'sb-prompt-overlay';
      ov.innerHTML = `
        <div class="sb-prompt-modal" role="dialog" aria-modal="true">
          <div class="sb-prompt-head">
            <div class="sb-prompt-ico">${opts.icon || '💬'}</div>
            <div class="sb-prompt-titles"><h3>${escapeHtml(opts.title || 'Confirm')}</h3>${opts.subtitle ? `<div class="sb-prompt-sub">${escapeHtml(opts.subtitle)}</div>` : ''}</div>
            <button class="sb-prompt-close" type="button" aria-label="Close">×</button>
          </div>
          <div class="sb-prompt-body">${opts.bodyHtml || ''}</div>
          <div class="sb-prompt-foot">
            ${opts.showCancel !== false ? `<button class="sb-prompt-btn secondary" data-act="cancel" type="button">${escapeHtml(opts.cancelText || 'Cancel')}</button>` : ''}
            <button class="sb-prompt-btn ${opts.confirmClass || 'primary'}" data-act="confirm" type="button">${escapeHtml(opts.confirmText || 'Confirm')}</button>
          </div>
        </div>`;
      document.body.appendChild(ov);
      let closed = false;
      function close(result) {
        if (closed) return; closed = true;
        ov.style.opacity = '0'; ov.style.transition = 'opacity .15s';
        setTimeout(() => { ov.remove(); resolve(result); }, 150);
      }
      ov.querySelector('.sb-prompt-close').onclick = () => close(null);
      ov.querySelector('[data-act="cancel"]')?.addEventListener('click', () => close(null));
      const confirmBtn = ov.querySelector('[data-act="confirm"]');
      confirmBtn.addEventListener('click', async () => {
        try {
          if (typeof opts.onConfirm === 'function') {
            const r = await opts.onConfirm(ov);
            if (r === false) return;
            close(r === true ? true : (r == null ? true : r));
          } else close(true);
        } catch (e) { close(null); }
      });
      ov.addEventListener('click', (e) => { if (e.target === ov) close(null); });
      const escHandler = (e) => { if (e.key === 'Escape') { document.removeEventListener('keydown', escHandler); close(null); } };
      document.addEventListener('keydown', escHandler);
      if (opts.onMount) opts.onMount(ov, close);
      setTimeout(() => {
        const inp = ov.querySelector('#sbPromptInput, .sb-prompt-input:not(textarea)');
        if (inp) { inp.focus(); if (inp.select) inp.select(); }
      }, 80);
    });
  }
  window.sbAlert = function (opts) {
    if (typeof opts === 'string') opts = { title: 'Notice', message: opts };
    return mount({
      icon: opts.icon || 'ℹ️', title: opts.title || 'Notice', subtitle: opts.subtitle,
      bodyHtml: `<div style="font-size:13px;color:var(--text-2);line-height:1.65;white-space:pre-wrap">${escapeHtml(opts.message || '')}</div>`,
      confirmText: opts.confirmText || 'Got it', confirmClass: opts.confirmClass || 'primary', showCancel: false,
    });
  };
  window.sbConfirm = function (opts) {
    if (typeof opts === 'string') opts = { title: 'Confirm', message: opts };
    return mount({
      icon: opts.icon || '❓', title: opts.title || 'Confirm', subtitle: opts.subtitle,
      bodyHtml: `<div style="font-size:13px;color:var(--text-2);line-height:1.65;white-space:pre-wrap">${escapeHtml(opts.message || '')}</div>`,
      confirmText: opts.confirmText || 'Confirm', cancelText: opts.cancelText || 'Cancel', confirmClass: opts.confirmClass || 'danger',
    });
  };
  window.sbPrompt = function (opts) {
    if (typeof opts === 'string') opts = { title: 'Input', label: opts, value: '' };
    const inputId = 'sbPromptInput' + Math.random().toString(36).slice(2, 8);
    return mount({
      icon: opts.icon || '✍️', title: opts.title || 'Input', subtitle: opts.subtitle,
      bodyHtml: `
        <div style="display:flex;flex-direction:column;gap:8px">
          ${opts.label ? `<label class="sb-prompt-label" for="${inputId}">${escapeHtml(opts.label)}</label>` : ''}
          ${opts.multiline
            ? `<textarea id="${inputId}" class="sb-prompt-input sb-prompt-textarea" placeholder="${escapeHtml(opts.placeholder||'')}" rows="${opts.rows||4}">${escapeHtml(opts.value||'')}</textarea>`
            : `<input id="${inputId}" class="sb-prompt-input" type="${escapeHtml(opts.type||'text')}" value="${escapeHtml(opts.value||'')}" placeholder="${escapeHtml(opts.placeholder||'')}">`}
          ${opts.hint ? `<div class="sb-prompt-hint">${escapeHtml(opts.hint)}</div>` : ''}
        </div>`,
      confirmText: opts.confirmText || 'OK', cancelText: opts.cancelText || 'Cancel', confirmClass: opts.confirmClass || 'primary',
      onMount: (ov) => {
        const el = ov.querySelector('#' + inputId);
        if (el && opts.type !== 'date') el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !opts.multiline && !e.shiftKey) { e.preventDefault(); ov.querySelector('[data-act="confirm"]').click(); }
        });
      },
      onConfirm: (ov) => {
        const el = ov.querySelector('#' + inputId);
        const val = el ? el.value : '';
        if (opts.required && !val.trim()) { if (el) { el.style.borderColor = 'var(--red)'; el.focus(); } return false; }
        return val;
      },
    });
  };
  window.sbChoose = function (opts) {
    const options = opts.options || [];
    const buttonsHtml = options.map((o, i) => `
      <button type="button" class="sb-prompt-choice" data-idx="${i}">
        <span class="sb-prompt-choice-ico">${o.icon || '•'}</span>
        <div class="sb-prompt-choice-body">
          <div class="sb-prompt-choice-title">${escapeHtml(o.label)}</div>
          ${o.desc ? `<div class="sb-prompt-choice-desc">${escapeHtml(o.desc)}</div>` : ''}
        </div>
      </button>`).join('');
    return mount({
      icon: opts.icon || '📋', title: opts.title || 'Choose one', subtitle: opts.subtitle,
      bodyHtml: `<div class="sb-prompt-choice-grid">${buttonsHtml}</div>`,
      showCancel: true, cancelText: opts.cancelText || 'Cancel', confirmText: opts.confirmText || 'Select', confirmClass: opts.confirmClass || 'primary',
      onMount: (ov, close) => {
        ov.querySelectorAll('.sb-prompt-choice').forEach(btn => {
          btn.onclick = () => { const picked = options[parseInt(btn.dataset.idx, 10)]; close(picked ? picked.value : null); };
        });
        const confirmBtn = ov.querySelector('[data-act="confirm"]');
        if (confirmBtn) confirmBtn.style.display = 'none';
      },
    });
  };
})();