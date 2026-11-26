/* ==========================================================================
   SafeBeef v83 — Mod panel dialogs
   Fixed: mpGetUsers precedence, sbPrompt object return, back-button semantics,
   wrong-target device bans, listener leaks in extend dialogs
   ========================================================================== */
'use strict';

if (!window.__sb_mod_dialogs_v83) {
  window.__sb_mod_dialogs_v83 = true;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const mpMountDialog = window.mpMountDialog;
  const mpDurationPicker = window.mpDurationPicker;
  const mpRead = window.mpRead;
  const mpWrite = window.mpWrite;
  const mpToast = window.mpToast;
  const mpLogAction = window.mpLogAction;
  const mpFmtDur = window.mpFmtDur;

  function safeGetUser(username) {
    try {
      const all = (window.mpGetUsers ? window.mpGetUsers() : (window.Auth && Auth.getUsers ? Auth.getUsers() : {})) || {};
      return all[username] || null;
    } catch (e) { return null; }
  }
  function safeAllUsers() {
    try {
      return (window.mpGetUsers ? window.mpGetUsers() : (window.Auth && Auth.getUsers ? Auth.getUsers() : {})) || {};
    } catch (e) { return {}; }
  }

  function sbText(result) {
    if (result == null) return null;
    if (typeof result === 'string') return result;
    if (typeof result === 'number') return String(result);
    if (typeof result === 'object') {
      if (result.cancelled || result.canceled || result.ok === false) return null;
      if (typeof result.value === 'string') return result.value;
      if (typeof result.text === 'string') return result.text;
      if (typeof result.reason === 'string') return result.reason;
      if (typeof result.msg === 'string') return result.msg;
      try { return JSON.stringify(result); } catch (e) { return null; }
    }
    return String(result);
  }
  async function promptText(opts) {
    try { return sbText(await sbPrompt(opts)); }
    catch (e) { return null; }
  }
  async function chooseValue(opts) {
    try { return sbText(await sbChoose(opts)); }
    catch (e) { return null; }
  }

  const BACK_BTN = `<button type="button" data-act="back" class="mod-dialog-back" aria-label="Back">‹</button>`;

  /* ============ APPEAL DECISION ============ */
  window.openAppealDecisionDialog = function (appealIdx, action, onDone) {
    const appeals = mpRead('sb26_appeals', []);
    const appeal = appeals[appealIdx];
    if (!appeal) return mpToast({ title:'Not found', msg:'Appeal no longer exists', type:'warn' });
    if (appeal.status !== 'pending') return mpToast({ title:'Already resolved', msg:'This appeal is ' + appeal.status, type:'warn' });
    const isApprove = action === 'approve';
    const ico = isApprove ? '✓' : '✕';
    const cls = isApprove ? 'success' : 'danger';
    const title = isApprove ? 'Approve Appeal' : 'Deny Appeal';
    const defaultReason = isApprove ? 'Appeal accepted. Ban lifted.' : 'Appeal denied.';
    const btnColor = isApprove ? 'var(--green)' : 'var(--red)';
    const btnTextColor = isApprove ? '#000' : '#fff';
    const btnLabel = isApprove ? 'Approve & Unban' : 'Deny Appeal';
    const { overlay, close } = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head">
          <div class="mod-dialog-ico ${cls}">${ico}</div>
          <div class="mod-dialog-title"><h3>${title}</h3><div class="mod-dialog-sub">@${esc(appeal.username)} · submitted ${new Date(appeal.at).toLocaleString()}</div></div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">
          <div class="mod-dialog-label">User's appeal</div>
          <div style="padding:12px 14px;background:var(--surface-2);border:1px solid var(--border-2);border-radius:9px;font-size:12px;color:var(--text-2);line-height:1.55;max-height:160px;overflow-y:auto;white-space:pre-wrap">${esc(appeal.reason || '—')}</div>
          <div class="mod-dialog-label">${isApprove ? 'Approval message' : 'Denial reason'} (shown to user)</div>
          <textarea id="appealDecisionReason" class="mod-dialog-textarea" placeholder="${defaultReason}" style="min-height:90px">${esc(defaultReason)}</textarea>
        </div>
        <div class="mod-dialog-foot">
          <button class="btn" data-act="cancel" type="button">Cancel</button>
          <button class="btn" data-act="confirm" type="button" style="background:${btnColor};color:${btnTextColor};border-color:${btnColor};font-weight:800">${btnLabel}</button>
        </div>
      </div>`);
    overlay.querySelector('[data-act="confirm"]').onclick = () => {
      const reason = (overlay.querySelector('#appealDecisionReason').value || '').trim();
      if (!reason) return mpToast({ title:'Reason required', msg:'Enter a message for the user', type:'warn' });
      const fresh = mpRead('sb26_appeals', []);
      const target = fresh[appealIdx];
      if (!target || target.status !== 'pending') return mpToast({ title:'Stale', msg:'Appeal already resolved', type:'warn' });
      const now = Date.now();
      target.status = isApprove ? 'approved' : 'denied';
      target.decidedAt = now; target.decidedAtISO = new Date(now).toISOString(); target.decidedAtLocal = new Date(now).toLocaleString();
      target.decidedBy = ME.username; target.decisionReason = reason;
      mpWrite('sb26_appeals', fresh);
      if (isApprove) {
        try { Auth.unbanUser(target.username); } catch (e) {}
        window.RT?.banCleared?.(target.username);
        mpLogAction('appeal-approve', target.username, { reason });
        mpToast({ title:'✓ Approved', msg:`@${target.username} unbanned`, type:'success', dur:5000 });
      } else {
        mpLogAction('appeal-deny', target.username, { reason });
        mpToast({ title:'✕ Denied', msg:`Reason saved`, type:'warn', dur:5000 });
      }
      try { window.SafeBeef?.appChannel?.postMessage({ type: 'appeal-updated' }); } catch (e) {}
      close(); onDone?.();
    };
  };

  /* ============ MAINTENANCE MODE ============ */
  window.openMaintenanceDialog = function (onDone) {
    if (!window.AM_PRIVILEGED) return mpToast({ title:'Forbidden', msg:'Moderator required', type:'error' });
    if (!window.SB_Maintenance) return mpToast({ title:'Unavailable', msg:'Maintenance module not loaded', type:'error' });
    const current = SB_Maintenance.get();
    const isOn = !!current.enabled;
    const startedStr = current.startedAt ? new Date(current.startedAt).toLocaleString() : '—';
    const etaStr = current.until && current.until > Date.now()
      ? `${new Date(current.until).toLocaleString()} (${Math.max(1, Math.ceil((current.until - Date.now()) / 60000))} min remaining)`
      : (current.until ? 'Passed' : 'No ETA');

    const { overlay, close } = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true" style="max-width:600px">
        <div class="mod-dialog-head">
          <div class="mod-dialog-ico ${isOn ? 'danger' : 'accent'}">🚧</div>
          <div class="mod-dialog-title">
            <h3>${isOn ? 'Maintenance Mode — ON' : 'Enable Maintenance Mode'}</h3>
            <div class="mod-dialog-sub">${isOn ? 'Site is currently OFFLINE for regular users' : 'Bring the site offline for everyone except staff'}</div>
          </div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">
          ${isOn ? `
            <div class="mod-dialog-warning danger">
              <strong>⚠ Site is currently OFFLINE</strong><br>
              Non-staff users see the maintenance page.
            </div>
            <div class="mod-ipbans-info" style="margin:0;display:flex;flex-direction:column;gap:8px">
              <div class="mod-ipbans-info-row"><span class="mod-ipbans-info-label">Message</span><span class="mod-ipbans-info-val" style="font-family:var(--sans);font-size:11.5px;white-space:pre-wrap;text-align:left">${esc(current.message || '—')}</span></div>
              <div class="mod-ipbans-info-row"><span class="mod-ipbans-info-label">Started</span><code class="mod-ipbans-info-val">${esc(startedStr)}</code></div>
              <div class="mod-ipbans-info-row"><span class="mod-ipbans-info-label">By</span><code class="mod-ipbans-info-val">@${esc(current.by || 'system')}</code></div>
              <div class="mod-ipbans-info-row"><span class="mod-ipbans-info-label">ETA</span><code class="mod-ipbans-info-val">${esc(etaStr)}</code></div>
            </div>
            <div class="mod-dialog-label">👀 What users see right now</div>
            <div style="padding:14px 16px;background:var(--bg);border:1px solid var(--border-2);border-radius:10px;line-height:1.55">
              <div style="font-size:20px;margin-bottom:6px">🚧</div>
              <div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:4px">SafeBeef is under maintenance</div>
              <div style="font-size:12px;color:var(--text-2);white-space:pre-wrap">${esc(current.message || "We'll be back soon.")}</div>
              ${current.until && current.until > Date.now() ? `<div style="font-size:11px;color:var(--text-3);margin-top:8px;font-family:var(--mono)">Expected back: ${esc(new Date(current.until).toLocaleString())}</div>` : ''}
            </div>
          ` : `
            <div class="mod-dialog-warning info">Non-staff users will be redirected to the maintenance page. Staff continue to have access.</div>
            <div class="mod-dialog-label">Maintenance message (shown to users)</div>
            <textarea id="maintMsgInput" class="mod-dialog-textarea" style="min-height:80px" placeholder="SafeBeef is under maintenance…">${esc(current.message || "SafeBeef is under maintenance. We'll be back soon.")}</textarea>
            <div class="mod-dialog-label">Estimated return (optional)</div>
            <select id="maintEtaInput" class="mod-dialog-input">
              <option value="0">Unknown</option>
              <option value="5">~5 minutes</option>
              <option value="15">~15 minutes</option>
              <option value="30">~30 minutes</option>
              <option value="60">~1 hour</option>
              <option value="120">~2 hours</option>
              <option value="240">~4 hours</option>
            </select>
            <div class="mod-dialog-label">👀 User preview</div>
            <div style="padding:14px 16px;background:var(--bg);border:1px solid var(--border-2);border-radius:10px;line-height:1.55">
              <div style="font-size:20px;margin-bottom:6px">🚧</div>
              <div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:4px">SafeBeef is under maintenance</div>
              <div id="maintPreviewMsg" style="font-size:12px;color:var(--text-2);white-space:pre-wrap">${esc(current.message || "We'll be back soon.")}</div>
              <div id="maintPreviewEta" style="font-size:11px;color:var(--text-3);margin-top:8px;font-family:var(--mono);display:none"></div>
            </div>
          `}
        </div>
        <div class="mod-dialog-foot">
          <button class="btn" data-act="cancel" type="button">Cancel</button>
          <button class="btn ${isOn ? 'primary' : 'danger'}" data-act="confirm" type="button" style="font-weight:800">
            ${isOn ? '🟢 Bring Back Online' : '🔴 Enable Maintenance'}
          </button>
        </div>
      </div>`);

    if (!isOn) {
      const msgEl = overlay.querySelector('#maintMsgInput');
      const etaEl = overlay.querySelector('#maintEtaInput');
      const prevMsg = overlay.querySelector('#maintPreviewMsg');
      const prevEta = overlay.querySelector('#maintPreviewEta');
      msgEl.oninput = () => { prevMsg.textContent = msgEl.value || "We'll be back soon."; };
      etaEl.onchange = () => {
        const m = parseInt(etaEl.value, 10);
        if (m > 0) { prevEta.style.display = 'block'; prevEta.textContent = 'Expected back: ' + new Date(Date.now() + m * 60000).toLocaleString(); }
        else prevEta.style.display = 'none';
      };
    }

    overlay.querySelector('[data-act="confirm"]').onclick = () => {
      if (isOn) {
        SB_Maintenance.disable();
        mpLogAction('maintenance-off', '(all)', {});
        mpToast({ title: 'Maintenance disabled', msg: 'Site is back online', type: 'success' });
        try { window.Live?.emit?.('maintenance'); } catch (e) {}
        close(); onDone?.();
      } else {
        const msg = (overlay.querySelector('#maintMsgInput').value || '').trim();
        if (!msg) return mpToast({ title:'Message required', msg:'Enter a maintenance message', type:'warn' });
        const etaMin = parseInt(overlay.querySelector('#maintEtaInput').value, 10) || 0;
        const until = etaMin > 0 ? Date.now() + etaMin * 60000 : null;
        SB_Maintenance.enable({ message: msg, by: ME.username, until });
        mpLogAction('maintenance-on', '(all)', { reason: msg });
        mpToast({ title: 'Maintenance enabled', msg: 'Site is offline for users', type: 'success' });
        try { window.Live?.emit?.('maintenance'); } catch (e) {}
        close(); onDone?.();
      }
    };
  };

  /* ============ BAN USERNAME ============ */
  window.openBanUsernameDialog = function (username, onDone, onBack) {
    const user = safeGetUser(username);
    if (!user) return mpToast({ title:'User not found', msg:`@${username} no longer exists`, type:'error' });
    const settings = mpRead('sb26_mod_settings', { requireReason: true, defaultBanDuration: '1d' });
    const durations = [
      { key:'1h', label:'1 hour' }, { key:'6h', label:'6 hours' }, { key:'12h', label:'12 hours' },
      { key:'1d', label:'1 day' }, { key:'3d', label:'3 days' }, { key:'7d', label:'7 days' },
      { key:'30d', label:'30 days' }, { key:'perm', label:'Permanent', desc:'Manual unban required' },
    ];
    let selected = settings.defaultBanDuration || '1d';
    const { overlay, close } = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head">
          ${onBack ? BACK_BTN : ''}
          <div class="mod-dialog-ico danger">👤</div>
          <div class="mod-dialog-title"><h3>Ban Username</h3><div class="mod-dialog-sub">@${esc(username)} · account only</div></div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">
          <div class="mod-dialog-warning info">Blocks this account only. Does not block hardware or IP.</div>
          <div class="mod-dialog-label">Duration</div><div id="mpBanUserDurationSlot"></div>
          <div class="mod-dialog-label">Reason${settings.requireReason ? ' (required)' : ''}</div>
          <textarea id="banUserReasonInput" class="mod-dialog-textarea">Rule violation</textarea>
        </div>
        <div class="mod-dialog-foot"><button class="btn" data-act="cancel" type="button">Cancel</button><button class="btn" data-act="confirm" type="button" style="background:var(--red);color:#fff;border-color:var(--red);font-weight:800">Ban Username</button></div>
      </div>`, { onBack });
    if (mpDurationPicker) overlay.querySelector('#mpBanUserDurationSlot').appendChild(mpDurationPicker(durations, selected, k => { selected = k; }));
    overlay.querySelector('[data-act="confirm"]').onclick = () => {
      const reason = (overlay.querySelector('#banUserReasonInput').value || '').trim();
      if (settings.requireReason && !reason) return mpToast({ title:'Reason required', msg:'Enter a reason', type:'warn' });
      try { Auth.banUser(username, reason || 'Rule violation', selected, { automated:false }); } catch (e) {}
      mpLogAction('ban-username', username, { reason });
      mpToast({ title:'Username banned', msg:`@${username}`, type:'error' });
      close(); onDone?.();
    };
  };

  /* ============ BAN HARDWARE ============ */
  window.openBanHardwareDialog = function (username, onDone, onBack) {
    if (!window.IPBan) return mpToast({ title:'Unavailable', msg:'IP ban module not loaded', type:'error' });
    const settings = mpRead('sb26_mod_settings', { requireReason: true });
    const devices = window.IPBan.lookupAll ? window.IPBan.lookupAll(username) : [];
    const selfFP = window.IPBan.getFingerprintSync();
    if (!devices.length) return mpToast({ title:'No devices', msg:'No registered device for this user', type:'warn' });
    let selectedFP = devices[0].fp;
    const devicesListHtml = devices.map((d, i) => {
      const age = Math.floor((Date.now() - (d.lastSeen || 0)) / 60000);
      const ageStr = age < 60 ? `${age}m ago` : age < 1440 ? `${Math.floor(age/60)}h ago` : `${Math.floor(age/1440)}d ago`;
      const devIsSelf = d.fp === selfFP;
      return `<button type="button" data-dev-fp="${esc(d.fp)}" class="mp-duration-btn ${i===0?'on':''}" style="text-align:left;flex-direction:row;align-items:center;gap:8px"><span style="font-size:15px">${devIsSelf ? '⚠' : '📱'}</span><div style="flex:1;min-width:0"><div style="font-size:11.5px;font-weight:800;font-family:var(--mono)">${esc((d.fp||'').slice(0,20))}…</div><div style="font-size:10px;color:var(--text-3)">${esc(d.ip || '—')} · ${ageStr}${devIsSelf ? ' · YOURS' : ''}</div></div></button>`;
    }).join('');
    const durations = [
      { key:'1h', label:'1 hour' }, { key:'6h', label:'6 hours' }, { key:'1d', label:'1 day' },
      { key:'3d', label:'3 days' }, { key:'7d', label:'7 days' }, { key:'30d', label:'30 days' },
      { key:'perm', label:'Permanent', desc:'Manual unban required' },
    ];
    let selectedDur = 'perm';
    const { overlay, close } = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head">
          ${onBack ? BACK_BTN : ''}
          <div class="mod-dialog-ico purple">🔑</div>
          <div class="mod-dialog-title"><h3>Ban Hardware Only</h3><div class="mod-dialog-sub">@${esc(username)} · device fingerprint</div></div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">
          <div class="mod-dialog-warning purple"><strong>Survives IP changes and VPNs.</strong> Blocks by hardware fingerprint.</div>
          <div class="mod-dialog-label">Device to ban (${devices.length})</div><div class="mp-duration" id="mpHWBanDevList">${devicesListHtml}</div>
          <div class="mod-dialog-label">Duration</div><div id="mpHWBanDurationSlot"></div>
          <div class="mod-dialog-label">Reason${settings.requireReason ? ' (required)' : ''}</div>
          <textarea id="banHWReasonInput" class="mod-dialog-textarea">Hardware ban</textarea>
        </div>
        <div class="mod-dialog-foot"><button class="btn" data-act="cancel" type="button">Cancel</button><button class="btn" data-act="confirm" type="button" style="background:var(--purple);color:#fff;border-color:var(--purple);font-weight:800">Ban Hardware</button></div>
      </div>`, { onBack });
    if (mpDurationPicker) overlay.querySelector('#mpHWBanDurationSlot').appendChild(mpDurationPicker(durations, selectedDur, k => { selectedDur = k; }));
    overlay.querySelectorAll('[data-dev-fp]').forEach(btn => { btn.onclick = () => { selectedFP = btn.dataset.devFp; overlay.querySelectorAll('[data-dev-fp]').forEach(b => b.classList.toggle('on', b.dataset.devFp === selectedFP)); }; });
    overlay.querySelector('[data-act="confirm"]').onclick = () => {
      const reason = (overlay.querySelector('#banHWReasonInput').value || '').trim();
      if (settings.requireReason && !reason) return mpToast({ title:'Reason required', msg:'Enter a reason', type:'warn' });
      const isSelf = selectedFP === selfFP;
      if (isSelf && !confirm('Ban YOUR own device? You will lose access immediately.')) return;
      const res = window.IPBan.banByFingerprint(selectedFP, { reason: reason || 'Hardware ban', duration: selectedDur, bannedBy: ME.username, force: isSelf });
      if (res && res.error) return mpToast({ title:'Cannot ban', msg:res.error, type:'error' });
      mpLogAction('hw-ban', username, { reason, fingerprint: selectedFP });
      mpToast({ title:'Hardware banned', msg:`@${username}`, type:'success' });
      close(); onDone?.();
    };
  };

  /* ============ BAN ALL DEVICES ============ */
  window.openBanAllDevicesDialog = function (username, onDone, onBack) {
    if (!window.IPBan) return mpToast({ title:'Unavailable', msg:'IP ban module not loaded', type:'error' });
    const settings = mpRead('sb26_mod_settings', { requireReason: true });
    const devices = window.IPBan.lookupAll ? window.IPBan.lookupAll(username) : [];
    if (!devices.length) return mpToast({ title:'No devices', msg:'No registered devices', type:'warn' });
    const durations = [
      { key:'1h', label:'1 hour' }, { key:'1d', label:'1 day' }, { key:'3d', label:'3 days' },
      { key:'7d', label:'7 days' }, { key:'30d', label:'30 days' },
      { key:'perm', label:'Permanent', desc:'Manual unban required' },
    ];
    let selected = 'perm';
    const { overlay, close } = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head">
          ${onBack ? BACK_BTN : ''}
          <div class="mod-dialog-ico danger">🛑</div>
          <div class="mod-dialog-title"><h3>Ban ALL Devices</h3><div class="mod-dialog-sub">@${esc(username)} · ${devices.length} device${devices.length===1?'':'s'}</div></div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">
          <div class="mod-dialog-warning danger"><strong>All ${devices.length} device${devices.length===1?'':'s'} will be blocked.</strong></div>
          <div class="mod-dialog-label">Devices that will be banned</div>
          <div style="display:flex;flex-direction:column;gap:4px;max-height:180px;overflow-y:auto;padding:8px;background:var(--surface-2);border:1px solid var(--border-2);border-radius:9px">${devices.map(d => `<div style="padding:6px 8px;font-size:11px;font-family:var(--mono);color:var(--text-2)">🌐 ${esc(d.ip||'—')} · 🔑 ${esc((d.fp||'').slice(0,14))}…</div>`).join('')}</div>
          <div class="mod-dialog-label">Duration</div><div id="mpBanAllDurationSlot"></div>
          <div class="mod-dialog-label">Reason${settings.requireReason ? ' (required)' : ''}</div>
          <textarea id="banAllReasonInput" class="mod-dialog-textarea">Ban evasion / alt-account abuse</textarea>
        </div>
        <div class="mod-dialog-foot"><button class="btn" data-act="cancel" type="button">Cancel</button><button class="btn" data-act="confirm" type="button" style="background:var(--red);color:#fff;border-color:var(--red);font-weight:800">Ban All ${devices.length} Devices</button></div>
      </div>`, { onBack });
    if (mpDurationPicker) overlay.querySelector('#mpBanAllDurationSlot').appendChild(mpDurationPicker(durations, selected, k => { selected = k; }));
    overlay.querySelector('[data-act="confirm"]').onclick = () => {
      const reason = (overlay.querySelector('#banAllReasonInput').value || '').trim();
      if (settings.requireReason && !reason) return mpToast({ title:'Reason required', msg:'Enter a reason', type:'warn' });
      const res = window.IPBan.banByAllDevices(username, { reason: reason || 'Ban evasion', duration: selected, bannedBy: ME.username, force: false });
      if (res && res.error) return mpToast({ title:'Cannot ban', msg:res.error, type:'error' });
      mpLogAction('hw-ban-all', username, { reason, count: res.count });
      mpToast({ title:'All devices banned', msg:`${res.count}/${res.total}`, type:'success' });
      close(); onDone?.();
    };
  };

  /* ============ MOD DM ============ */
  window.openModDMDialog = function (username, onBack) {
    const user = safeGetUser(username);
    if (!user) return mpToast({ title:'User not found', msg:`@${username} no longer exists`, type:'error' });
    const { overlay, close } = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head">
          ${onBack ? BACK_BTN : ''}
          <div class="mod-dialog-ico accent">💌</div>
          <div class="mod-dialog-title"><h3>Moderator DM</h3><div class="mod-dialog-sub">@${esc(username)}</div></div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">
          <div class="mod-dialog-warning info">Sent with the MOD badge attached.</div>
          <div class="mod-dialog-label">Message</div>
          <textarea id="modDMText" class="mod-dialog-textarea" style="min-height:100px" placeholder="Type your message…"></textarea>
        </div>
        <div class="mod-dialog-foot"><button class="btn" data-act="cancel" type="button">Cancel</button><button class="btn primary" data-act="send" type="button">Send as Moderator</button></div>
      </div>`, { onBack });
    overlay.querySelector('[data-act="send"]').onclick = () => {
      const text = (overlay.querySelector('#modDMText').value || '').trim();
      if (!text) return mpToast({ title:'Empty', msg:'Type a message', type:'warn' });
      const now = Date.now();
      const msgData = { id: ME.username + '-' + now + '-' + Math.random().toString(36).slice(2, 8), from: ME.username, fromDisplay: ME.display, to: username, ts: now, sentAt: now, type: 'text', text, fromMod: true, modBadge: true };
      try { const key = 'sb26_chat_' + [ME.username, username].sort().join('__'); const msgs = JSON.parse(localStorage.getItem(key) || '[]'); msgs.push(msgData); if (msgs.length > 800) msgs.splice(0, msgs.length - 800); localStorage.setItem(key, JSON.stringify(msgs)); } catch (e) {}
      try { window.appChannel?.postMessage({ type: 'chat', data: msgData }); } catch (e) {}
      try { window.RT?.emit?.('direct-notify', { from: ME.username, to: username, msg: text.slice(0, 80) }); } catch (e) {}
      mpLogAction('mod-dm', username, { reason: text.slice(0, 100) });
      mpToast({ title:'Mod message sent', msg:'@'+username, type:'success' });
      close();
    };
  };

  /* ============ FREEZE ============ */
  window.openFreezeDialog = function (username, onDone, onBack) {
    const user = safeGetUser(username);
    if (user && (user.role === 'owner' || (user.role === 'mod' && !window.AM_OWNER))) {
      return mpToast({ title:'Forbidden', msg:'Cannot freeze privileged user', type:'error' });
    }
    const frozen = window.mpGetFrozen();
    const already = frozen[username];
    const { overlay, close } = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head">
          ${onBack ? BACK_BTN : ''}
          <div class="mod-dialog-ico purple">🧊</div>
          <div class="mod-dialog-title"><h3>${already ? 'Unfreeze User' : 'Freeze User'}</h3><div class="mod-dialog-sub">@${esc(username)}</div></div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">
          ${already ? `<div class="mod-dialog-warning purple"><strong>Currently frozen</strong><br>Reason: ${esc(already.reason || '—')}<br>Since: ${new Date(already.at).toLocaleString()}</div><div class="mod-dialog-warning">Unfreezing restores full access immediately.</div>` : `<div class="mod-dialog-warning purple"><strong>🧊 Read-only state.</strong><br>They cannot send messages or interact until unfrozen.</div><div class="mod-dialog-label">Reason (visible to user)</div><textarea id="freezeReasonInput" class="mod-dialog-textarea">Under investigation</textarea>`}
        </div>
        <div class="mod-dialog-foot"><button class="btn" data-act="cancel" type="button">Cancel</button><button class="btn" data-act="confirm" type="button" style="background:var(--purple);color:#fff;border-color:var(--purple);font-weight:800">${already ? 'Unfreeze' : 'Freeze'}</button></div>
      </div>`, { onBack });
    overlay.querySelector('[data-act="confirm"]').onclick = () => {
      const map = window.mpGetFrozen();
      if (already) {
        delete map[username]; window.mpSetFrozen(map);
        mpLogAction('unfreeze', username, { reason: 'Unfrozen by moderator' });
        window.RT?.emit?.('unfreeze', { username });
        mpToast({ title:'Unfrozen', msg:'@'+username, type:'success' });
      } else {
        const reason = (overlay.querySelector('#freezeReasonInput')?.value || '').trim() || 'Under investigation';
        map[username] = { reason, at: Date.now(), atLocal: new Date().toLocaleString(), by: ME.username };
        window.mpSetFrozen(map);
        mpLogAction('freeze', username, { reason });
        window.RT?.emit?.('freeze', { username, reason });
        mpToast({ title:'Frozen', msg:'@'+username, type:'purple' });
      }
      close(); onDone?.();
    };
  };

  /* ============ TIMELINE ============ */
  window.openTimelineDialog = function (username, onBack) {
    const bans = window.mpGetBans(); const mutes = window.mpGetMutes(); const warnings = window.mpGetWarnings();
    const frozen = window.mpGetFrozen(); const watched = window.mpGetWatched(); const slow = window.mpGetSlowMode();
    const events = [];
    (bans.history || []).filter(h => h.username === username).forEach(h => events.push({ ts: h.at, icon: h.action === 'ban' ? '🚫' : h.action === 'unban' ? '✓' : '📋', label: h.action, detail: h.reason, by: h.bannedBy || h.by }));
    (warnings[username] || []).forEach(w => events.push({ ts: w.at, icon: '⚠', label: 'warning', detail: w.reason, by: w.by }));
    Object.entries(mutes || {}).filter(([u]) => u === username).forEach(([,m]) => events.push({ ts: m.mutedAt || m.at, icon: '🔇', label: 'mute', detail: m.reason, by: m.mutedBy }));
    if (frozen[username]) events.push({ ts: frozen[username].at, icon: '🧊', label: 'freeze', detail: frozen[username].reason, by: frozen[username].by });
    if (watched[username]) events.push({ ts: watched[username].at, icon: '👁', label: 'watch', detail: watched[username].reason, by: watched[username].by });
    if (slow[username]) events.push({ ts: slow[username].since, icon: '🐢', label: 'rate-limit', detail: slow[username].seconds + 's', by: slow[username].by });
    events.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head">
          ${onBack ? BACK_BTN : ''}
          <div class="mod-dialog-ico accent">📜</div>
          <div class="mod-dialog-title"><h3>Timeline</h3><div class="mod-dialog-sub">@${esc(username)} · ${events.length} event${events.length===1?'':'s'}</div></div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">
          ${events.length === 0 ? `<div class="mod-empty-large"><div class="mod-empty-ico">📭</div><div class="mod-empty-title">No events</div><div class="mod-empty-desc">This user has no recorded mod actions.</div></div>` : `<div style="display:flex;flex-direction:column;gap:8px">${events.map(e => `<div class="mod-audit-item" style="padding:10px 12px"><div class="mod-audit-ico" style="width:30px;height:30px;font-size:14px">${e.icon}</div><div class="mod-audit-body"><div class="mod-audit-head"><span class="mod-audit-action" style="color:var(--text-2)">${esc(String(e.label||'').toUpperCase())}</span><span class="mod-audit-time">${new Date(e.ts||Date.now()).toLocaleString()}</span></div>${e.detail ? `<div class="mod-audit-detail">${esc(e.detail)}</div>` : ''}${e.by ? `<div class="mod-audit-by">by @${esc(e.by)}</div>` : ''}</div></div>`).join('')}</div>`}
        </div>
        <div class="mod-dialog-foot"><button class="btn" data-act="cancel" type="button">Close</button></div>
      </div>`, { onBack });
  };

  /* ============ PIN ============ */
  window.openPinDialog = function (username, onDone, onBack) {
    const user = safeGetUser(username);
    if (!user) return mpToast({ title:'User not found', msg:`@${username} no longer exists`, type:'error' });
    const pinKey = [ME.username, username].sort().join('|');
    const pins = window.mpGetPins();
    const existing = pins[pinKey];
    if (existing) {
      if (!confirm(`Unpin current message?\n\n"${(existing.text||'').slice(0, 80)}"`)) return;
      delete pins[pinKey]; window.mpSetPins(pins);
      mpLogAction('unpin', username, {});
      mpToast({ title:'Message unpinned', msg:'@'+username, type:'success' });
      try { window.appChannel?.postMessage({ type: 'pin-updated', key: pinKey }); } catch (e) {}
      onDone?.();
      return;
    }
    const threadKey = 'sb26_chat_' + [ME.username, username].sort().join('__');
    let msgs = [];
    try { msgs = JSON.parse(localStorage.getItem(threadKey) || '[]'); } catch (e) {}
    const recent = (Array.isArray(msgs) ? msgs : []).slice(-20).reverse().filter(m => m.type === 'text' || !m.type);
    const { overlay, close } = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head">
          ${onBack ? BACK_BTN : ''}
          <div class="mod-dialog-ico accent">📌</div>
          <div class="mod-dialog-title"><h3>Pin Message</h3><div class="mod-dialog-sub">@${esc(username)}</div></div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">${recent.length === 0 ? `<div class="mod-empty">No text messages yet.</div>` : `<div class="mod-dialog-label">Select a message</div><div style="display:flex;flex-direction:column;gap:6px;max-height:320px;overflow-y:auto">${recent.map((m, i) => `<button data-pin-idx="${i}" type="button" style="padding:10px 12px;background:var(--surface-2);border:1px solid var(--border-2);border-radius:9px;text-align:left;color:var(--text);font-family:inherit;cursor:pointer;width:100%"><div style="font-size:10.5px;color:var(--text-3);font-family:var(--mono);margin-bottom:3px">${esc(m.from === ME.username ? 'You' : m.from)} · ${new Date(m.ts).toLocaleString()}</div><div style="font-size:12px;color:var(--text-2);word-break:break-word">${esc((m.text || '').slice(0, 160))}</div></button>`).join('')}</div>`}</div>
        <div class="mod-dialog-foot"><button class="btn" data-act="cancel" type="button">Cancel</button></div>
      </div>`, { onBack });
    overlay.querySelectorAll('[data-pin-idx]').forEach(btn => {
      btn.onclick = () => {
        const m = recent[parseInt(btn.dataset.pinIdx, 10)]; if (!m) return;
        const freshPins = window.mpGetPins();
        freshPins[pinKey] = { msgId: m.id, text: m.text || '', from: m.from, by: ME.username, at: Date.now() };
        window.mpSetPins(freshPins);
        mpLogAction('pin', username, { reason: (m.text || '').slice(0, 100) });
        mpToast({ title:'Message pinned', msg:'@'+username, type:'success' });
        try { window.appChannel?.postMessage({ type: 'pin-updated', key: pinKey }); } catch (e) {}
        close(); onDone?.();
      };
    });
  };

  /* ============ UNDO LAST ============ */
  window.undoLastAction = function (username, onDone) {
    const bans = window.mpGetBans();
    const history = (bans.history || []).filter(h => h.username === username);
    const last = history[history.length - 1];
    if (!last) return mpToast({ title:'Nothing to undo', msg:'No actions found', type:'warn' });
    if (!confirm(`Undo last action?\n\nAction: ${last.action}\nFrom: ${new Date(last.at).toLocaleString()}`)) return;
    let success = false;
    try {
      if (last.action === 'ban') { try { Auth.unbanUser(username); } catch (e) {} window.RT?.banCleared?.(username); success = true; }
      else if (last.action === 'mute') { try { Auth.unmuteUser(username); } catch (e) {} window.RT?.unmute?.(username); success = true; }
      else if (last.action === 'warn') { const warnings = window.mpGetWarnings(); if (warnings[username] && warnings[username].length) { warnings[username].pop(); if (!warnings[username].length) delete warnings[username]; window.mpWrite('sb26_warnings', warnings); success = true; } }
      else if (last.action === 'freeze') { const map = window.mpGetFrozen(); delete map[username]; window.mpSetFrozen(map); window.RT?.emit?.('unfreeze', { username }); success = true; }
      else if (last.action === 'whitelist') { const wl = window.mpGetWhitelist().filter(n => n !== username); window.mpWrite('sb26_whitelist', wl); success = true; }
    } catch (e) { console.warn('[undo]', e); }
    if (success) { mpLogAction('undo-' + last.action, username, { reason: 'Undone by moderator' }); mpToast({ title:'Action undone', msg:`Reversed: ${last.action}`, type:'success' }); }
    else mpToast({ title:'Cannot undo', msg:`"${last.action}" cannot be reversed`, type:'warn', dur:5000 });
    onDone?.();
  };

  /* ============ ESCALATE ============ */
  window.openEscalateDialog = function (username, onDone, onBack) {
    const warnInfo = (() => { try { return Auth.getWarningInfo(username); } catch (e) { return { count: 0 }; } })();
    const count = warnInfo.count || 0;
    const levels = [
      { at: 0, action: 'warn', label: 'Warning only', desc: 'Just add a warning' },
      { at: 1, action: 'slow', label: 'Warn + 30s Slow', desc: '+ Slow mode' },
      { at: 2, action: 'mute', label: 'Warn + 1h Mute', desc: '+ Temp mute 1 hour' },
      { at: 3, action: 'ban', label: 'Warn + 1d Ban', desc: '+ Temporary ban' },
    ];
    const current = levels[Math.min(count, levels.length - 1)];
    const { overlay, close } = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head">
          ${onBack ? BACK_BTN : ''}
          <div class="mod-dialog-ico amber">⚡</div>
          <div class="mod-dialog-title"><h3>Escalate User</h3><div class="mod-dialog-sub">@${esc(username)} · ${count} warnings</div></div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">
          <div class="mod-dialog-warning info">Auto-escalation based on warning count.</div>
          <div style="display:flex;flex-direction:column;gap:6px">${levels.map(l => `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${l === current ? 'var(--amber-bg)' : 'var(--surface-2)'};border:1.5px solid ${l === current ? 'var(--amber)' : 'var(--border-2)'};border-radius:9px"><div style="font-size:11px;font-weight:800;color:${l === current ? 'var(--amber-2)' : 'var(--text-3)'};font-family:var(--mono);min-width:30px">${l.at}w</div><div style="flex:1"><div style="font-size:12.5px;font-weight:700">${l.label}</div><div style="font-size:10.5px;color:var(--text-3)">${l.desc}</div></div>${l === current ? '<span class="mod-badge warn">NEXT</span>' : ''}</div>`).join('')}</div>
          <div class="mod-dialog-label">Reason</div>
          <textarea id="escalateReasonInput" class="mod-dialog-textarea">Repeated rule violations</textarea>
        </div>
        <div class="mod-dialog-foot"><button class="btn" data-act="cancel" type="button">Cancel</button><button class="btn primary" data-act="confirm" type="button">Apply: ${current.label}</button></div>
      </div>`, { onBack });
    overlay.querySelector('[data-act="confirm"]').onclick = () => {
      const reason = (overlay.querySelector('#escalateReasonInput').value || '').trim() || 'Repeated rule violations';
      try { Auth.warnUser(username, reason, { automated: false }); } catch (e) {}
      if (current.action === 'slow') { const slow = window.mpGetSlowMode(); slow[username] = { seconds: 30, since: Date.now(), by: ME.username }; window.mpWrite('sb26_slowmode', slow); }
      else if (current.action === 'mute') { try { Auth.muteUser(username, reason, '1h'); } catch (e) {} }
      else if (current.action === 'ban') { try { Auth.banUser(username, reason, '1d', { automated: false }); } catch (e) {} }
      mpLogAction('escalate-' + current.action, username, { reason });
      mpToast({ title:'Escalated', msg:`@${username} → ${current.label}`, type:'warn' });
      close(); onDone?.();
    };
  };

  /* ============ RATE LIMIT ============ */
  window.openRateLimitDialog = function (username, onDone, onBack) {
    const user = safeGetUser(username); if (!user) return mpToast({ title:'User not found', msg:`@${username} no longer exists`, type:'error' });
    const current = window.mpGetSlowMode()[username];
    const currentSeconds = (current && current.seconds) || 0;
    const presets = [0, 5, 15, 30, 60, 120, 300];
    let selected = currentSeconds;
    const { overlay, close } = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head">
          ${onBack ? BACK_BTN : ''}
          <div class="mod-dialog-ico cyan">🐢</div>
          <div class="mod-dialog-title"><h3>Slow Mode</h3><div class="mod-dialog-sub">@${esc(username)} · ${currentSeconds > 0 ? currentSeconds + 's between messages' : 'no limit'}</div></div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">
          <div class="mod-dialog-warning cyan">User must wait N seconds between messages.</div>
          <div class="mod-dialog-label">Preset delays</div><div class="mp-duration" id="mpRatePresets"></div>
          <div class="mod-dialog-label">Or custom seconds (0 = off)</div>
          <input id="mpRateCustom" type="number" min="0" max="3600" value="${currentSeconds}" class="mod-dialog-input">
        </div>
        <div class="mod-dialog-foot"><button class="btn" data-act="cancel" type="button">Cancel</button><button class="btn primary" data-act="confirm" type="button">Apply</button></div>
      </div>`, { onBack });
    const presetsEl = overlay.querySelector('#mpRatePresets');
    presetsEl.innerHTML = presets.map(s => `<button type="button" data-sec="${s}" class="mp-duration-btn ${s === selected ? 'on' : ''}"><span class="mp-duration-label">${s === 0 ? 'Off' : s + 's'}</span></button>`).join('');
    presetsEl.querySelectorAll('button').forEach(b => { b.onclick = () => { selected = parseInt(b.dataset.sec, 10); overlay.querySelector('#mpRateCustom').value = selected; presetsEl.querySelectorAll('button').forEach(x => x.classList.toggle('on', parseInt(x.dataset.sec, 10) === selected)); }; });
    overlay.querySelector('[data-act="confirm"]').onclick = () => {
      const custom = parseInt(overlay.querySelector('#mpRateCustom').value, 10) || 0;
      const sec = Math.max(0, Math.min(3600, custom));
      const slow = window.mpGetSlowMode();
      if (sec === 0) { delete slow[username]; mpToast({ title:'Slow mode off', msg:'@'+username, type:'success' }); }
      else { slow[username] = { seconds: sec, since: Date.now(), by: ME.username }; mpToast({ title:'Slow mode set', msg:`@${username} · ${sec}s`, type:'success' }); }
      window.mpWrite('sb26_slowmode', slow);
      mpLogAction('rate-limit', username, { reason: sec === 0 ? 'Disabled' : sec + 's' });
      close(); onDone?.();
    };
  };

  /* ============ BULK DM ============ */
  window.openBulkDMDialog = function () {
    const users = safeAllUsers();
    const others = Object.values(users).filter(u => u.username !== ME.username && u.role !== 'owner' && u.role !== 'mod');
    if (!others.length) return mpToast({ title:'No users', msg:'No other users to message', type:'warn' });
    const { overlay, close } = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head"><div class="mod-dialog-ico accent">💌</div><div class="mod-dialog-title"><h3>Bulk Direct Message</h3><div class="mod-dialog-sub">Select recipients</div></div><button class="mod-dialog-close" type="button">×</button></div>
        <div class="mod-dialog-body">
          <div class="mod-dialog-label">Recipients (${others.length})</div>
          <div style="display:flex;gap:6px;margin-bottom:8px"><button class="btn" id="bulkDmAll" type="button" style="flex:1;padding:7px;font-size:11px">Select all</button><button class="btn" id="bulkDmNone" type="button" style="flex:1;padding:7px;font-size:11px">Clear</button></div>
          <div id="bulkDmList" style="display:flex;flex-direction:column;gap:4px;max-height:200px;overflow-y:auto;padding:4px;background:var(--surface-2);border:1px solid var(--border-2);border-radius:9px">${others.map(u => `<label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:7px;cursor:pointer"><input type="checkbox" class="bulk-dm-checkbox" value="${esc(u.username)}" style="accent-color:var(--accent);width:16px;height:16px;cursor:pointer"><div style="width:28px;height:28px;border-radius:50%;background:${u.color || '#4d9dff'};display:grid;place-items:center;color:#fff;font-weight:800;font-size:10px;flex-shrink:0">${esc(u.avatar || '??')}</div><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700">${esc(u.display || u.username)}</div><div style="font-size:10px;color:var(--text-3);font-family:var(--mono)">@${esc(u.username)}</div></div></label>`).join('')}</div>
          <div class="mod-dialog-label">Message</div>
          <textarea id="bulkDmText" class="mod-dialog-textarea" style="min-height:100px"></textarea>
          <div class="mod-dialog-warning info">Recipients selected: <strong id="bulkDmCount">0</strong></div>
        </div>
        <div class="mod-dialog-foot"><button class="btn" data-act="cancel" type="button">Cancel</button><button class="btn primary" id="bulkDmSend" type="button">Send to Selected</button></div>
      </div>`);
    const list = overlay.querySelector('#bulkDmList');
    const countEl = overlay.querySelector('#bulkDmCount');
    function updateCount() { countEl.textContent = list.querySelectorAll('.bulk-dm-checkbox:checked').length; }
    list.querySelectorAll('.bulk-dm-checkbox').forEach(cb => cb.addEventListener('change', updateCount));
    overlay.querySelector('#bulkDmAll').onclick = () => { list.querySelectorAll('.bulk-dm-checkbox').forEach(cb => cb.checked = true); updateCount(); };
    overlay.querySelector('#bulkDmNone').onclick = () => { list.querySelectorAll('.bulk-dm-checkbox').forEach(cb => cb.checked = false); updateCount(); };
    overlay.querySelector('#bulkDmSend').onclick = () => {
      const targets = [...list.querySelectorAll('.bulk-dm-checkbox:checked')].map(cb => cb.value);
      const text = (overlay.querySelector('#bulkDmText').value || '').trim();
      if (!targets.length) return mpToast({ title:'No recipients', msg:'Select at least one', type:'warn' });
      if (!text) return mpToast({ title:'Empty', msg:'Type something', type:'warn' });
      const now = Date.now();
      targets.forEach((to, i) => {
        const msgData = { id: ME.username + '-' + (now + i) + '-' + Math.random().toString(36).slice(2, 8), from: ME.username, fromDisplay: ME.display, to, ts: now + i, sentAt: now + i, type: 'text', text, fromMod: true, modBadge: true };
        try { const key = 'sb26_chat_' + [ME.username, to].sort().join('__'); const msgs = JSON.parse(localStorage.getItem(key) || '[]'); msgs.push(msgData); if (msgs.length > 800) msgs.splice(0, msgs.length - 800); localStorage.setItem(key, JSON.stringify(msgs)); } catch (e) {}
        try { window.appChannel?.postMessage({ type: 'chat', data: msgData }); } catch (e) {}
        try { window.RT?.emit?.('direct-notify', { from: ME.username, to, msg: text.slice(0, 80) }); } catch (e) {}
      });
      mpLogAction('bulk-dm', `(${targets.length} users)`, { reason: text.slice(0, 100) });
      mpToast({ title:'Bulk DM sent', msg:`${targets.length} recipients`, type:'success' });
      close();
    };
  };

  /* ============ FORCE SIGNOUT ============ */
  window.forceSignoutUser = function (username) {
    const user = safeGetUser(username); if (!user) return;
    try { if (window.RT) RT.emit('force-signout', { username }); } catch (e) {}
    try { if (window.Auth && Auth.forceReleaseLock) Auth.forceReleaseLock(username); } catch (e) {}
    const inv = window.mpRead('sb26_session_invalidated', {});
    inv[username] = Date.now();
    window.mpWrite('sb26_session_invalidated', inv);
    mpLogAction('force-signout', username, { reason:'All sessions invalidated' });
    mpToast({ title:'Force signed out', msg:'@'+username, type:'warn' });
  };

  /* ============ BAN DIALOG ============ */
  window.openBanDialog = function (username, onDone, onBack) {
    const user = safeGetUser(username);
    if (!user) return mpToast({ title:'User not found', msg:`@${username} no longer exists. Refresh and try again.`, type:'error', dur:5000 });
    if (user.role === 'owner') return mpToast({ title:'Forbidden', msg:'Cannot ban the owner', type:'error' });
    if (user.role === 'mod' && !window.AM_OWNER) return mpToast({ title:'Forbidden', msg:'Only owners can ban mods', type:'error' });
    const settings = mpRead('sb26_mod_settings', { requireReason: true, defaultBanDuration: '1d' });
    const durations = [
      { key:'1h', label:'1 hour' }, { key:'6h', label:'6 hours' }, { key:'12h', label:'12 hours' },
      { key:'1d', label:'1 day' }, { key:'3d', label:'3 days' }, { key:'7d', label:'7 days' },
      { key:'30d', label:'30 days' }, { key:'perm', label:'Permanent', desc:'Manual unban required' },
    ];
    let selected = settings.defaultBanDuration || '1d';
    const { overlay, close } = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head">
          ${onBack ? BACK_BTN : ''}
          <div class="mod-dialog-ico danger">🚫</div>
          <div class="mod-dialog-title"><h3>Ban User</h3><div class="mod-dialog-sub">@${esc(username)}</div></div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">
          <div class="mod-dialog-label">Duration</div><div id="mpBanDurationSlot"></div>
          <div class="mod-dialog-label">Reason${settings.requireReason ? ' (required)' : ''}</div>
          <textarea id="banReasonInput" class="mod-dialog-textarea">Rule violation</textarea>
          <div class="mod-dialog-warning">⚠ The user will be signed out immediately.</div>
        </div>
        <div class="mod-dialog-foot"><button class="btn" data-act="cancel" type="button">Cancel</button><button class="btn" data-act="confirm" type="button" style="background:var(--red);color:#fff;border-color:var(--red);font-weight:800">Ban User</button></div>
      </div>`, { onBack });
    if (mpDurationPicker) overlay.querySelector('#mpBanDurationSlot').appendChild(mpDurationPicker(durations, selected, k => { selected = k; }));
    overlay.querySelector('[data-act="confirm"]').onclick = () => {
      const reason = (overlay.querySelector('#banReasonInput').value || '').trim();
      if (settings.requireReason && !reason) return mpToast({ title:'Reason required', msg:'Enter a reason', type:'warn' });
      try { Auth.banUser(username, reason || 'Rule violation', selected, { automated:false }); } catch (e) {}
      mpLogAction('ban', username, { reason: reason || 'Rule violation' });
      mpToast({ title:'Banned', msg:`@${username}`, type:'error' });
      close(); onDone?.();
    };
  };

  /* ============ MUTE DIALOG ============ */
  window.openMuteDialog = function (username, onDone, onBack) {
    const user = safeGetUser(username); if (!user) return mpToast({ title:'User not found', msg:`@${username} no longer exists`, type:'error' });
    if (user.role === 'owner') return mpToast({ title:'Forbidden', msg:'Cannot mute the owner', type:'error' });
    if (user.role === 'mod' && !window.AM_OWNER) return mpToast({ title:'Forbidden', msg:'Only owners can mute mods', type:'error' });
    const settings = mpRead('sb26_mod_settings', { requireReasonMutes: true, defaultMuteDuration: '15m' });
    const durations = [
      { key:'5m', label:'5 min' }, { key:'15m', label:'15 min' }, { key:'1h', label:'1 hour' },
      { key:'6h', label:'6 hours' }, { key:'1d', label:'1 day' }, { key:'7d', label:'7 days' },
      { key:'perm', label:'Permanent', desc:'Manual unmute required' },
    ];
    let selected = settings.defaultMuteDuration || '15m';
    const { overlay, close } = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head">
          ${onBack ? BACK_BTN : ''}
          <div class="mod-dialog-ico cyan">🔇</div>
          <div class="mod-dialog-title"><h3>Mute User</h3><div class="mod-dialog-sub">@${esc(username)}</div></div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">
          <div class="mod-dialog-label">Duration</div><div id="mpMuteDurationSlot"></div>
          <div class="mod-dialog-label">Reason${settings.requireReasonMutes ? ' (required)' : ''}</div>
          <textarea id="muteReasonInput" class="mod-dialog-textarea">Muted by moderator</textarea>
          <div class="mod-dialog-warning cyan">User can still read messages but cannot send.</div>
        </div>
        <div class="mod-dialog-foot"><button class="btn" data-act="cancel" type="button">Cancel</button><button class="btn" data-act="confirm" type="button" style="background:var(--cyan);color:#000;border-color:var(--cyan);font-weight:800">Mute User</button></div>
      </div>`, { onBack });
    if (mpDurationPicker) overlay.querySelector('#mpMuteDurationSlot').appendChild(mpDurationPicker(durations, selected, k => { selected = k; }));
    overlay.querySelector('[data-act="confirm"]').onclick = () => {
      const reason = (overlay.querySelector('#muteReasonInput').value || '').trim();
      if (settings.requireReasonMutes && !reason) return mpToast({ title:'Reason required', msg:'Enter a reason', type:'warn' });
      try { Auth.muteUser(username, reason || 'Muted by moderator', selected); } catch (e) {}
      mpLogAction('mute', username, { reason });
      mpToast({ title:'Muted', msg:`@${username}`, type:'success' });
      close(); onDone?.();
    };
  };

  /* ============ EXTEND BAN ============ */
  window.openExtendBanDialog = function (username, onDone, onBack) {
    const bans = (window.Auth && Auth.getBans) ? Auth.getBans() : window.mpRead('sb26_bans', { users: {}, ips: {}, history: [] });
    const ban = bans.users[username]; if (!ban) return mpToast({ title:'No ban', msg:'User is not banned', type:'warn' });
    const options = [
      { label:'+1 hour',  ms: 3600000    },
      { label:'+6 hours', ms: 21600000   },
      { label:'+1 day',   ms: 86400000   },
      { label:'+3 days',  ms: 259200000  },
      { label:'+7 days',  ms: 604800000  },
      { label:'+30 days', ms: 2592000000 },
      { label:'Permanent', ms: null },
    ];
    const { overlay, close } = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head">
          ${onBack ? BACK_BTN : ''}
          <div class="mod-dialog-ico warn">⏱</div>
          <div class="mod-dialog-title"><h3>Extend Ban</h3><div class="mod-dialog-sub">@${esc(username)}</div></div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">
          <div class="mod-dialog-label">Additional time</div>
          <div class="mod-duration-picker" id="mpExtendPicker">${options.map(o => `<button type="button" data-ms="${o.ms==null?'perm':o.ms}">${o.label}</button>`).join('')}</div>
          <div class="mod-dialog-warning">Current: <strong>${ban.expiresAt==null?'Permanent':mpFmtDur(ban.expiresAt-Date.now())+' remaining'}</strong></div>
        </div>
      </div>`, { onBack });
    overlay.querySelectorAll('#mpExtendPicker button').forEach(btn => {
      btn.onclick = () => {
        const val = btn.dataset.ms;
        const addMs = val === 'perm' ? null : parseInt(val, 10);
        const newExpires = addMs == null ? null : (ban.expiresAt || Date.now()) + addMs;
        ban.expiresAt = newExpires;
        ban.permanent = newExpires == null;
        try { if (window.Auth && Auth.saveBans) Auth.saveBans(bans); else localStorage.setItem('sb26_bans', JSON.stringify(bans)); } catch (e) {}
        window.RT?.banChanged?.(username, ban);
        mpLogAction('ban-extend', username, { reason: btn.textContent.trim() });
        mpToast({ title:'Ban extended', msg:btn.textContent.trim(), type:'warn' });
        close();
        onDone?.();
      };
    });
  };

  /* ============ BAN IP ============ */
  /* FIXED v83.1: never overwrite caller-supplied IP/fingerprint with a lookup of a *different* device */
  window.openBanIPDialog = function (ip, opts = {}) {
    if (!window.IPBan) return mpToast({ title:'Unavailable', msg:'IP ban module not loaded', type:'error' });
    const settings = mpRead('sb26_mod_settings', { requireReason: true, showFingerprints: true });
    const targetUser = opts.targetUser || '';
    const onBack = opts.onBack;
    let targetIP = ip || opts.ip || null;
    let fingerprint = opts.fingerprint || null;
    // Only auto-resolve a device when NO explicit target was supplied.
    // (The Sessions viewer passes an explicit IP + FP — never clobber those.)
    if (targetUser && !targetIP && !fingerprint && window.IPBan.lookupUser) {
      const known = window.IPBan.lookupUser(targetUser);
      if (known) {
        targetIP = known.ip;
        fingerprint = known.fp || known.fingerprint || null;
      }
    }
    const selfIP = window.IPBan.getIPSync(); const selfFP = window.IPBan.getFingerprintSync();
    const isSelf = targetIP === selfIP || fingerprint === selfFP;
    if (!targetIP && !fingerprint) return mpToast({ title:'Target hardware unknown', msg:'This user has never logged in on a known device.', type:'warn', dur:6000 });
    const durations = [
      { key:'1h', label:'1 hour' }, { key:'6h', label:'6 hours' }, { key:'1d', label:'1 day' },
      { key:'3d', label:'3 days' }, { key:'7d', label:'7 days' }, { key:'30d', label:'30 days' },
      { key:'perm', label:'Permanent', desc:'Manual unban required' },
    ];
    let selected = 'perm';
    const { overlay, close } = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head">
          ${onBack ? BACK_BTN : ''}
          <div class="mod-dialog-ico danger">🌐</div>
          <div class="mod-dialog-title"><h3>Ban IP + Hardware</h3><div class="mod-dialog-sub">${targetUser?'@'+esc(targetUser)+' · ':''}${esc(targetIP||'(fingerprint only)')}</div></div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">
          ${isSelf?`<div class="mod-dialog-warning danger"><strong>⚠ This is YOUR device</strong><br>Banning this IP would ban YOU.</div>`:''}
          <div class="mod-dialog-warning danger">This device will be blocked from all SafeBeef access.</div>
          <div class="mod-ipbans-info" style="margin:0">
            <div class="mod-ipbans-info-row"><span class="mod-ipbans-info-label">IP</span><code class="mod-ipbans-info-val">${esc(targetIP||'—')}</code></div>
            ${settings.showFingerprints ? `<div class="mod-ipbans-info-row"><span class="mod-ipbans-info-label">HW FP</span><code class="mod-ipbans-info-val mod-ipbans-info-fp">${fingerprint?esc(fingerprint.slice(0,24))+'…':'—'}</code></div>` : ''}
            ${targetUser?`<div class="mod-ipbans-info-row"><span class="mod-ipbans-info-label">Username</span><code class="mod-ipbans-info-val">@${esc(targetUser)}</code></div>`:''}
          </div>
          <div class="mod-dialog-label">Duration</div><div id="mpBanIPDurationSlot"></div>
          <div class="mod-dialog-label">Reason${settings.requireReason ? ' (required)' : ''}</div>
          <textarea id="banIPReasonInput" class="mod-dialog-textarea">Ban evasion / alt-account abuse</textarea>
        </div>
        <div class="mod-dialog-foot"><button class="btn" data-act="cancel" type="button">Cancel</button><button class="btn" data-act="confirm" type="button" style="background:var(--red);color:#fff;border-color:var(--red);font-weight:800">${isSelf ? '⚠ Ban My Device' : 'Ban Device'}</button></div>
      </div>`, { onBack });
    if (mpDurationPicker) overlay.querySelector('#mpBanIPDurationSlot').appendChild(mpDurationPicker(durations, selected, k => { selected = k; }));
    overlay.querySelector('[data-act="confirm"]').onclick = async () => {
      const reason = (overlay.querySelector('#banIPReasonInput').value || '').trim();
      if (settings.requireReason && !reason) return mpToast({ title:'Reason required', msg:'Enter a reason', type:'warn' });
      if (isSelf && !confirm('Ban your OWN device? You will lose access immediately.')) return;
      try {
        await window.IPBan.ban(targetIP || ('FP:' + fingerprint), { reason: reason || 'Ban evasion', duration:selected, fingerprint, bannedBy:(window.ME && ME.username) || 'system', force:isSelf });
        mpToast({ title:'Device banned', msg:`${targetUser?'@'+targetUser:targetIP}`, type:'success' });
      } catch (e) { mpToast({ title:'Cannot ban', msg:e.message, type:'error' }); return; }
      close(); opts.onDone?.();
    };
  };

  /* ============ EXTEND IP BAN ============ */
  window.openExtendIPBanDialog = function (ip, onDone, onBack) {
    if (!window.IPBan) return;
    const entry = window.IPBan.isBanned(ip);
    if (!entry) return mpToast({ title:'No IP ban', msg:ip, type:'warn' });
    const options = [
      { label:'+1 hour',  ms: 3600000    },
      { label:'+6 hours', ms: 21600000   },
      { label:'+1 day',   ms: 86400000   },
      { label:'+3 days',  ms: 259200000  },
      { label:'+7 days',  ms: 604800000  },
      { label:'+30 days', ms: 2592000000 },
      { label:'Permanent', ms: null },
    ];
    const { overlay, close } = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head">
          ${onBack ? BACK_BTN : ''}
          <div class="mod-dialog-ico warn">⏱</div>
          <div class="mod-dialog-title"><h3>Extend IP Ban</h3><div class="mod-dialog-sub">${esc(ip)}</div></div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">
          <div class="mod-dialog-label">Additional time</div>
          <div class="mod-duration-picker" id="mpExtendIPPicker">${options.map(o => `<button type="button" data-ms="${o.ms==null?'perm':o.ms}">${o.label}</button>`).join('')}</div>
          <div class="mod-dialog-warning">Current: <strong>${entry.expiresAt==null?'Permanent':mpFmtDur(entry.expiresAt-Date.now())+' remaining'}</strong></div>
        </div>
      </div>`, { onBack });
    overlay.querySelectorAll('#mpExtendIPPicker button').forEach(btn => {
      btn.onclick = () => {
        const val = btn.dataset.ms;
        const key = val === 'perm' ? 'perm' : ({ '3600000':'1h','21600000':'6h','86400000':'1d','259200000':'3d','604800000':'7d','2592000000':'30d' })[val] || 'perm';
        window.IPBan.extend(ip, key);
        mpLogAction('ip-ban-extend', ip, { reason: btn.textContent.trim() });
        mpToast({ title:'IP ban extended', msg:ip, type:'warn' });
        close();
        onDone?.();
      };
    });
  };

  /* ============ WARN DIALOG ============ */
  window.openWarnDialog = function (username, onDone, onBack) {
    const user = safeGetUser(username); if (!user) return mpToast({ title:'User not found', msg:`@${username} no longer exists`, type:'error' });
    if (user.role === 'owner') return mpToast({ title:'Forbidden', msg:'Cannot warn the owner', type:'error' });
    if (user.role === 'mod' && !window.AM_OWNER) return mpToast({ title:'Forbidden', msg:'Only owners can warn mods', type:'error' });
    const settings = mpRead('sb26_mod_settings', { requireReason: true });
    const categories = [
      { key:'spam', label:'Spam', ico:'📢' }, { key:'harassment', label:'Harassment', ico:'😠' },
      { key:'nsfw', label:'NSFW', ico:'🔞' }, { key:'other', label:'Other', ico:'⚠' },
    ];
    let category = 'spam';
    const { overlay, close } = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head">
          ${onBack ? BACK_BTN : ''}
          <div class="mod-dialog-ico warn">⚠</div>
          <div class="mod-dialog-title"><h3>Warn User</h3><div class="mod-dialog-sub">@${esc(username)}</div></div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">
          <div class="mod-dialog-warning">3 warnings in 24h → 1h auto-ban.</div>
          <div class="mod-dialog-label">Category</div>
          <div class="mod-duration-picker" id="mpWarnCategory">${categories.map(c => `<button type="button" data-cat="${c.key}" class="${c.key===category?'on':''}">${c.ico} ${c.label}</button>`).join('')}</div>
          <div class="mod-dialog-label">Reason${settings.requireReason ? ' (required)' : ''}</div>
          <textarea id="warnReasonInput" class="mod-dialog-textarea">Rule violation</textarea>
        </div>
        <div class="mod-dialog-foot"><button class="btn" data-act="cancel" type="button">Cancel</button><button class="btn" data-act="confirm" type="button" style="background:var(--amber);color:#000;border-color:var(--amber);font-weight:800">Warn</button></div>
      </div>`, { onBack });
    overlay.querySelectorAll('#mpWarnCategory button').forEach(b => { b.onclick = () => { category = b.dataset.cat; overlay.querySelectorAll('#mpWarnCategory button').forEach(x => x.classList.toggle('on', x.dataset.cat === category)); }; });
    overlay.querySelector('[data-act="confirm"]').onclick = () => {
      const reason = (overlay.querySelector('#warnReasonInput').value || '').trim();
      if (settings.requireReason && !reason) return mpToast({ title:'Reason required', msg:'Enter a reason', type:'warn' });
      const res = (() => { try { return Auth.warnUser(username, `[${category}] ${reason || 'Rule violation'}`, { automated:false }); } catch (e) { return null; } })();
      mpLogAction('warn', username, { reason: `[${category}] ${reason}` });
      mpToast({ title:'Warned', msg:`@${username} · ${res?.count ?? '?'} total`, type:'warn' });
      close(); onDone?.();
    };
  };

  /* ============ WARNING MANAGER ============ */
  window.openWarningManager = function (username, onDone, onBack) {
    const user = safeGetUser(username); if (!user) return mpToast({ title:'User not found', msg:`@${username} no longer exists`, type:'error' });
    let overlay, close;
    function renderList() {
      const warnings = window.mpGetWarnings();
      const list = (warnings[username] || []).slice().reverse();
      overlay.querySelector('#mpWarnList').innerHTML = list.length ? list.map((w, i) => `<div class="mod-list-card amber" style="flex-wrap:wrap"><div class="mod-list-info"><div class="mod-list-name">${esc(w.reason || 'Warning')}</div><div class="mod-list-meta"><span>${new Date(w.at).toLocaleString()}</span>${w.by?`<span>by @${esc(w.by)}</span>`:''}${w.automated?'<span class="mod-badge warn">AUTO</span>':''}</div></div><div class="mod-list-actions"><button class="mod-action-btn danger" data-idx="${list.length-1-i}" type="button">Remove</button></div></div>`).join('') : '<div class="mod-empty">No warnings on record.</div>';
      overlay.querySelectorAll('[data-idx]').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx, 10);
          const warnings2 = window.mpGetWarnings();
          if (warnings2[username]) { warnings2[username].splice(idx, 1); if (!warnings2[username].length) delete warnings2[username]; window.mpWrite('sb26_warnings', warnings2); mpToast({ title:'Removed', msg:'Warning deleted', type:'success' }); renderList(); onDone?.(); }
        };
      });
    }
    const dlg = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head">
          ${onBack ? BACK_BTN : ''}
          <div class="mod-dialog-ico warn">⚠</div>
          <div class="mod-dialog-title"><h3>Manage Warnings</h3><div class="mod-dialog-sub">@${esc(username)}</div></div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">
          <div class="mod-dialog-label">Add warning</div>
          <div style="display:flex;gap:6px;flex-direction:column"><input id="mpAddWarnReason" class="mod-dialog-input" placeholder="Reason for warning"><button class="btn primary" id="mpAddWarnBtn" type="button" style="padding:9px;font-size:12px">Add Warning</button></div>
          <div class="mod-dialog-label">Existing warnings</div><div id="mpWarnList" class="mod-list"></div>
        </div>
        <div class="mod-dialog-foot"><button class="btn" data-act="cancel" type="button">Close</button></div>
      </div>`, { onBack });
    overlay = dlg.overlay; close = dlg.close;
    renderList();
    overlay.querySelector('#mpAddWarnBtn').onclick = () => {
      const reason = (overlay.querySelector('#mpAddWarnReason').value || '').trim();
      if (!reason) return mpToast({ title:'Empty', msg:'Enter a reason', type:'warn' });
      const warnings = window.mpGetWarnings();
      warnings[username] = warnings[username] || [];
      warnings[username].push({ reason, at:Date.now(), by:ME.username });
      window.mpWrite('sb26_warnings', warnings);
      mpToast({ title:'Warning added', msg:reason, type:'warn' });
      overlay.querySelector('#mpAddWarnReason').value = '';
      renderList(); onDone?.();
    };
  };

  /* ============ PURGE ============ */
  window.openPurgeDialog = function (username, onDone, onBack) {
    const user = safeGetUser(username); if (!user) return mpToast({ title:'User not found', msg:`@${username} no longer exists`, type:'error' });
    const { overlay, close } = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head">
          ${onBack ? BACK_BTN : ''}
          <div class="mod-dialog-ico danger">🗑</div>
          <div class="mod-dialog-title"><h3>Purge Messages</h3><div class="mod-dialog-sub">@${esc(username)}</div></div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">
          <div class="mod-dialog-warning danger"><strong>⚠ Irreversible</strong><br>All messages sent by this user will be deleted.</div>
          <div class="mod-dialog-label">Scope</div>
          <div class="mod-duration-picker" id="mpPurgeScope"><button type="button" data-scope="all" class="on">All messages</button><button type="button" data-scope="24h">Last 24h</button><button type="button" data-scope="1h">Last hour</button></div>
        </div>
        <div class="mod-dialog-foot"><button class="btn" data-act="cancel" type="button">Cancel</button><button class="btn" data-act="confirm" type="button" style="background:var(--red);color:#fff;border-color:var(--red);font-weight:800">Purge</button></div>
      </div>`, { onBack });
    let scope = 'all';
    overlay.querySelectorAll('#mpPurgeScope button').forEach(b => { b.onclick = () => { scope = b.dataset.scope; overlay.querySelectorAll('#mpPurgeScope button').forEach(x => x.classList.toggle('on', x.dataset.scope === scope)); }; });
    overlay.querySelector('[data-act="confirm"]').onclick = () => {
      const cutoff = scope === 'all' ? 0 : scope === '24h' ? Date.now() - 86400000 : Date.now() - 3600000;
      let removed = 0;
      Object.keys(localStorage).filter(k => k.startsWith('sb26_chat_')).forEach(key => {
        try { const msgs = JSON.parse(localStorage.getItem(key) || '[]'); if (!Array.isArray(msgs)) return; const filtered = msgs.filter(m => { if (m.from !== username) return true; if (m.ts < cutoff) return true; removed++; return false; }); if (filtered.length !== msgs.length) localStorage.setItem(key, JSON.stringify(filtered)); } catch (e) {}
      });
      mpLogAction('purge', username, { reason:`${removed} messages purged` });
      mpToast({ title:'Purged', msg:`${removed} message${removed===1?'':'s'} deleted`, type:'success' });
      close(); onDone?.();
    };
  };

  /* ============ MOD NOTES ============ */
  window.openModNotes = function (username, onBack) {
    const user = safeGetUser(username); if (!user) return mpToast({ title:'User not found', msg:`@${username} no longer exists`, type:'error' });
    let overlay, close;
    function renderList() {
      const notes = window.mpGetModNotes();
      const list = (notes[username] || []).slice().reverse();
      overlay.querySelector('#mpNoteList').innerHTML = list.length ? `<div class="mod-notes">${list.map(n => `<div class="mod-note-item">${esc(n.text)}<div class="mod-note-meta">— @${esc(n.by)} · ${new Date(n.at).toLocaleString()}</div></div>`).join('')}</div>` : '<div class="mod-empty">No notes yet.</div>';
    }
    const dlg = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head">
          ${onBack ? BACK_BTN : ''}
          <div class="mod-dialog-ico purple">📝</div>
          <div class="mod-dialog-title"><h3>Mod Notes</h3><div class="mod-dialog-sub">@${esc(username)} · internal only</div></div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">
          <div class="mod-dialog-warning purple">Visible only to moderators.</div>
          <div class="mod-dialog-label">Add note</div>
          <textarea id="mpNewNote" class="mod-dialog-textarea" placeholder="Context, history, warnings issued…"></textarea>
          <button class="btn primary" id="mpAddNoteBtn" type="button" style="padding:9px;font-size:12px">Add Note</button>
          <div class="mod-dialog-label">Existing notes</div><div id="mpNoteList"></div>
        </div>
        <div class="mod-dialog-foot"><button class="btn" data-act="cancel" type="button">Close</button></div>
      </div>`, { onBack });
    overlay = dlg.overlay; close = dlg.close;
    renderList();
    overlay.querySelector('#mpAddNoteBtn').onclick = () => {
      const text = (overlay.querySelector('#mpNewNote').value || '').trim();
      if (!text) return;
      const notes = window.mpGetModNotes();
      notes[username] = notes[username] || [];
      notes[username].push({ text, at:Date.now(), by:ME.username });
      window.mpWrite('sb26_mod_notes', notes);
      overlay.querySelector('#mpNewNote').value = '';
      renderList();
      mpToast({ title:'Note added', msg:'', type:'success' });
    };
  };

  /* ============ SESSIONS VIEWER ============ */
  window.openSessionsViewer = function (username, onBack) {
    const user = safeGetUser(username); if (!user) return mpToast({ title:'User not found', msg:`@${username} no longer exists`, type:'error' });
    const reg = window.IPBan && window.IPBan.lookupAll ? window.IPBan.lookupAll(username) : [];
    const sessions = reg.map(r => ({ ip:r.ip, fp:r.fp || r.fingerprint, lastSeen:r.lastSeen, age:Date.now() - r.lastSeen }));
    const settings = mpRead('sb26_mod_settings', { showFingerprints: true });
    const { overlay } = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head">
          ${onBack ? BACK_BTN : ''}
          <div class="mod-dialog-ico accent">📱</div>
          <div class="mod-dialog-title"><h3>Known Devices</h3><div class="mod-dialog-sub">@${esc(username)} · ${sessions.length} device${sessions.length===1?'':'s'}</div></div>
          <button class="mod-dialog-close" type="button">×</button>
        </div>
        <div class="mod-dialog-body">
          ${sessions.length === 0 ? `<div class="mod-empty-large"><div class="mod-empty-ico">📱</div><div class="mod-empty-title">No registered devices</div><div class="mod-empty-desc">This user has never logged in.</div></div>` : `<div class="mod-sessions">${sessions.map(s => `<div class="mod-session-row"><div class="mod-session-ico">${s.age < 60000 ? '🟢' : s.age < 3600000 ? '🟡' : '⚪'}</div><div class="mod-session-info"><div>${esc(s.ip)}</div><div class="mod-session-meta">${settings.showFingerprints && s.fp ? esc((s.fp||'').slice(0,16))+'… · ':''}seen ${Math.floor(s.age / 60000)}m ago</div></div><div class="mod-session-actions"><button class="mod-action-btn danger" data-ban-ip="${esc(s.ip)}" data-ban-fp="${esc(s.fp||'')}" type="button">Ban</button></div></div>`).join('')}</div>`}
        </div>
      </div>`, { onBack });
    overlay.querySelectorAll('[data-ban-ip]').forEach(btn => {
      btn.onclick = () => {
        window.openBanIPDialog(btn.dataset.banIp, {
          fingerprint: btn.dataset.banFp,
          targetUser: username,
          onBack: () => {}
        });
      };
    });
  };

  /* ============ ROLE MANAGEMENT ============ */
  window.openRoleManagement = function () {
    if (!window.AM_OWNER) return mpToast({ title:'Forbidden', msg:'Owner access required', type:'error' });
    document.querySelectorAll('.mod-panel').forEach(el => el.remove());
    const panel = document.createElement('div');
    panel.className = 'mod-panel';
    panel.innerHTML = `<div class="mod-card" role="dialog" aria-modal="true"><div class="mod-head"><div class="mod-head-left"><div class="mod-head-icon">👑</div><div class="mod-head-text"><h2>Role Management</h2><div class="mod-head-meta">Promote trusted users</div></div></div><button class="imsg-close" aria-label="Close" type="button">×</button></div><div class="mod-body" id="rmBody"></div></div>`;
    document.body.appendChild(panel);
    const prevOv = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const unlockScroll = () => { document.body.style.overflow = prevOv; };
    const body = panel.querySelector('#rmBody');
    function renderList() {
      const users = safeAllUsers();
      const list = Object.values(users).filter(u => u.username !== ME.username);
      if (!list.length) { body.innerHTML = `<div class="mod-empty-large"><div class="mod-empty-ico">👤</div><div class="mod-empty-title">No other users</div></div>`; return; }
      body.innerHTML = `<div class="mod-list">${list.map(u => `<div class="mod-list-card ${u.role === 'mod' ? 'purple' : ''}"><div class="mod-list-avatar" style="background:${u.color || '#4d9dff'}">${esc(u.avatar || '??')}</div><div class="mod-list-info"><div class="mod-list-name">${esc(u.display || u.username)} ${window.roleBadgeFor ? roleBadgeFor(u.username) : ''}</div><div class="mod-list-meta"><span>@${esc(u.username)}</span></div></div><div class="mod-list-actions">${u.role === 'user' ? `<button class="mod-action-btn purple" data-promote="${esc(u.username)}" type="button">Make Mod</button>` : (u.role === 'mod' ? `<button class="mod-action-btn" data-demote="${esc(u.username)}" type="button">Remove Mod</button>` : '')}</div></div>`).join('')}</div>`;
      body.querySelectorAll('[data-promote]').forEach(b => { b.onclick = () => { try { Auth.setRole(b.dataset.promote, 'mod'); } catch (e) {} mpToast({ title:'Promoted', msg:'@'+b.dataset.promote, type:'success' }); renderList(); }; });
      body.querySelectorAll('[data-demote]').forEach(b => { b.onclick = () => { try { Auth.setRole(b.dataset.demote, 'user'); } catch (e) {} mpToast({ title:'Demoted', msg:'@'+b.dataset.demote, type:'success' }); renderList(); }; });
    }
    renderList();
    panel.querySelector('.imsg-close').onclick = () => { unlockScroll(); panel.remove(); };
    const obs = new MutationObserver(() => { if (!document.body.contains(panel)) { obs.disconnect(); unlockScroll(); } });
    obs.observe(document.body, { childList:true });
  };

  /* ============ BROADCAST ============ */
  window.openBroadcastDialog = function () {
    if (!window.AM_PRIVILEGED) return mpToast({ title:'Forbidden', msg:'Moderator required', type:'error' });
    const { overlay, close } = mpMountDialog(`
      <div class="mod-dialog" role="dialog" aria-modal="true">
        <div class="mod-dialog-head"><div class="mod-dialog-ico accent">📢</div><div class="mod-dialog-title"><h3>Broadcast Announcement</h3><div class="mod-dialog-sub">Full-screen popup for all online users</div></div><button class="mod-dialog-close" type="button">×</button></div>
        <div class="mod-dialog-body">
          <div class="mod-dialog-warning info">This will show as a <strong>full-screen announcement popup</strong> on every user's screen.</div>
          <div class="mod-dialog-label">Title</div>
          <input id="bcTitle" class="mod-dialog-input" placeholder="Announcement">
          <div class="mod-dialog-label">Message</div>
          <textarea id="bcMsg" class="mod-dialog-textarea" placeholder="Server maintenance in 5 minutes…"></textarea>
          <div class="mod-dialog-label">Type</div>
          <div class="mod-duration-picker" id="bcType"><button data-type="info" class="on">ℹ Info</button><button data-type="success">✓ Success</button><button data-type="warn">⚠ Warn</button><button data-type="error">✕ Error</button></div>
        </div>
        <div class="mod-dialog-foot"><button class="btn" data-act="cancel" type="button">Cancel</button><button class="btn" data-act="send" type="button" style="background:var(--accent);color:#fff;border-color:var(--accent);font-weight:800">Send Announcement</button></div>
      </div>`);
    let type = 'info';
    overlay.querySelectorAll('#bcType button').forEach(b => { b.onclick = () => { type = b.dataset.type; overlay.querySelectorAll('#bcType button').forEach(x => x.classList.toggle('on', x.dataset.type === type)); }; });
    overlay.querySelector('[data-act="send"]').onclick = () => {
      const title = overlay.querySelector('#bcTitle').value.trim() || 'Announcement';
      const msg = overlay.querySelector('#bcMsg').value.trim();
      if (!msg) return mpToast({ title:'Empty', msg:'Enter a message', type:'warn' });
      window.RT?.emit?.('broadcast', { from:ME.username, title, msg, type });
      mpLogAction('broadcast', '(all)', { reason: title });
      mpToast({ title:'Announcement sent', msg:title, type:'success' });
      close();
    };
  };

  /* ============ REPORT USER (submission API) ============ */
  window.reportUser = function (target, reason, reportedMessage) {
    if (!target) return { error: 'No target specified' };
    if (!reason) return { error: 'No reason specified' };
    if (window.ME && target === ME.username) return { error: 'You cannot report yourself' };
    let reports = [];
    try { reports = JSON.parse(localStorage.getItem('sb26_reports') || '[]') || []; } catch (e) {}
    if (!Array.isArray(reports)) reports = [];
    const recent = reports.find(r => r.target === target && r.reporter === (window.ME && ME.username) && !r.resolved && Date.now() - r.at < 60000);
    if (recent) return { error: 'You already reported this user recently' };
    reports.push({ id: 'report-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), target, reporter: (window.ME && ME.username) || 'anonymous', reason, reportedMessage: reportedMessage || '', at: Date.now(), atISO: new Date().toISOString(), atLocal: new Date().toLocaleString(), resolved: false });
    if (reports.length > 500) reports.splice(0, reports.length - 500);
    try { localStorage.setItem('sb26_reports', JSON.stringify(reports)); } catch (e) {}
    try { window.Live && Live.emit && Live.emit('modPanel'); } catch (e) {}
    try { window.SafeBeef?.appChannel?.postMessage({ type: 'report-created' }); } catch (e) {}
    return { success: true };
  };

  window.__sbPromptText = promptText;
  window.__sbChooseValue = chooseValue;
}