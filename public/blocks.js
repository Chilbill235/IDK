/* SafeBeef v83 — Block user system */
'use strict';
(function () {
  const KEY = 'sb26_blocks';
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return {};
      const m = JSON.parse(raw);
      return (m && typeof m === 'object' && !Array.isArray(m)) ? m : {};
    } catch (e) { return {}; }
  }
  function save(m) {
    try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {}
    try { window.Live && Live.emit && Live.emit('blocks'); } catch (e) {}
    try { window.appChannel && appChannel.postMessage({ type: 'blocks-changed' }); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('sb-blocks-changed')); } catch (e) {}
  }
  function list(blocker) { if (!blocker) return []; return load()[blocker] || []; }
  function isBlocked(blocker, blocked) { if (!blocker || !blocked) return false; return list(blocker).includes(blocked); }
  function isBlockedEither(a, b) { return isBlocked(a, b) || isBlocked(b, a); }
  function block(blocker, blocked) {
    if (!blocker || !blocked || blocker === blocked) return false;
    const m = load();
    m[blocker] = m[blocker] || [];
    if (m[blocker].includes(blocked)) return false;
    m[blocker].push(blocked);
    save(m);
    return true;
  }
  function unblock(blocker, blocked) {
    const m = load();
    if (!m[blocker]) return false;
    const before = m[blocker].length;
    m[blocker] = m[blocker].filter(x => x !== blocked);
    if (!m[blocker].length) delete m[blocker];
    save(m);
    return before !== (m[blocker]?.length || 0);
  }
  function whoBlockedMe(myUsername) {
    const m = load(); const out = [];
    Object.keys(m).forEach(blocker => { if (Array.isArray(m[blocker]) && m[blocker].includes(myUsername)) out.push(blocker); });
    return out;
  }
  window.SBBlocks = { load, save, list, isBlocked, isBlockedEither, block, unblock, whoBlockedMe, count(blocker) { return list(blocker).length; } };
})();