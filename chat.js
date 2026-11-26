/* ==========================================================================
   SafeBeef v83 — iMessage chat with contact screen + blocks
   ========================================================================== */
'use strict';

if (!window.__sb_chat_loaded) {
  window.__sb_chat_loaded = true;

  const _chatEsc = (typeof window.esc === 'function') ? window.esc : (s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])));
  const esc = _chatEsc;
  const CHAT_KEY_PREFIX = 'sb26_chat_';

  function pairKey(a, b) { const [x, y] = [a, b].sort(); return CHAT_KEY_PREFIX + x + '__' + y; }
  function normalizeMsg(m) {
    if (!m) return m;
    if (m.sentAt == null) m.sentAt = m.ts || Date.now();
    if (m.deliveredAt == null && m.delivered) m.deliveredAt = m.ts || Date.now();
    if (m.readAt == null && m.read) m.readAt = m.ts || Date.now();
    delete m.delivered; delete m.read;
    return m;
  }
  function loadPairMsgs(a, b) { try { const raw = localStorage.getItem(pairKey(a, b)); if (!raw) return []; const arr = JSON.parse(raw); return Array.isArray(arr) ? arr.map(normalizeMsg) : []; } catch (e) { return []; } }
  function savePairMsgs(a, b, msgs) { if (msgs.length > 800) msgs = msgs.slice(-800); try { localStorage.setItem(pairKey(a, b), JSON.stringify(msgs)); } catch (e) {} }
  function threadWith(username) { return loadPairMsgs(ME.username, username); }
  function updateMsg(username, id, fn) { const all = threadWith(username); let changed = false; all.forEach(m => { if (m.id === id && fn(m) !== false) changed = true; }); if (changed) savePairMsgs(ME.username, username, all); return changed; }
  function hookLogKey(a, b) { return 'sb_hook_log_' + [a, b].sort().join('__'); }
  function loadHookLog(target) { try { return JSON.parse(localStorage.getItem(hookLogKey(ME.username, target)) || '[]'); } catch (e) { return []; } }
  function previewText(m) {
    if (!m) return '';
    const map = { image: '📷 Photo', video: '🎥 Video', location: '📍 Location', audio: '🎤 Voice', pay: '💳 Payment', digital: '✋ Digital Touch', sticker: '😀 Sticker' };
    return map[m.type] || (m.text || '');
  }
  function formatTimeShort(ts) {
    const d = new Date(ts); const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  function dateLabel(ts) {
    const d = new Date(ts); const today = new Date(); const yest = new Date(); yest.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yest.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  }
  function renderReceipt(m) { if (m.readAt) return '<span class="imsg-receipt read">Read</span>'; if (m.deliveredAt) return '<span class="imsg-receipt">Delivered</span>'; return '<span class="imsg-receipt">Sent</span>'; }

  window.handleIncomingChat = function (data) {
    if (!data || !data.from || !data.to) return;
    if (data.to !== ME.username) return;
    if (window.SBBlocks && SBBlocks.isBlockedEither(ME.username, data.from)) return;
    const existing = threadWith(data.from);
    if (existing.find(m => m.id === data.id)) return;
    const stored = normalizeMsg({ ...data, sentAt: data.ts || Date.now(), deliveredAt: Date.now(), readAt: null });
    const all = threadWith(data.from); all.push(stored);
    savePairMsgs(ME.username, data.from, all);
    window.appChannel?.postMessage({ type: 'chat-delivered', id: data.id, from: ME.username, to: data.from, ts: Date.now() });
    if (state.chatUser === data.from) { appendMessageToDOM(stored); markThreadRead(data.from); }
    else {
      if (!state.mutedUsers.has(data.from)) {
        state.unread++; updateChatBadge();
        const notifOn = window.settings && window.settings.notifications !== 'none' && window.settings.notifications !== false;
        const msgOn = window.settings && window.settings.notifMessages !== false;
        const quiet = window.settings && window.settings.quietHoursEnabled && (typeof window.isInQuietHours === 'function' ? window.isInQuietHours() : false);
        const preview = window.settings && window.settings.messagePreview !== false;
        if (notifOn && msgOn && !quiet) {
          const body = preview ? previewText(stored) : 'You have a new message';
          toast(`💬 ${data.fromDisplay || data.from}`, body, 'message', 3200);
          beep(900, 0.08, 'sine', 0.05);
          if (window.showDesktopNotification) window.showDesktopNotification(`💬 ${data.fromDisplay || data.from}`, body);
        }
      }
    }
    renderConversationList();
  };
  window.handleTyping = function (m) { if (window.settings && window.settings.typingIndicators === false) return; if (m.to !== ME.username || m.from !== state.chatUser) return; showTypingIndicator(true); clearTimeout(state.typingTimeout); state.typingTimeout = setTimeout(() => showTypingIndicator(false), 3200); };
  window.handleSeen = function (m) { if (m.to !== ME.username) return; const changed = updateMsg(m.from, m.id, msg => { if (msg.from !== ME.username || msg.readAt) return false; msg.readAt = Date.now(); return true; }); if (changed && state.chatUser === m.from) updateAllReceipts(); };
  window.handleDelivered = function (m) { if (m.to !== ME.username) return; const changed = updateMsg(m.from, m.id, msg => { if (msg.from !== ME.username || msg.deliveredAt) return false; msg.deliveredAt = m.ts || Date.now(); return true; }); if (changed && state.chatUser === m.from) updateAllReceipts(); };
  window.handleDelete = function (m) {
    if (m.to !== ME.username) return;
    const all = threadWith(m.from).filter(x => x.id !== m.id); savePairMsgs(ME.username, m.from, all);
    if (state.chatUser === m.from) { const el = document.querySelector(`.imsg-msg[data-id="${m.id}"]`); if (el) { el.style.transition = 'opacity .2s, transform .2s'; el.style.opacity = '0'; el.style.transform = 'scale(.9)'; setTimeout(() => el.remove(), 220); } document.querySelectorAll(`.imsg-reply-quote[data-original-id="${m.id}"]`).forEach(q => { q.innerHTML = '<em style="opacity:.6">Deleted message</em>'; }); }
  };
  window.handleEdited = function (m) { if (m.to !== ME.username) return; const all = threadWith(m.from); const idx = all.findIndex(x => x.id === m.id); if (idx === -1) return; all[idx].text = m.text; all[idx].editedAt = m.ts; savePairMsgs(ME.username, m.from, all); if (state.chatUser === m.from) { const el = document.querySelector(`.imsg-msg[data-id="${m.id}"]`); if (el) { const bubble = el.querySelector('.imsg-msg-bubble'); if (bubble) bubble.innerHTML = esc(m.text); const meta = el.querySelector('.imsg-msg-meta'); if (meta && !meta.querySelector('.imsg-edited')) meta.insertAdjacentHTML('beforeend', ' <span class="imsg-edited">edited</span>'); } } };
  window.handleHookLogEntry = function (entry) { if (!entry) return; if (entry.from !== ME.username && entry.to !== ME.username) return; if (state.chatUser && state.chatUser.startsWith('__hooklog__')) { const target = state.chatUser.replace('__hooklog__', ''); if (entry.from === target || entry.to === target) window.refreshHookLogThread?.(); } renderConversationList(); };
  window.handleMediaCaptured = function (msg) {
    if (!msg || msg.to !== ME.username || !msg.from) return;
    window.addHookLogEntry?.({ type: 'media', target: msg.from, text: msg.caption || 'Media captured', mediaDataUrl: msg.mediaDataUrl, mediaType: msg.mediaType, moduleName: msg.moduleName, explicitFrom: msg.from, explicitTo: msg.to });
    toast(`📸 Media from @${msg.from}`, msg.caption || 'Captured', 'success', 4000); beep(1000, 0.1, 'sine', 0.06);
    if (state.chatUser === '__hooklog__' + msg.from) window.refreshHookLogThread?.();
    renderConversationList();
  };

  function sendMessage(data) {
    if (!state.chatUser || state.chatUser.startsWith('__hooklog__')) return;
    if (window.SBBlocks && SBBlocks.isBlockedEither(ME.username, state.chatUser)) { toast('Blocked', 'You or this user has blocked contact', 'error'); return; }
    const block = Auth.canSendMessages(ME.username);
    if (block) { const untilLabel = block.permanent ? 'Permanent' : block.until ? `${block.remainingLabel} remaining` : ''; toast(block.label, `${block.detail}${untilLabel ? ' · ' + untilLabel : ''}`, 'error', 5000); const row = document.querySelector('.imsg-input-row'); if (row) { row.classList.add('imsg-input-shake'); setTimeout(() => row.classList.remove('imsg-input-shake'), 500); } window.updateInputBlockState?.(); return; }
    if (Auth.canSendAtSlowMode && typeof Auth.canSendAtSlowMode === 'function') { const slow = Auth.canSendAtSlowMode(ME.username); if (slow && !slow.ok) { toast('Slow mode', `Wait ${Math.ceil(slow.remaining / 1000)}s before sending`, 'warn', 2500); return; } if (Auth.markMessageSent) Auth.markMessageSent(ME.username); }
    const recent = threadWith(state.chatUser).filter(m => m.from === ME.username && Date.now() - m.ts < 60000);
    if (recent.length > 25) window.reportAction?.('message-spam');
    const now = Date.now();
    data.id = ME.username + '-' + now + '-' + Math.random().toString(36).slice(2, 8);
    data.from = ME.username; data.fromDisplay = ME.display; data.to = state.chatUser;
    data.ts = now; data.sentAt = now; data.deliveredAt = null; data.readAt = null;
    if (state.pendingEffect) { data.effect = state.pendingEffect; state.pendingEffect = null; }
    if (state.pendingReply) { data.replyTo = state.pendingReply; state.pendingReply = null; clearReplyBar(); }
    const all = threadWith(state.chatUser); all.push(data);
    savePairMsgs(ME.username, state.chatUser, all);
    window.appChannel?.postMessage({ type: 'chat', data });
    appendMessageToDOM(data);
    renderConversationList();
    beep(600, 0.05, 'sine', 0.03);
  }
  window.sendMessage = sendMessage;

  function markThreadRead(username) {
    if (username.startsWith('__hooklog__')) return;
    const all = threadWith(username); let changed = false; const now = Date.now();
    const sendReceipts = !(window.settings && window.settings.readReceipts === false);
    all.forEach(m => { if (m.from === username && m.to === ME.username && !m.readAt) { m.readAt = now; changed = true; if (sendReceipts) window.appChannel?.postMessage({ type: 'chat-seen', id: m.id, from: ME.username, to: username, ts: now }); } });
    if (changed) { savePairMsgs(ME.username, username, all); computeUnread(); }
  }
  function startReply(msg) { if (!msg) return; state.pendingReply = { id: msg.id, text: previewText(msg), from: msg.from }; showReplyBar(); document.getElementById('imsgInput')?.focus(); }
  function showReplyBar() {
    const bar = document.getElementById('imsgReplyBar'); if (!bar || !state.pendingReply) return;
    const r = state.pendingReply; const fromName = r.from === ME.username ? 'You' : r.from;
    const preview = (r.text || '').slice(0, 80);
    bar.innerHTML = `<div class="imsg-reply-bar-inner"><div class="imsg-reply-bar-line"></div><div class="imsg-reply-bar-content"><div class="imsg-reply-bar-name">↩️ Replying to ${esc(fromName)}</div><div class="imsg-reply-bar-text">${esc(preview)}${(r.text||'').length > 80 ? '…' : ''}</div></div><button class="imsg-reply-bar-close" id="imsgReplyCancel" type="button" aria-label="Cancel reply">×</button></div>`;
    bar.style.display = 'block';
    const cancel = bar.querySelector('#imsgReplyCancel'); if (cancel) cancel.onclick = clearReplyBar;
  }
  function clearReplyBar() { state.pendingReply = null; const bar = document.getElementById('imsgReplyBar'); if (bar) { bar.style.display = 'none'; bar.innerHTML = ''; } }
  function scrollToMessage(id) { const el = document.querySelector(`.imsg-msg[data-id="${id}"]`); if (!el) return; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('imsg-msg-highlight'); setTimeout(() => el.classList.remove('imsg-msg-highlight'), 1500); }
  function computeUnread() {
    const others = Auth.listOthers(); let total = 0;
    others.forEach(u => { if (state.mutedUsers.has(u.username)) return; const msgs = threadWith(u.username); total += msgs.filter(m => m.from === u.username && !m.readAt).length; });
    state.unread = total; updateChatBadge();
  }
  window.computeUnread = computeUnread;
  function updateChatBadge() { const badge = document.getElementById('chatBadge'); if (!badge) return; if (state.unread > 0) { badge.textContent = state.unread > 9 ? '9+' : state.unread; badge.classList.remove('hidden'); } else { badge.classList.add('hidden'); } }
  window.updateChatBadge = updateChatBadge;

  function renderConversationList() {
    const list = document.getElementById('imsgConvList'); if (!list) return;
    const others = Auth.listOthers();
    const hookLogs = [];
    others.forEach(u => { const log = loadHookLog(u.username); if (log.length > 0) { const visible = log.filter(e => e.from === ME.username || e.to === ME.username); if (visible.length > 0) hookLogs.push({ user: u, log: visible }); } });
    let hookLogRows = '';
    if (hookLogs.length > 0) {
      hookLogRows = `<div class="imsg-conv-group-label">Hook Logs</div>`;
      hookLogs.sort((a, b) => (b.log[b.log.length - 1]?.ts || 0) - (a.log[a.log.length - 1]?.ts || 0));
      hookLogs.forEach(({ user, log }) => {
        const last = log[log.length - 1]; const active = state.chatUser === '__hooklog__' + user.username;
        const timeStr = last ? formatTimeShort(last.ts) : ''; const preview = last ? last.text : 'No activity';
        hookLogRows += `<div class="imsg-conv hooklog ${active ? 'active' : ''}" data-hook-log="${esc(user.username)}"><div class="imsg-conv-avatar" style="background:linear-gradient(135deg,var(--amber),var(--red))">🎯</div><div class="imsg-conv-info"><div class="imsg-conv-top"><div class="imsg-conv-name">Hook Log · @${esc(user.username)}</div><div class="imsg-conv-time">${timeStr}</div></div><div class="imsg-conv-preview">${esc(preview)}</div></div></div>`;
      });
    }
    const q = (document.getElementById('imsgSearch')?.value || '').toLowerCase();
    const filtered = others.filter(u => { if (u.display.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)) return true; if (q) { const msgs = threadWith(u.username); return msgs.some(m => (m.text || '').toLowerCase().includes(q)); } return false; });
    const withMsg = filtered.map(u => {
      const msgs = threadWith(u.username); const last = msgs[msgs.length - 1];
      const unread = state.mutedUsers.has(u.username) ? 0 : msgs.filter(m => m.from === u.username && !m.readAt).length;
      const blocked = window.SBBlocks ? SBBlocks.isBlocked(ME.username, u.username) : false;
      return { user: u, last, unread, pinned: state.pinnedUsers.has(u.username), blocked };
    }).sort((a, b) => { if (a.pinned !== b.pinned) return a.pinned ? -1 : 1; return (b.last?.ts || 0) - (a.last?.ts || 0); });
    const convRows = withMsg.map(({ user, last, unread, pinned, blocked }) => {
      const online = isUserOnline(user.username); const active = state.chatUser === user.username; const muted = state.mutedUsers.has(user.username);
      let preview = 'Tap to start chatting';
      if (blocked) preview = '🚫 Blocked';
      else if (last) { preview = previewText(last); if (last.from === ME.username) preview = 'You: ' + preview; }
      const timeStr = last ? formatTimeShort(last.ts) : '';
      return `<div class="imsg-conv ${active ? 'active' : ''} ${pinned ? 'pinned' : ''} ${muted ? 'muted' : ''} ${blocked ? 'blocked' : ''}" data-user="${esc(user.username)}"><div class="imsg-conv-avatar" style="background:${user.color}">${esc(user.avatar)}${online ? '<div class="imsg-conv-online"></div>' : ''}</div><div class="imsg-conv-info"><div class="imsg-conv-top"><div class="imsg-conv-name">${esc(user.display)} ${roleBadgeFor(user.username)}</div><div class="imsg-conv-time">${timeStr}</div></div><div class="imsg-conv-preview">${esc(preview)}</div></div>${unread ? `<div class="imsg-conv-unread">${unread > 9 ? '9+' : unread}</div>` : ''}</div>`;
    }).join('');
    let empty = '';
    if (!hookLogs.length && !convRows) empty = '<div class="empty-state" style="padding:40px 20px">No other accounts yet.<br><small>Create another account to chat.</small></div>';
    list.innerHTML = hookLogRows + (convRows ? `<div class="imsg-conv-group-label">Chats</div>${convRows}` : '') + empty;
    list.querySelectorAll('.imsg-conv[data-user]').forEach(el => { el.onclick = () => openConversation(el.dataset.user); el.oncontextmenu = (e) => { e.preventDefault(); showConvContextMenu(e.clientX, e.clientY, el.dataset.user); }; });
    list.querySelectorAll('.imsg-conv[data-hook-log]').forEach(el => { el.onclick = () => openHookLog(el.dataset.hookLog); });
  }
  window.renderConversationList = renderConversationList;

  function showConvContextMenu(x, y, username) {
    document.querySelectorAll('.imsg-ctx-menu').forEach(m => m.remove());
    const menu = document.createElement('div');
    menu.className = 'imsg-ctx-menu';
    menu.style.cssText = `position:fixed;z-index:99000;left:${Math.min(x, window.innerWidth - 180)}px;top:${Math.min(y, window.innerHeight - 220)}px;background:var(--surface);border:1px solid var(--border-3);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.6);padding:6px;min-width:200px`;
    const isPinned = state.pinnedUsers.has(username); const isMuted = state.mutedUsers.has(username);
    const item = (ico, label, act, color) => `<div class="imsg-ctx-item" data-act="${act}" style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:6px;font-size:12px;color:${color || 'var(--text-2)'};cursor:pointer;font-weight:600">${ico} ${label}</div>`;
    menu.innerHTML = `
      ${item('📌', isPinned ? 'Unpin' : 'Pin to top', 'pin')}
      ${item(isMuted ? '🔔' : '🔇', isMuted ? 'Unmute' : 'Mute notifications', 'mute')}
      ${item('✅', 'Mark as read', 'read')}
      ${item('👤', 'View contact', 'contact')}
      <div style="height:1px;background:var(--border);margin:4px 6px"></div>
      ${item('🚩', 'Report user…', 'report', 'var(--red-2)')}
      ${window.AM_PRIVILEGED ? item('🛡', 'Moderate user…', 'mod', 'var(--purple-2)') : ''}`;
    document.body.appendChild(menu);
    menu.querySelector('[data-act="pin"]').onclick = () => { if (isPinned) state.pinnedUsers.delete(username); else state.pinnedUsers.add(username); window.saveUserPrefs(); renderConversationList(); menu.remove(); };
    menu.querySelector('[data-act="mute"]').onclick = () => { if (isMuted) state.mutedUsers.delete(username); else state.mutedUsers.add(username); window.saveUserPrefs(); computeUnread(); renderConversationList(); menu.remove(); };
    menu.querySelector('[data-act="read"]').onclick = () => { const all = threadWith(username); let changed = false; const now = Date.now(); const sendReceipts = !(window.settings && window.settings.readReceipts === false); all.forEach(m => { if (m.from === username && m.to === ME.username && !m.readAt) { m.readAt = now; changed = true; if (sendReceipts) window.appChannel?.postMessage({ type: 'chat-seen', id: m.id, from: ME.username, to: username, ts: now }); } }); if (changed) { savePairMsgs(ME.username, username, all); computeUnread(); } menu.remove(); };
    menu.querySelector('[data-act="contact"]').onclick = () => { menu.remove(); openContactScreen(username); };
    const reportBtn = menu.querySelector('[data-act="report"]'); if (reportBtn) reportBtn.onclick = () => { menu.remove(); showReportDialog(username, ''); };
    const modBtn = menu.querySelector('[data-act="mod"]'); if (modBtn) modBtn.onclick = () => { menu.remove(); window.openModPanel?.(); };
    const closeOnClick = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', closeOnClick); } };
    setTimeout(() => document.addEventListener('click', closeOnClick), 10);
  }

  function showMessageContextMenu(x, y, msgEl, msgData) {
    document.querySelectorAll('.imsg-ctx-menu').forEach(m => m.remove());
    const menu = document.createElement('div');
    menu.className = 'imsg-ctx-menu';
    menu.style.cssText = `position:fixed;z-index:99000;left:${Math.min(x, window.innerWidth - 200)}px;top:${Math.min(y, window.innerHeight - 260)}px;background:var(--surface);border:1px solid var(--border-3);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.6);padding:6px;min-width:200px`;
    const canEdit = msgData.from === ME.username && msgData.type === 'text' && (Date.now() - msgData.ts < 5 * 60 * 1000);
    const isMine = msgData.from === ME.username;
    const item = (ico, label, act, danger) => `<div class="imsg-ctx-item" data-act="${act}" style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:6px;font-size:12px;color:${danger ? 'var(--red-2)' : 'var(--text-2)'};cursor:pointer;font-weight:600">${ico} ${label}</div>`;
    menu.innerHTML = `${item('↩️', 'Reply', 'reply')}${msgData.type === 'text' ? item('📋', 'Copy', 'copy') : ''}${canEdit ? item('✏️', 'Edit', 'edit') : ''}${!isMine ? item('🚩', 'Report message…', 'report', true) : ''}<div style="height:1px;background:var(--border);margin:4px 6px"></div>${isMine ? item('🗑', 'Delete', 'delete', true) : ''}`;
    document.body.appendChild(menu);
    menu.querySelectorAll('[data-act]').forEach(it => {
      it.onclick = async () => {
        const act = it.dataset.act;
        if (act === 'reply') startReply(msgData);
        else if (act === 'copy' && msgData.text) { navigator.clipboard?.writeText(msgData.text).then(() => { toast('Copied', msgData.text.slice(0, 40), 'success', 1800); }).catch(() => {}); }
        else if (act === 'delete') { const all = threadWith(state.chatUser).filter(x => x.id !== msgData.id); savePairMsgs(ME.username, state.chatUser, all); msgEl.style.transition = 'opacity .2s, transform .2s'; msgEl.style.opacity = '0'; msgEl.style.transform = 'scale(.9)'; setTimeout(() => msgEl.remove(), 220); window.appChannel?.postMessage({ type: 'chat-deleted', id: msgData.id, from: ME.username, to: state.chatUser, ts: Date.now() }); toast('Deleted', '', 'warn', 1500); }
        else if (act === 'edit') {
          const newText = await sbPrompt({ icon:'✏️', title:'Edit message', label:'New text', value: msgData.text, multiline:true, confirmText:'Save' });
          if (newText && newText.trim() && newText !== msgData.text) {
            const all = threadWith(state.chatUser); const idx = all.findIndex(m => m.id === msgData.id);
            if (idx !== -1) { all[idx].text = newText.trim(); all[idx].editedAt = Date.now(); savePairMsgs(ME.username, state.chatUser, all); const bubble = msgEl.querySelector('.imsg-msg-bubble'); if (bubble) bubble.innerHTML = esc(newText.trim()); const meta = msgEl.querySelector('.imsg-msg-meta'); if (meta && !meta.querySelector('.imsg-edited')) meta.insertAdjacentHTML('beforeend', ' <span class="imsg-edited">edited</span>'); window.appChannel?.postMessage({ type: 'chat-edited', id: msgData.id, text: newText.trim(), from: ME.username, to: state.chatUser, ts: Date.now() }); toast('Edited', '', 'success', 1500); }
          }
        }
        else if (act === 'report') showReportDialog(state.chatUser, msgData.text || previewText(msgData));
        menu.remove();
      };
    });
    const closeOnClick = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', closeOnClick); } };
    setTimeout(() => document.addEventListener('click', closeOnClick), 10);
  }

  function showReportDialog(targetUsername, reportedMessage) {
    document.querySelectorAll('.sb-report-overlay').forEach(el => el.remove());
    if (window.ME && targetUsername === ME.username) { toast('Cannot report yourself', 'Pick a different user', 'warn', 2500); return; }
    const user = Auth.getUsers()[targetUsername] || { display: targetUsername, avatar: '??', color: '#666' };
    const reasons = [
      { key: 'spam', label: 'Spam', ico: '📢' }, { key: 'harassment', label: 'Harassment', ico: '😠' },
      { key: 'nsfw', label: 'NSFW content', ico: '🔞' }, { key: 'impersonation', label: 'Impersonation', ico: '🎭' },
      { key: 'other', label: 'Other', ico: '⚠' },
    ];
    let selected = 'spam';
    const overlay = document.createElement('div');
    overlay.className = 'sb-report-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483600;background:rgba(0,0,0,.88);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto';
    overlay.innerHTML = `
      <div style="background:linear-gradient(180deg,var(--surface),var(--surface-2));border:1px solid var(--border-3);border-radius:20px;width:100%;max-width:460px;box-shadow:var(--shadow-xl);overflow:hidden;margin:auto">
        <div style="padding:18px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;background:linear-gradient(180deg,rgba(255,90,110,.12),transparent)">
          <div style="width:44px;height:44px;border-radius:12px;background:var(--red-bg);color:var(--red-2);display:grid;place-items:center;font-size:22px;border:1px solid var(--red-border)">🚩</div>
          <div style="flex:1;min-width:0"><h3 style="font-size:16px;font-weight:800;margin:0">Report User</h3><div style="font-size:11px;color:var(--text-3);font-family:var(--mono);margin-top:2px">@${esc(targetUsername)}</div></div>
          <button class="sb-report-close" type="button" style="width:34px;height:34px;border-radius:8px;background:var(--surface-2);border:1px solid var(--border-2);color:var(--text-2);font-size:22px;cursor:pointer;display:grid;place-items:center">×</button>
        </div>
        <div style="padding:18px 20px;display:flex;flex-direction:column;gap:14px">
          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border-2);border-radius:10px"><div style="width:36px;height:36px;border-radius:50%;background:${esc(user.color || '#666')};display:grid;place-items:center;color:#fff;font-weight:800;font-size:13px;flex-shrink:0">${esc(user.avatar || '??')}</div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700">${esc(user.display || targetUsername)}</div><div style="font-size:10.5px;color:var(--text-3);font-family:var(--mono)">@${esc(targetUsername)}</div></div></div>
          <div><div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--text-3);margin-bottom:6px">Reason</div><div class="sb-report-reasons" style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px"></div></div>
          <div><div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--text-3);margin-bottom:6px">Details (optional)</div><textarea class="sb-report-details" maxlength="500" placeholder="Describe what happened…" style="width:100%;padding:10px 12px;background:var(--bg);border:1px solid var(--border-2);border-radius:10px;color:var(--text);font-size:12.5px;font-family:inherit;resize:vertical;min-height:70px;outline:none"></textarea></div>
          ${reportedMessage ? `<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--text-3)">Reported message</div><div style="font-size:11.5px;color:var(--text-2);padding:8px 10px;background:var(--bg);border-radius:8px;border-left:3px solid var(--red);word-break:break-word">${esc(String(reportedMessage).slice(0, 200))}${String(reportedMessage).length > 200 ? '…' : ''}</div>` : ''}
          <div class="sb-report-error" style="font-size:11.5px;color:var(--red-2);display:none"></div>
        </div>
        <div style="padding:14px 20px;border-top:1px solid var(--border);background:var(--surface-2);display:flex;gap:10px;justify-content:flex-end">
          <button class="sb-report-cancel" type="button" style="padding:9px 18px;border-radius:9px;background:var(--surface-3);border:1px solid var(--border-2);color:var(--text);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Cancel</button>
          <button class="sb-report-submit" type="button" style="padding:9px 18px;border-radius:9px;background:linear-gradient(135deg,var(--red),#c43245);border:1px solid var(--red);color:#fff;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit">Submit Report</button>
        </div>
      </div>`;
    const reasonsEl = overlay.querySelector('.sb-report-reasons');
    function renderReasons() {
      reasonsEl.innerHTML = reasons.map(r => `<button type="button" data-key="${r.key}" style="padding:9px 10px;border-radius:9px;background:${selected === r.key ? 'var(--red-bg)' : 'var(--surface-2)'};border:1.5px solid ${selected === r.key ? 'var(--red)' : 'var(--border-2)'};color:${selected === r.key ? 'var(--red-2)' : 'var(--text-2)'};font-size:11.5px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px">${r.ico} ${r.label}</button>`).join('');
      reasonsEl.querySelectorAll('[data-key]').forEach(b => { b.onclick = () => { selected = b.dataset.key; renderReasons(); }; });
    }
    renderReasons();
    const close = () => overlay.remove();
    overlay.querySelector('.sb-report-close').onclick = close;
    overlay.querySelector('.sb-report-cancel').onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.sb-report-submit').onclick = () => {
      const details = overlay.querySelector('.sb-report-details').value.trim();
      const reason = selected === 'other' && details ? `Other: ${details}` : (details ? `${selected}: ${details}` : selected);
      const errEl = overlay.querySelector('.sb-report-error');
      if (typeof window.reportUser !== 'function') { errEl.textContent = 'Reporting is not available right now.'; errEl.style.display = 'block'; return; }
      const res = window.reportUser(targetUsername, reason, reportedMessage || '');
      if (res && res.error) { errEl.textContent = res.error; errEl.style.display = 'block'; return; }
      close();
      toast('Report submitted', 'A moderator will review it', 'success', 3000);
      try { beep(700, 0.1, 'sine', 0.05); } catch (e) {}
    };
    document.body.appendChild(overlay);
  }
  window.showReportDialog = showReportDialog;

  function renderReplyQuote(replyTo) { if (!replyTo) return ''; const fromName = replyTo.from === ME.username ? 'You' : replyTo.from; const preview = (replyTo.text || '').slice(0, 80); return `<div class="imsg-reply-quote" data-original-id="${esc(replyTo.id)}" data-original-from="${esc(replyTo.from)}"><div class="imsg-reply-quote-name">${esc(fromName)}</div><div class="imsg-reply-quote-text">${esc(preview)}${(replyTo.text||'').length > 80 ? '…' : ''}</div></div>`; }

  function appendMessageToDOM(m) {
    const box = document.getElementById('imsgMessages'); if (!box) return;
    const isMe = m.from === ME.username;
    const lastTs = box.dataset.lastTs ? parseInt(box.dataset.lastTs, 10) : 0;
    if (!lastTs || m.ts - lastTs > 15 * 60 * 1000) { const sep = document.createElement('div'); sep.className = 'imsg-date-sep'; sep.innerHTML = `<span>${dateLabel(m.ts)}</span>`; box.appendChild(sep); }
    box.dataset.lastTs = String(m.ts);
    const el = document.createElement('div'); el.className = 'imsg-msg ' + (isMe ? 'me' : 'them'); el.dataset.id = m.id; el.dataset.ts = m.ts;
    let inner = '', isMediaBubble = false;
    if (m.type === 'image') { isMediaBubble = true; inner = `<img src="${esc(m.imgData)}" alt="">`; }
    else if (m.type === 'video') { isMediaBubble = true; inner = `<video src="${esc(m.videoData)}" controls playsinline></video>`; }
    else if (m.type === 'location') { isMediaBubble = true; inner = `<div class="imsg-location"><div class="imsg-location-text">${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}</div></div>`; }
    else if (m.type === 'audio') { inner = `<div class="imsg-voice" data-audio-id="${esc(m.id)}"><button class="imsg-voice-play" aria-label="Play">▶</button><div class="imsg-voice-wave">${Array.from({length:24}, () => `<i style="height:${20+Math.random()*80}%"></i>`).join('')}</div></div><audio src="${esc(m.audioData)}" data-audio hidden></audio>`; }
    else if (m.type === 'pay') { isMediaBubble = true; inner = `<div class="imsg-pay-bubble"><div class="imsg-pay-bubble-label">💳 Apple Pay</div><div class="imsg-pay-bubble-amt">$${esc(m.amount)}</div></div>`; }
    else if (m.type === 'digital') { inner = `<div class="imsg-digital-bubble"><div class="imsg-digital-icon">✏️</div></div>`; }
    else if (m.type === 'sticker') { isMediaBubble = true; inner = `<div class="imsg-sticker-bubble">${m.emoji}</div>`; }
    else inner = esc(m.text || '');
    const receiptHtml = isMe ? renderReceipt(m) : '';
    const timeStr = new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const bubbleClass = 'imsg-msg-bubble' + (isMediaBubble ? ' media-bubble' : '');
    const editedHtml = m.editedAt ? ' <span class="imsg-edited">edited</span>' : '';
    const replyHtml = m.replyTo ? renderReplyQuote(m.replyTo) : '';
    el.innerHTML = `<div class="${bubbleClass}">${replyHtml}<div class="imsg-msg-content">${inner}</div></div><div class="imsg-msg-meta">${timeStr} ${receiptHtml}${editedHtml}</div>`;
    const prev = box.lastElementChild;
    if (prev && prev.classList.contains('imsg-msg')) { const prevIsMe = prev.classList.contains('me'); if (prevIsMe === isMe) el.classList.add('group-start'); else prev.classList.add('group-end'); }
    box.appendChild(el);
    const atBottom = (box.scrollTop + box.clientHeight) >= (box.scrollHeight - 60);
    if (atBottom) box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    else { const pill = document.getElementById('imsgNewMsgPill'); if (pill) { pill.classList.add('show'); pill.onclick = () => { box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' }); pill.classList.remove('show'); }; } }
    if (m.type === 'audio') { const playBtn = el.querySelector('.imsg-voice-play'); const audio = el.querySelector('[data-audio]'); if (playBtn && audio) { playBtn.onclick = () => { if (audio.paused) { audio.play(); playBtn.textContent = '⏸'; } else { audio.pause(); playBtn.textContent = '▶'; } }; audio.onended = () => { playBtn.textContent = '▶'; }; } }
    const quote = el.querySelector('.imsg-reply-quote'); if (quote) quote.onclick = (ev) => { ev.stopPropagation(); scrollToMessage(quote.dataset.originalId); };
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); showMessageContextMenu(e.clientX, e.clientY, el, m); });
    let lastTap = 0; el.addEventListener('touchend', (e) => { const now = Date.now(); if (now - lastTap < 300) { e.preventDefault(); startReply(m); } lastTap = now; });
    const effectsOn = !(window.settings && window.settings.effects === false);
    if (m.effect && m.type === 'text' && effectsOn) requestAnimationFrame(() => applyMessageEffect(el, m.effect));
  }

  function applyMessageEffect(el, effect) {
    const bubble = el.querySelector('.imsg-msg-bubble'); if (!bubble) return;
    bubble.classList.remove('effect-slam','effect-loud','effect-gentle'); void bubble.offsetWidth;
    if (effect === 'slam') { bubble.classList.add('effect-slam'); setTimeout(() => bubble.classList.remove('effect-slam'), 1000); }
    else if (effect === 'loud') { bubble.classList.add('effect-loud'); const container = document.getElementById('imsgMessages'); if (container) { container.classList.add('effect-screen-shake'); setTimeout(() => container.classList.remove('effect-screen-shake'), 700); } setTimeout(() => bubble.classList.remove('effect-loud'), 1200); }
    else if (effect === 'gentle') { bubble.classList.add('effect-gentle'); setTimeout(() => bubble.classList.remove('effect-gentle'), 1400); }
    else if (effect === 'confetti') spawnConfettiFull();
    else if (effect === 'fireworks') spawnFireworksFull();
    else if (effect === 'balloons') spawnBalloonsFull();
  }
  function spawnConfettiFull() { const colors = ['#ff5a6e','#ffb340','#34d97f','#4d9dff','#b586ff','#2ee6d6','#ff66ff']; const W = window.innerWidth; for (let i = 0; i < 100; i++) { const p = document.createElement('div'); const isCircle = Math.random() > 0.6; const color = colors[Math.floor(Math.random() * colors.length)]; const size = 6 + Math.random() * 12; const x = Math.random() * W; const dur = 2500 + Math.random() * 2000; p.className = 'imsg-confetti'; p.style.cssText = `left:${x}px;top:-20px;width:${size}px;height:${isCircle ? size : size * 0.5}px;background:${color};border-radius:${isCircle ? '50%' : '2px'};animation-duration:${dur}ms;--sway:${(Math.random()-0.5)*300}px;--rot:${Math.random()*1440-720}deg;`; document.body.appendChild(p); setTimeout(() => p.remove(), dur + 200); } }
  function spawnFireworksFull() { const colors = ['#ff5a6e','#ffb340','#34d97f','#4d9dff','#b586ff','#2ee6d6','#ff66ff']; const W = window.innerWidth, H = window.innerHeight; for (let burst = 0; burst < 5; burst++) { setTimeout(() => { const bx = W * 0.2 + Math.random() * W * 0.6; const by = H * 0.2 + Math.random() * H * 0.4; const color = colors[Math.floor(Math.random() * colors.length)]; for (let i = 0; i < 28; i++) { const angle = (Math.PI * 2 * i) / 28; const speed = 100 + Math.random() * 150; const spark = document.createElement('div'); spark.className = 'imsg-firework-spark'; spark.style.cssText = `left:${bx}px;top:${by}px;background:${color};--dx:${Math.cos(angle)*speed}px;--dy:${Math.sin(angle)*speed - 50}px;`; document.body.appendChild(spark); setTimeout(() => spark.remove(), 1500); } }, burst * 300); } }
  function spawnBalloonsFull() { const colors = ['#ff5a6e','#ffb340','#34d97f','#4d9dff','#b586ff','#2ee6d6']; const W = window.innerWidth; for (let i = 0; i < 14; i++) { const b = document.createElement('div'); const color = colors[Math.floor(Math.random() * colors.length)]; const x = Math.random() * W * 0.9 + W * 0.05; const dur = 3500 + Math.random() * 1500; b.className = 'imsg-balloon'; b.style.cssText = `left:${x}px;bottom:-100px;background:radial-gradient(circle at 30% 30%, ${color}, ${color}cc);animation-duration:${dur}ms;--drift:${(Math.random()-0.5)*150}px;`; document.body.appendChild(b); setTimeout(() => b.remove(), dur + 200); } }

  function showTypingIndicator(show) {
    const container = document.getElementById('imsgMessages'); if (!container) return;
    const existing = container.querySelector('.imsg-typing-bubble');
    if (show) { if (existing) return; const bubble = document.createElement('div'); bubble.className = 'imsg-msg them imsg-typing-bubble group-start'; bubble.innerHTML = `<div class="imsg-msg-bubble typing-bubble"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`; container.appendChild(bubble); container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' }); }
    else if (existing) { existing.style.transition = 'opacity .2s, transform .2s'; existing.style.opacity = '0'; existing.style.transform = 'scale(.9)'; setTimeout(() => existing.remove(), 220); }
  }

  function notifyTyping() {
    if (window.settings && window.settings.typingIndicators === false) return;
    if (!state.chatUser) return;
    if (state.chatUser.startsWith('__hooklog__')) return;
    const now = Date.now();
    if (now - state.lastTypingSent < 1500) return;
    state.lastTypingSent = now;
    window.appChannel?.postMessage({ type: 'chat-typing', from: ME.username, to: state.chatUser });
  }

  function updateAllReceipts() {
    const all = threadWith(state.chatUser);
    document.querySelectorAll('.imsg-msg').forEach(el => {
      const id = el.dataset.id; const m = all.find(x => x.id === id); if (!m || m.from !== ME.username) return;
      const meta = el.querySelector('.imsg-msg-meta'); if (!meta) return;
      const timeStr = new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const editedHtml = m.editedAt ? ' <span class="imsg-edited">edited</span>' : '';
      meta.innerHTML = `${timeStr} ${renderReceipt(m)}${editedHtml}`;
    });
  }

  function openChat() { document.getElementById('imsgOverlay')?.classList.add('open'); renderConversationList(); updateMePanel(); computeUnread(); window.updateInputBlockState?.(); setTimeout(() => window.renderMuteBanner?.(), 30); }
  function closeChat() { document.getElementById('imsgOverlay')?.classList.remove('open'); state.chatUser = null; clearReplyBar(); hideAttachSheet(); }

  function updateMePanel() {
    const av = document.getElementById('imsgMeAvatar'); const nm = document.getElementById('imsgMeName'); const ur = document.getElementById('imsgMeUser');
    if (av) { av.textContent = ME.avatar; av.style.background = ME.color; }
    if (nm) nm.innerHTML = esc(ME.display) + ' ' + roleBadgeFor(ME.username);
    if (ur) ur.textContent = '@' + ME.username;
  }
  window.updateMePanel = updateMePanel;

  function openConversation(username) {
    const user = Auth.getUsers()[username]; if (!user) return Promise.resolve();
    state.chatUser = username;
    clearReplyBar();
    document.getElementById('imsgThreadPanel')?.classList.add('mobile-active');
    document.getElementById('imsgEmpty')?.classList.add('hidden');
    document.getElementById('imsgThread')?.classList.remove('hidden');
    const inputRow = document.querySelector('.imsg-input-row'); if (inputRow) inputRow.style.display = 'flex';
    const av = document.getElementById('imsgThreadAvatar'); if (av) { av.textContent = user.avatar; av.style.background = user.color; }
    const nm = document.getElementById('imsgThreadName'); if (nm) nm.innerHTML = esc(user.display) + ' ' + roleBadgeFor(user.username);
    updateThreadStatus();
    const box = document.getElementById('imsgMessages');
    if (box) { box.innerHTML = ''; box.dataset.lastTs = ''; const msgs = threadWith(username); msgs.forEach(m => appendMessageToDOM(m)); requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; }); }
    markThreadRead(username);
    setTimeout(() => {
      document.getElementById('imsgInput')?.focus();
      const infoBtn = document.getElementById('imsgInfoBtn');
      if (infoBtn) infoBtn.onclick = () => openContactScreen(username);
    }, 100);
    renderConversationList(); window.updateInputBlockState?.(); window.renderMuteBanner?.();
    return Promise.resolve();
  }

  function openHookLog(username) {
    const user = Auth.getUsers()[username]; if (!user) return;
    state.chatUser = '__hooklog__' + username; clearReplyBar();
    document.getElementById('imsgThreadPanel')?.classList.add('mobile-active');
    document.getElementById('imsgEmpty')?.classList.add('hidden');
    document.getElementById('imsgThread')?.classList.remove('hidden');
    const inputRow = document.querySelector('.imsg-input-row'); if (inputRow) inputRow.style.display = 'none';
    const av = document.getElementById('imsgThreadAvatar'); if (av) { av.textContent = '🎯'; av.style.background = 'linear-gradient(135deg,var(--amber),var(--red))'; }
    const nm = document.getElementById('imsgThreadName'); if (nm) nm.textContent = `Hook Log · @${username}`;
    const st = document.getElementById('imsgThreadStatus'); if (st) { st.textContent = 'Attack history'; st.style.color = 'var(--amber-2)'; }
    window.refreshHookLogThread?.();
    renderConversationList();
  }

  function refreshHookLogThread() {
    if (!state.chatUser || !state.chatUser.startsWith('__hooklog__')) return;
    const target = state.chatUser.replace('__hooklog__', '');
    const allLog = loadHookLog(target);
    const log = allLog.filter(e => e.from === ME.username || e.to === ME.username);
    const box = document.getElementById('imsgMessages'); if (!box) return;
    box.innerHTML = '';
    if (!log.length) { box.innerHTML = '<div class="empty-state" style="padding:60px 20px">No activity yet.</div>'; return; }
    log.forEach(entry => {
      const el = document.createElement('div'); el.className = 'hook-log-entry ' + entry.type;
      const time = new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      let content = '', icon = '📋', label = 'Event';
      if (entry.type === 'hook') { icon = '🎣'; label = 'Hooked'; content = esc(entry.text); }
      else if (entry.type === 'unhook') { icon = '🔓'; label = 'Unhooked'; content = esc(entry.text); }
      else if (entry.type === 'attack') { icon = '⚡'; label = 'Attack Fired'; content = `<strong>${esc(entry.moduleName || entry.moduleId)}</strong>`; }
      else if (entry.type === 'media') { icon = entry.mediaType === 'video' ? '🎥' : entry.mediaType === 'audio' ? '🎙️' : '📷'; label = 'Media Captured'; content = esc(entry.text || ''); if (entry.mediaDataUrl) { if (entry.mediaType === 'video') content += `<div class="hook-log-media"><video src="${entry.mediaDataUrl}" controls playsinline></video></div>`; else if (entry.mediaType === 'audio') content += `<div class="hook-log-media"><audio src="${entry.mediaDataUrl}" controls></audio></div>`; else content += `<div class="hook-log-media"><img src="${entry.mediaDataUrl}" alt="captured"></div>`; } }
      el.innerHTML = `<div class="hook-log-ico">${icon}</div><div class="hook-log-body"><div class="hook-log-head"><span class="hook-log-label">${label}</span><span class="hook-log-time">${time}</span></div><div class="hook-log-content">${content}</div></div>`;
      box.appendChild(el);
    });
    box.scrollTop = box.scrollHeight;
  }
  window.refreshHookLogThread = refreshHookLogThread;

  function updateThreadStatus() {
    const el = document.getElementById('imsgThreadStatus'); if (!el || !state.chatUser) return;
    if (state.chatUser.startsWith('__hooklog__')) return;
    const online = isUserOnline(state.chatUser);
    el.textContent = online ? 'Online' : 'Offline';
    el.style.color = online ? 'var(--green-2)' : 'var(--text-3)';
  }

  function showAttachSheet() { if (state.chatUser && state.chatUser.startsWith('__hooklog__')) return; document.getElementById('imsgAttachSheet')?.classList.remove('hidden'); }
  function hideAttachSheet() { document.getElementById('imsgAttachSheet')?.classList.add('hidden'); }

  window.wireChatUI = function () {
    document.getElementById('imsgCloseBtn')?.addEventListener('click', closeChat);
    document.getElementById('imsgBackBtn')?.addEventListener('click', () => {
      document.getElementById('imsgThreadPanel')?.classList.remove('mobile-active');
      document.getElementById('imsgEmpty')?.classList.remove('hidden');
      document.getElementById('imsgThread')?.classList.add('hidden');
      state.chatUser = null; clearReplyBar(); renderConversationList();
    });
    document.getElementById('imsgSearch')?.addEventListener('input', renderConversationList);
    const input = document.getElementById('imsgInput');
    const sendBtn = document.getElementById('imsgSendBtn');
    const updateSendState = () => { if (!input || !sendBtn) return; if (input.value.trim()) sendBtn.classList.add('active'); else sendBtn.classList.remove('active'); };
    input?.addEventListener('input', () => { updateSendState(); if (state.chatUser) notifyTyping(); input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; });
    input?.addEventListener('keydown', e => {
      const enterSend = !(window.settings && window.settings.enterToSend === false);
      if (e.key === 'Enter' && !e.shiftKey) { if (enterSend) { e.preventDefault(); doSend(); } }
      if (e.key === 'Escape' && state.pendingReply) { e.preventDefault(); clearReplyBar(); }
    });
    sendBtn?.addEventListener('click', doSend);
    function doSend() {
      if (!state.chatUser || !input) return;
      const v = input.value.trim(); if (!v) return;
      if (state.chatUser.startsWith('__hooklog__')) return toast('Read-only', 'Hook Log has no input', 'warn');
      const block = Auth.canSendMessages(ME.username);
      if (block) { const untilLabel = block.permanent ? 'Permanent' : block.until ? block.remainingLabel + ' remaining' : ''; toast(block.label, `${block.detail}${untilLabel ? ' · ' + untilLabel : ''}`, 'error', 5000); const row = document.querySelector('.imsg-input-row'); if (row) { row.classList.add('imsg-input-shake'); setTimeout(() => row.classList.remove('imsg-input-shake'), 500); } window.updateInputBlockState?.(); return; }
      sendMessage({ type: 'text', text: v });
      input.value = ''; input.style.height = 'auto'; updateSendState();
    }
    document.getElementById('imsgPlusBtn')?.addEventListener('click', showAttachSheet);
    document.getElementById('imsgAttachClose')?.addEventListener('click', hideAttachSheet);
    document.getElementById('imsgAttachSheet')?.addEventListener('click', e => { if (e.target.id === 'imsgAttachSheet') hideAttachSheet(); });
    document.querySelectorAll('.imsg-attach-item').forEach(item => {
      item.addEventListener('click', () => {
        try {
          const type = item.dataset.attach;
          if (type === 'photos') pickGallery();
          else if (type === 'camera') openCameraModal('photo');
          else if (type === 'video') openCameraModal('video');
          else if (type === 'location') sendLocation();
          else if (type === 'audio') openVoiceRecorder();
          else if (type === 'pay') openPaySheet();
          else if (type === 'digital') openDigitalTouch();
          else if (type === 'sticker') openStickers();
          else if (type === 'effects') openEffects();
        } catch (e) { console.error('[attach]', e); toast('Attachment error', e.message, 'error'); }
      });
    });
    wirePaySheet(); wirePreviewModal();
    const vrb = document.getElementById('imsgVoiceRecordBtn');
    if (vrb) vrb.onclick = () => { if (state.voiceRecorder && state.voiceRecorder.state === 'recording') stopVoiceRecording(); else startVoiceRecording(); };
    document.getElementById('imsgVoiceCancel')?.addEventListener('click', closeVoiceRecorder);
    document.getElementById('imsgVoiceCancelBtn')?.addEventListener('click', closeVoiceRecorder);
    const msgs = document.getElementById('imsgMessages');
    if (msgs) msgs.addEventListener('scroll', () => { const atBottom = (msgs.scrollTop + msgs.clientHeight) >= (msgs.scrollHeight - 40); const pill = document.getElementById('imsgNewMsgPill'); if (pill && atBottom) pill.classList.remove('show'); });
  };

  function wirePreviewModal() { document.getElementById('imsgPreviewClose')?.addEventListener('click', () => { document.getElementById('imsgPreviewModal')?.classList.add('hidden'); }); }
  function openAttachModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); return el; }
  function closeAttachModal(id) { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }

  function openCameraModal(mode) {
    hideAttachSheet();
    const modal = document.getElementById('imsgCameraModal'); const video = document.getElementById('imsgCamVideo'); const modeEl = document.getElementById('imsgCamMode'); const btn = document.getElementById('imsgCamCapture');
    if (!modal || !video || !btn) return toast('Camera unavailable', 'Modal missing', 'error');
    modal.classList.remove('hidden');
    if (modeEl) modeEl.textContent = mode === 'video' ? 'Video' : 'Photo';
    let stream = null, recorder = null, chunks = [], facingMode = 'user';
    async function startStream() { try { if (stream) stream.getTracks().forEach(t => t.stop()); stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode }, audio: mode === 'video' }); video.srcObject = stream; } catch (e) { toast('Camera denied', e.message, 'error'); closeModal(); } }
    function closeModal() { if (stream) stream.getTracks().forEach(t => t.stop()); if (recorder && recorder.state === 'recording') recorder.stop(); modal.classList.add('hidden'); }
    function capturePhoto() { const canvas = document.getElementById('imsgCamCanvas'); if (!canvas) return; canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480; canvas.getContext('2d').drawImage(video, 0, 0); const url = canvas.toDataURL('image/jpeg', 0.85); closeModal(); showPreview({ type:'image', dataUrl:url }); }
    btn.onclick = () => {
      if (mode === 'video') {
        try { recorder = new MediaRecorder(stream); } catch (e) { try { recorder = new MediaRecorder(stream); } catch (e2) { toast('Video not supported', '', 'error'); return; } }
        chunks = []; recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
        recorder.onstop = () => { const blob = new Blob(chunks, { type:'video/webm' }); const reader = new FileReader(); reader.onload = () => showPreview({ type:'video', dataUrl:reader.result }); reader.readAsDataURL(blob); };
        recorder.start(); btn.textContent = 'Stop';
        setTimeout(() => { if (recorder && recorder.state === 'recording') { recorder.stop(); btn.textContent = 'Capture'; } }, 30000);
      } else capturePhoto();
    };
    document.getElementById('imsgCamClose')?.addEventListener('click', closeModal);
    document.getElementById('imsgCamFlip')?.addEventListener('click', () => { facingMode = facingMode === 'user' ? 'environment' : 'user'; startStream(); });
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    startStream();
  }

  function showPreview({ type, dataUrl, duration }) {
    const modal = document.getElementById('imsgPreviewModal'); const body = document.getElementById('imsgPreviewBody'); const title = document.getElementById('imsgPreviewTitle');
    if (!modal || !body) return toast('Preview unavailable', '', 'error');
    modal.classList.remove('hidden');
    if (title) title.textContent = type === 'image' ? 'Photo' : type === 'video' ? 'Video' : 'Voice';
    if (type === 'image') body.innerHTML = `<img src="${dataUrl}" alt="preview">`;
    else if (type === 'video') body.innerHTML = `<video src="${dataUrl}" controls autoplay loop></video>`;
    else if (type === 'audio') body.innerHTML = `<audio src="${dataUrl}" controls autoplay></audio>`;
    state.pendingPreview = { type, dataUrl, duration };
    const sendBtn = document.getElementById('imsgPreviewSend');
    if (sendBtn) sendBtn.onclick = () => { modal.classList.add('hidden'); const p = state.pendingPreview; if (!p) return; if (p.type === 'image') sendMessage({ type:'image', imgData:p.dataUrl }); else if (p.type === 'video') sendMessage({ type:'video', videoData:p.dataUrl }); else if (p.type === 'audio') sendMessage({ type:'audio', audioData:p.dataUrl, duration:p.duration || 1 }); state.pendingPreview = null; };
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
  }

  function pickGallery() {
    hideAttachSheet();
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*,video/*';
    input.onchange = () => { const file = input.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { if (file.type.startsWith('video/')) showPreview({ type:'video', dataUrl:reader.result }); else showPreview({ type:'image', dataUrl:reader.result }); }; reader.readAsDataURL(file); };
    input.click();
  }
  function sendLocation() { hideAttachSheet(); if (!navigator.geolocation) return toast('Unsupported', 'No geolocation', 'warn'); toast('Getting location…', '', 'info', 1500); navigator.geolocation.getCurrentPosition(p => sendMessage({ type:'location', lat:p.coords.latitude, lng:p.coords.longitude }), e => toast('Location failed', e.message, 'error')); }
  function openVoiceRecorder() { hideAttachSheet(); openAttachModal('imsgVoiceModal'); }
  function closeVoiceRecorder() { closeAttachModal('imsgVoiceModal'); if (state.voiceStream) { state.voiceStream.getTracks().forEach(t => t.stop()); state.voiceStream = null; } if (state.voiceRecorder && state.voiceRecorder.state === 'recording') state.voiceRecorder.stop(); state.voiceRecorder = null; if (state.voiceTimerInt) { clearInterval(state.voiceTimerInt); state.voiceTimerInt = null; } }
  async function startVoiceRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true }); state.voiceStream = stream; state.voiceChunks = [];
      const rec = new MediaRecorder(stream); state.voiceRecorder = rec;
      rec.ondataavailable = e => { if (e.data.size) state.voiceChunks.push(e.data); };
      rec.onstop = () => { const blob = new Blob(state.voiceChunks, { type:'audio/webm' }); const reader = new FileReader(); reader.onload = () => showPreview({ type:'audio', dataUrl:reader.result, duration:(Date.now() - state.voiceStartTime) / 1000 }); reader.readAsDataURL(blob); };
      rec.start(); state.voiceStartTime = Date.now();
      state.voiceTimerInt = setInterval(() => { const s = Math.floor((Date.now() - state.voiceStartTime) / 1000); const t = document.getElementById('imsgVoiceTimer'); if (t) t.textContent = `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; if (s >= 120) stopVoiceRecording(); }, 200);
    } catch (e) { toast('Mic denied', e.message, 'error'); }
  }
  function stopVoiceRecording() { if (state.voiceRecorder && state.voiceRecorder.state === 'recording') state.voiceRecorder.stop(); if (state.voiceTimerInt) { clearInterval(state.voiceTimerInt); state.voiceTimerInt = null; } if (state.voiceStream) { state.voiceStream.getTracks().forEach(t => t.stop()); state.voiceStream = null; } closeAttachModal('imsgVoiceModal'); }
  function getBalance() { try { return parseFloat(localStorage.getItem('sb26_balance_' + ME.username) || '1250.00'); } catch (e) { return 1250; } }
  function setBalance(v) { localStorage.setItem('sb26_balance_' + ME.username, v.toFixed(2)); }
  function updatePayDisplay() { const amt = parseFloat(state.payAmount || '0'); const a = document.getElementById('imsgPayAmount'); if (a) a.textContent = amt.toFixed(2); const ca = document.getElementById('imsgPayConfirmAmt'); if (ca) ca.textContent = '$' + amt.toFixed(2); const c = document.getElementById('imsgPayConfirm'); if (c) c.disabled = amt <= 0; }
  function openPaySheet() { hideAttachSheet(); state.payAmount = '0'; const n = document.getElementById('imsgPayName'); if (n) n.textContent = state.chatUser || 'User'; const b = document.getElementById('imsgPayBalance'); if (b) b.textContent = '$' + getBalance().toFixed(2); updatePayDisplay(); openAttachModal('imsgPayModal'); }
  function wirePaySheet() {
    const modal = document.getElementById('imsgPayModal'); if (!modal || modal.dataset.wired === '1') return; modal.dataset.wired = '1';
    modal.querySelectorAll('.imsg-pay-keypad button').forEach(btn => { btn.onclick = () => { const key = btn.dataset.key; if (key === 'del') state.payAmount = state.payAmount.slice(0, -1) || '0'; else if (key === '.') { if (!state.payAmount.includes('.')) state.payAmount += '.'; } else { if (state.payAmount === '0') state.payAmount = key; else if ((state.payAmount.split('.')[1] || '').length < 2) state.payAmount += key; } updatePayDisplay(); }; });
    document.getElementById('imsgPayCancel')?.addEventListener('click', () => closeAttachModal('imsgPayModal'));
    document.getElementById('imsgPayConfirm')?.addEventListener('click', () => { const amt = parseFloat(state.payAmount); if (amt <= 0) return; const bal = getBalance(); if (amt > bal) return toast('Declined', 'Insufficient balance', 'error'); setBalance(bal - amt); sendMessage({ type:'pay', amount:amt.toFixed(2), note:'Payment' }); closeAttachModal('imsgPayModal'); toast('Payment sent', '$' + amt.toFixed(2), 'success'); });
    modal.addEventListener('click', e => { if (e.target === modal) closeAttachModal('imsgPayModal'); });
  }
  function openDigitalTouch() {
    hideAttachSheet();
    const modal = openAttachModal('imsgDigitalModal'); if (!modal) return;
    const canvas = document.getElementById('imsgDigitalCanvas'); if (!canvas || canvas.dataset.wired === '1') return; canvas.dataset.wired = '1';
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.strokeStyle = '#ff66ff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    let drawing = false, lastX = 0, lastY = 0;
    const getPos = (e) => { const r = canvas.getBoundingClientRect(); const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left; const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top; return { x: x * canvas.width / r.width, y: y * canvas.height / r.height }; };
    const start = (e) => { e.preventDefault(); drawing = true; const p = getPos(e); lastX = p.x; lastY = p.y; };
    const move = (e) => { if (!drawing) return; e.preventDefault(); const p = getPos(e); ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke(); lastX = p.x; lastY = p.y; };
    const end = (e) => { e.preventDefault(); drawing = false; };
    canvas.onmousedown = start; canvas.onmousemove = move; canvas.onmouseup = end;
    canvas.ontouchstart = start; canvas.ontouchmove = move; canvas.ontouchend = end;
    document.getElementById('imsgDigitalSend')?.addEventListener('click', () => { sendMessage({ type:'digital', stroke:'draw', dataUrl:canvas.toDataURL() }); closeAttachModal('imsgDigitalModal'); toast('Digital Touch sent', '', 'success'); });
    document.getElementById('imsgDigitalCancel')?.addEventListener('click', () => closeAttachModal('imsgDigitalModal'));
    document.getElementById('imsgDigitalCancelBtn')?.addEventListener('click', () => closeAttachModal('imsgDigitalModal'));
    modal.addEventListener('click', e => { if (e.target === modal) closeAttachModal('imsgDigitalModal'); });
  }
  function openStickers() {
    hideAttachSheet();
    const modal = openAttachModal('imsgStickerModal'); const grid = document.getElementById('imsgStickerGrid'); if (!modal || !grid) return;
    const stickers = ['😀','😂','🥰','😎','🤔','😴','🥳','😭','🤯','🤩','😇','🥺','😤','🤗','😋','🐝','🔥','💯','✨','🎉','❤️','💔','👍','👎','🙏','💪','🤝','🌟','⚡','💎'];
    grid.innerHTML = stickers.map(s => `<button class="imsg-sticker-btn" data-sticker="${s}">${s}</button>`).join('');
    grid.querySelectorAll('[data-sticker]').forEach(btn => { btn.onclick = () => { sendMessage({ type:'sticker', emoji:btn.dataset.sticker }); closeAttachModal('imsgStickerModal'); toast('Sticker sent', '', 'success'); }; });
    document.getElementById('imsgStickerCancel')?.addEventListener('click', () => closeAttachModal('imsgStickerModal'));
    modal.addEventListener('click', e => { if (e.target === modal) closeAttachModal('imsgStickerModal'); });
  }
  function openEffects() {
    hideAttachSheet();
    const modal = openAttachModal('imsgEffectsModal'); const grid = document.getElementById('imsgEffectsGrid'); if (!modal || !grid) return;
    const effects = [
      { id:'slam', name:'Slam', ico:'💥', desc:'Drops hard' }, { id:'loud', name:'Loud', ico:'🔊', desc:'Shakes screen' },
      { id:'gentle', name:'Gentle', ico:'🌸', desc:'Soft fade' }, { id:'confetti', name:'Confetti', ico:'🎉', desc:'Falls down' },
      { id:'fireworks', name:'Fireworks', ico:'🎆', desc:'Bursts' }, { id:'balloons', name:'Balloons', ico:'🎈', desc:'Float up' },
    ];
    grid.innerHTML = effects.map(e => `<button class="imsg-effects-btn" data-effect="${e.id}"><span class="imsg-effects-emoji">${e.ico}</span><span class="imsg-effects-name">${e.name}</span><span class="imsg-effects-desc">${e.desc}</span></button>`).join('');
    grid.querySelectorAll('[data-effect]').forEach(btn => { btn.onclick = () => { state.pendingEffect = btn.dataset.effect; closeAttachModal('imsgEffectsModal'); toast('Effect selected', btn.dataset.effect, 'success', 1500); document.getElementById('imsgInput')?.focus(); }; });
    document.getElementById('imsgEffectsCancel')?.addEventListener('click', () => closeAttachModal('imsgEffectsModal'));
    modal.addEventListener('click', e => { if (e.target === modal) closeAttachModal('imsgEffectsModal'); });
  }

  /* ============================================================
     v83 — Contact screen
     ============================================================ */
  let contactOverlay = null;
  function openContactScreen(username) {
    if (!username || username.startsWith('__hooklog__')) return;
    const users = Auth.getUsers(); const u = users[username]; if (!u) return;
    const online = isUserOnline(username);
    const blocked = window.SBBlocks ? SBBlocks.isBlocked(ME.username, username) : false;
    const blockedMe = window.SBBlocks ? SBBlocks.isBlocked(username, ME.username) : false;
    const muted = state.mutedUsers.has(username); const pinned = state.pinnedUsers.has(username);
    const msgs = threadWith(username); const msgCount = msgs.length; const lastMsg = msgs[msgs.length - 1];
    const joined = u.createdAt ? new Date(u.createdAt).toLocaleDateString([], { month:'long', year:'numeric' }) : 'unknown';
    const bio = (u.bio || '').trim();
    contactOverlay?.remove();
    contactOverlay = document.createElement('div');
    contactOverlay.className = 'sb-contact-overlay';
    contactOverlay.innerHTML = `
      <div class="sb-contact-sheet" role="dialog" aria-modal="true">
        <button class="sb-contact-close" aria-label="Close" type="button">×</button>
        <div class="sb-contact-hero">
          <div class="sb-contact-hero-bg" style="background:radial-gradient(ellipse at center, ${u.color||'#4d9dff'}33, transparent 70%)"></div>
          <div class="sb-contact-avatar" style="background:${u.color||'#4d9dff'}">${esc(u.avatar || (u.username||'??').slice(0,2).toUpperCase())}${online ? '<span class="sb-contact-online"></span>' : ''}</div>
          <div class="sb-contact-name">${esc(u.display || username)} ${window.roleBadgeFor ? roleBadgeFor(username) : ''}</div>
          <div class="sb-contact-username">@${esc(username)}</div>
          <div class="sb-contact-status ${online ? 'online' : 'offline'}"><span class="sb-contact-status-dot"></span>${online ? 'Online now' : 'Offline'}</div>
          ${blockedMe ? `<div class="sb-contact-blocked-me">This user has blocked you</div>` : ''}
        </div>
        ${bio ? `<div class="sb-contact-bio">${esc(bio)}</div>` : ''}
        <div class="sb-contact-stats">
          <div class="sb-contact-stat"><div class="sb-contact-stat-val">${msgCount}</div><div class="sb-contact-stat-label">Messages</div></div>
          <div class="sb-contact-stat"><div class="sb-contact-stat-val">${joined}</div><div class="sb-contact-stat-label">Member since</div></div>
          <div class="sb-contact-stat"><div class="sb-contact-stat-val">${lastMsg ? formatTimeShort(lastMsg.ts) : '—'}</div><div class="sb-contact-stat-label">Last message</div></div>
        </div>
        <div class="sb-contact-actions">
          <button type="button" class="sb-contact-action primary" data-c-act="message"><span class="sb-contact-action-ico">💬</span><span>Message</span></button>
          <button type="button" class="sb-contact-action" data-c-act="mute"><span class="sb-contact-action-ico">${muted ? '🔔' : '🔇'}</span><span>${muted ? 'Unmute' : 'Mute'}</span></button>
          <button type="button" class="sb-contact-action" data-c-act="pin"><span class="sb-contact-action-ico">📌</span><span>${pinned ? 'Unpin' : 'Pin'}</span></button>
          <button type="button" class="sb-contact-action" data-c-act="mark-read"><span class="sb-contact-action-ico">✅</span><span>Mark read</span></button>
        </div>
        <div class="sb-contact-actions">
          <button type="button" class="sb-contact-action danger" data-c-act="${blocked ? 'unblock' : 'block'}"><span class="sb-contact-action-ico">${blocked ? '🔓' : '🚫'}</span><span>${blocked ? 'Unblock' : 'Block'}</span></button>
          <button type="button" class="sb-contact-action danger" data-c-act="report"><span class="sb-contact-action-ico">🚩</span><span>Report</span></button>
          <button type="button" class="sb-contact-action danger" data-c-act="clear-chat"><span class="sb-contact-action-ico">🗑️</span><span>Clear chat</span></button>
          ${window.AM_PRIVILEGED ? `<button type="button" class="sb-contact-action purple" data-c-act="moderate"><span class="sb-contact-action-ico">🛡️</span><span>Moderate</span></button>` : ''}
        </div>
        ${blocked ? `<div class="sb-contact-note">You blocked this user. They can't message you, and their messages are hidden.</div>` : ''}
      </div>`;
    document.body.appendChild(contactOverlay);
    const close = () => { contactOverlay?.classList.add('closing'); setTimeout(() => { contactOverlay?.remove(); contactOverlay = null; }, 180); };
    contactOverlay.querySelector('.sb-contact-close').onclick = close;
    contactOverlay.addEventListener('click', e => { if (e.target === contactOverlay) close(); });
    contactOverlay.querySelectorAll('[data-c-act]').forEach(btn => {
      btn.onclick = async () => {
        const act = btn.dataset.cAct;
        if (act === 'message') { close(); openConversation(username); }
        else if (act === 'mute') { if (state.mutedUsers.has(username)) state.mutedUsers.delete(username); else state.mutedUsers.add(username); saveUserPrefs(); computeUnread(); renderConversationList(); close(); }
        else if (act === 'pin') { if (state.pinnedUsers.has(username)) state.pinnedUsers.delete(username); else state.pinnedUsers.add(username); saveUserPrefs(); renderConversationList(); close(); }
        else if (act === 'mark-read') { const all = threadWith(username); let changed = false; const now = Date.now(); const sendReceipts = !(window.settings && window.settings.readReceipts === false); all.forEach(m => { if (m.from === username && m.to === ME.username && !m.readAt) { m.readAt = now; changed = true; if (sendReceipts) window.appChannel?.postMessage({ type: 'chat-seen', id: m.id, from: ME.username, to: username, ts: now }); } }); if (changed) { savePairMsgs(ME.username, username, all); computeUnread(); } close(); }
        else if (act === 'block') { const ok = await sbConfirm({ icon:'🚫', title:`Block @${username}?`, message:'You won\'t receive messages from this user. They won\'t be notified.', confirmText:'Block', confirmClass:'danger' }); if (!ok) return; SBBlocks.block(ME.username, username); if (state.chatUser === username) state.chatUser = null; renderConversationList(); document.getElementById('imsgThreadPanel')?.classList.remove('mobile-active'); document.getElementById('imsgEmpty')?.classList.remove('hidden'); document.getElementById('imsgThread')?.classList.add('hidden'); toast('Blocked', `@${username}`, 'success'); close(); }
        else if (act === 'unblock') { SBBlocks.unblock(ME.username, username); toast('Unblocked', `@${username}`, 'success'); renderConversationList(); close(); }
        else if (act === 'report') { close(); showReportDialog(username, ''); }
        else if (act === 'clear-chat') { const ok = await sbConfirm({ icon:'🗑️', title:'Clear this conversation?', message:'All messages with this user will be permanently deleted on your side.', confirmText:'Clear chat', confirmClass:'danger' }); if (!ok) return; try { localStorage.removeItem(pairKey(ME.username, username)); } catch (e) {} try { document.getElementById('imsgMessages').innerHTML = ''; } catch (e) {} renderConversationList(); toast('Chat cleared', '', 'success'); close(); }
        else if (act === 'moderate') { close(); try { closeChat(); window.openModPanel && window.openModPanel(); } catch (e) {} }
      };
    });
  }
  window.openContactScreen = openContactScreen;

  window.openChat = openChat;
  window.closeChat = closeChat;
  window.openConversation = openConversation;
  window.openHookLog = openHookLog;
  window.threadWith = threadWith;
  window.startReplyTo = startReply;
  window.clearReplyBar = clearReplyBar;
}