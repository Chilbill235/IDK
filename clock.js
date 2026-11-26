/* clock.js — SafeBeef v71 — Live time widget with dedupe */
(function () {
  'use strict';

  function pad(n) { return String(n).padStart(2, '0'); }

  function getPeriod(h) {
    if (h >= 5 && h < 12) return { key: 'morning', icon: '🌅', greet: 'Good morning' };
    if (h >= 12 && h < 17) return { key: 'afternoon', icon: '☀️', greet: 'Good afternoon' };
    if (h >= 17 && h < 21) return { key: 'evening', icon: '🌆', greet: 'Good evening' };
    return { key: 'night', icon: '🌙', greet: 'Good night' };
  }

  function tick(host) {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    const period = getPeriod(h);
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    const timeStr = `${h12}:${pad(m)}:${pad(s)} ${ampm}`;
    const dateStr = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

    host.dataset.period = period.key;
    host.innerHTML = `
      <span class="sb-clock-ico" aria-hidden="true">${period.icon}</span>
      <span class="sb-clock-text">${timeStr}</span>
      <span class="sb-clock-sep">·</span>
      <span class="sb-clock-text" style="opacity:.7;font-weight:600">${dateStr}</span>
      <span class="sb-clock-sep">·</span>
      <span class="sb-clock-greet">${period.greet}</span>
    `;
  }

  function initClock(host) {
    if (!host || host.dataset.clockInit === '1') return;
    host.dataset.clockInit = '1';
    host.classList.add('sb-clock');
    host.setAttribute('title', 'Local time');
    tick(host);
    const iv = setInterval(() => {
      if (!document.body.contains(host)) { clearInterval(iv); return; }
      tick(host);
    }, 1000);
  }

  function initAll() {
    // For each parent, keep only the FIRST [data-sb-clock] element
    const parentsSeen = new Set();
    document.querySelectorAll('[data-sb-clock]').forEach(el => {
      const parent = el.parentElement;
      if (parentsSeen.has(parent)) {
        // Duplicate — remove element entirely
        el.remove();
        return;
      }
      parentsSeen.add(parent);
      initClock(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // Re-run on dynamic additions
  const obs = new MutationObserver(() => {
    const parentsSeen = new Set();
    document.querySelectorAll('[data-sb-clock]').forEach(el => {
      const parent = el.parentElement;
      if (parentsSeen.has(parent)) { el.remove(); return; }
      parentsSeen.add(parent);
      if (el.dataset.clockInit !== '1') initClock(el);
    });
  });
  obs.observe(document.body, { childList: true, subtree: true });

  window.SafeBeefClock = { init: initAll, initOne: initClock };
})();