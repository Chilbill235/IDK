/* ==========================================================================
   SafeBeef v73 — Module runner (single source of truth, upgraded)
   ========================================================================== */
'use strict';

function runModule(id) {
  if (sessionStorage.getItem('sb26_frozen') === '1')
    return toast('Frozen', 'A moderator froze your access', 'error', 3000);

  // Extra safety: also check the persistent freeze map
  try {
    const frozen = JSON.parse(localStorage.getItem('sb26_frozen_users') || '{}');
    if (frozen[ME.username]) return toast('Frozen', 'A moderator froze your access', 'error', 3000);
  } catch (e) {}

  const mod = (window.MODULE_REGISTRY || []).find(x => x.id === id);
  if (!mod) {
    log(`<span style="color:var(--red-2)">Unknown module: ${esc(id)}</span>`);
    return;
  }

  trackRecentModule(id);
  reportAction('module-spam');

  const isFetchable = !!(window.Router?.FETCHABLE_MODULES?.[id]);
  const hasConfig = window.ModuleConfig?.has(id);
  const hasHookedTarget = state.hooked && state.hooked.username !== ME.username;

  if (isFetchable) {
    const fakeTarget = { username: 'self', display: 'You', avatar: ME.avatar, color: ME.color };
    if (hasConfig) {
      window.showModuleConfig(mod, fakeTarget, (config) => {
        window.Router.runFetchableModule(id, config, mod);
      });
    } else {
      window.Router.runFetchableModule(id, {}, mod);
    }
    return;
  }

  if (hasHookedTarget) {
    if (hasConfig) {
      window.showModuleConfig(mod, state.hooked, (config) => {
        const sent = window.dispatchModuleWithConfig(id, config);
        if (sent) {
          toast('Fired', `${mod.name} → @${state.hooked.username}`, 'success');
          reportAction('remote-module-abuse');
        }
      });
    } else {
      const sent = window.dispatchModuleWithConfig(id, {});
      if (sent) {
        toast('Fired', `${mod.name} → @${state.hooked.username}`, 'success');
        reportAction('remote-module-abuse');
      }
    }
    return;
  }

  if (hasConfig) {
    const fakeTarget = { username: 'self', display: 'You', avatar: ME.avatar, color: ME.color };
    window.showModuleConfig(mod, fakeTarget, (config) => {
      executeModuleLocally(id, config);
    });
  } else {
    executeModuleLocally(id, {});
  }
}
window.runModule = runModule;

function executeModuleLocally(id, config) {
  config = config || {};
  const mod = (window.MODULE_REGISTRY || []).find(x => x.id === id);
  if (!mod) {
    log(`<span style="color:var(--red-2)">Unknown module: ${esc(id)}</span>`);
    return;
  }
  state.modulesRun++;
  ['statMods', 'statModsM'].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.textContent = state.modulesRun;
  });

  // RealAPIs first
  if (window.RealAPIs && window.RealAPIs.has(id)) {
    try { return window.RealAPIs.run(id); }
    catch (e) {
      log(`<span style="color:var(--red-2)">✕ ${esc(mod.name)}: ${esc(e.message)}</span>`);
      toast('Module error', e.message, 'error', 4000);
      return;
    }
  }

  // PrankEngine next
  if (window.PrankEngine && window.PrankEngine.has(id)) {
    try { return window.PrankEngine.run(id, config); }
    catch (e) {
      log(`<span style="color:var(--red-2)">✕ ${esc(mod.name)}: ${esc(e.message)}</span>`);
      toast('Module error', e.message, 'error', 4000);
      return;
    }
  }

  // Built-in handlers
  try {
    if (builtinHandlers[id]) return builtinHandlers[id](config, mod);
    showDialog({
      title: mod.name, icon: mod.ico,
      bodyHtml: `<div style="font-family:var(--mono);font-size:12px;padding:20px;text-align:center;color:var(--text-3)">
        Module <strong style="color:var(--text)">"${esc(mod.name)}"</strong> is registered but not yet implemented.<br><br>
        <small>Try another module from the grid, or check the docs.</small>
      </div>`,
      buttons: [{ label: 'Close', class: 'primary', action: 'close' }],
    });
  } catch (e) {
    console.warn('[module]', id, e);
    log(`<span style="color:var(--red-2)">✕ ${esc(mod.name)} crashed: ${esc(e.message)}</span>`);
    toast('Module crashed', e.message, 'error', 4000);
  }
}
window.executeModuleLocally = executeModuleLocally;

/* ============ BUILT-IN MODULE HANDLERS ============ */
const builtinHandlers = {
  'api-chat': () => window.openChat?.(),

  'sys-push': (cfg) => {
    if (!('Notification' in window)) return toast('Unsupported', 'No notification API', 'warn');
    if (Notification.permission === 'granted') {
      try { new Notification(cfg.title || 'SafeBeef', { body: cfg.body || 'Test notification' }); } catch (e) {}
      toast('Push sent', cfg.title || 'SafeBeef', 'success');
    } else {
      Notification.requestPermission().then(p => {
        if (p === 'granted') {
          try { new Notification(cfg.title || 'SafeBeef', { body: cfg.body || 'Test notification' }); } catch (e) {}
          toast('Push enabled', 'Notifications granted', 'success');
        } else {
          toast('Denied', 'Notifications blocked', 'error');
        }
      });
    }
  },

  'sys-toast': (cfg) => toast(cfg.title || 'Test', cfg.message || '', cfg.type || 'success'),

  'sys-fullscreen': () => {
    try {
      document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {});
    } catch (e) { toast('Fullscreen blocked', e.message, 'error'); }
  },

  'sys-vibrate': () => {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 400]);
      toast('Vibrating', 'Check your device', 'info', 1500);
    } else toast('No vibration', 'Device does not support vibration', 'warn');
  },

  'sys-share': (cfg) => {
    if (navigator.share) {
      navigator.share({ title: 'SafeBeef', url: cfg.url || location.href }).catch(() => {});
    } else toast('Unsupported', 'Web Share API not available', 'warn');
  },

  'sys-tts': (cfg) => {
    if (!('speechSynthesis' in window)) return toast('Unsupported', 'No TTS', 'warn');
    const utter = new SpeechSynthesisUtterance(cfg.text || 'SafeBeef');
    utter.rate = 1; utter.pitch = 1; utter.volume = 1;
    speechSynthesis.speak(utter);
    toast('Speaking', cfg.text || 'SafeBeef', 'info', 2000);
  },

  'sys-clip-r': () => {
    navigator.clipboard?.readText().then(t => showDialog({
      title: 'Clipboard', icon: '📋',
      bodyHtml: `<div style="font-family:var(--mono);font-size:12px;padding:14px;background:var(--bg);border-radius:8px;word-break:break-all;min-height:60px">${esc(t || '(empty)')}</div>`,
    })).catch(e => toast('Clipboard denied', e.message, 'error'));
  },

  'sys-clip-w': (cfg) => {
    navigator.clipboard?.writeText(cfg.text || 'SafeBeef').then(() => toast('Copied', cfg.text || 'SafeBeef', 'success')).catch(e => toast('Clipboard denied', e.message, 'error'));
  },

  'sys-battery': () => {
    if (!navigator.getBattery) return toast('Unsupported', 'Battery API not available', 'warn');
    navigator.getBattery().then(b => showDialog({
      title: 'Battery', icon: '🔋',
      bodyHtml: `<div style="font-family:var(--mono);font-size:13px;padding:14px;background:var(--bg);border-radius:8px">
        Level: <strong>${(b.level * 100).toFixed(0)}%</strong><br>
        Charging: <strong>${b.charging ? 'Yes' : 'No'}</strong><br>
        ${b.chargingTime !== Infinity ? `Time to full: ${Math.round(b.chargingTime/60)}m` : ''}<br>
        ${b.dischargingTime !== Infinity ? `Time remaining: ${Math.round(b.dischargingTime/60)}m` : ''}
      </div>`,
    }));
  },

  'sys-eyedrop': () => {
    if (!('EyeDropper' in window)) return toast('Unsupported', 'EyeDropper API not available', 'warn');
    new EyeDropper().open().then(r => {
      showDialog({
        title: 'Color Picked', icon: '🎨',
        bodyHtml: `<div style="text-align:center;padding:20px">
          <div style="width:120px;height:120px;background:${r.sRGBHex};border-radius:16px;margin:0 auto 16px;box-shadow:0 8px 32px rgba(0,0,0,.4)"></div>
          <div style="font-family:var(--mono);font-size:20px;font-weight:900">${r.sRGBHex}</div>
        </div>`,
      });
    }).catch(() => {});
  },

  'hw-geo': () => {
    if (!navigator.geolocation) return toast('Unsupported', 'No geolocation', 'warn');
    toast('Getting location…', '', 'info', 1500);
    navigator.geolocation.getCurrentPosition(
      p => showDialog({
        title: 'Location', icon: '📍',
        bodyHtml: `<div style="font-family:var(--mono);font-size:12px;padding:14px;background:var(--bg);border-radius:8px">
          Lat: <strong>${p.coords.latitude.toFixed(6)}</strong><br>
          Lng: <strong>${p.coords.longitude.toFixed(6)}</strong><br>
          Accuracy: ±${p.coords.accuracy.toFixed(0)}m
        </div>`,
      }),
      e => toast('Location failed', e.message, 'error', 4000)
    );
  },

  'hw-bt': () => {
    if (!navigator.bluetooth) return toast('Unsupported', 'Bluetooth API not available', 'warn');
    navigator.bluetooth.requestDevice({ acceptAllDevices: true }).then(d => {
      toast('Device found', d.name || d.id, 'success');
    }).catch(e => toast('Bluetooth failed', e.message, 'error'));
  },

  'media-cam': () => openCameraModal?.('photo'),
  'media-photo': () => openCameraModal?.('photo'),
  'media-video': () => openCameraModal?.('video'),
  'media-record': () => openVoiceRecorder?.(),

  'fake-scan': (cfg) => runTerminal('Deep Scan', [
    '> Initializing antivirus engine v7.3.1',
    '> Loading signatures: 4,231,044',
    '> Scanning C:\\Windows\\System32\\…',
    '> Scanning C:\\Program Files\\…',
    '> Scanning user directories…',
    `> ⚠ ${cfg?.count || 7} threats detected!`,
    '> Quarantining…',
    '> System compromised. (simulated)',
    '> Click anywhere to close.',
  ]),

  'fake-alert': () => showDialog({
    title: 'System Alert', icon: '⚠',
    bodyHtml: `<div style="text-align:center;padding:20px">
      <div style="font-size:56px;margin-bottom:12px">⚠</div>
      <div style="font-size:18px;font-weight:800;color:var(--red-2)">Critical System Error</div>
      <div style="margin-top:12px;font-size:12px;color:var(--text-3)">Windows has detected a serious problem.<br>(Prank — not real)</div>
    </div>`,
    buttons: [{ label: 'OK', class: 'primary', action: 'close' }],
  }),

  'fake-prize': (cfg) => showDialog({
    title: 'You Won!', icon: '🎁',
    bodyHtml: `<div style="text-align:center;padding:20px">
      <div style="font-size:72px;margin-bottom:16px">🎁</div>
      <div style="font-size:24px;font-weight:900;color:var(--amber-2)">CONGRATULATIONS!</div>
      <div style="font-size:16px;margin-top:12px;color:var(--text)">${esc(cfg?.message || 'You won an iPhone 15 Pro!')}</div>
      <div style="margin-top:16px;font-size:12px;color:var(--text-3)">(Prank — not real)</div>
    </div>`,
    buttons: [{ label: 'Claim Prize', class: 'primary', action: 'close' }],
  }),

  'fake-spider': (cfg) => {
    const count = parseInt(cfg?.count) || 12;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.textContent = '🕷';
        el.style.cssText = `position:fixed;left:${Math.random()*90}vw;top:${Math.random()*80}vh;font-size:${28+Math.random()*20}px;z-index:99998;pointer-events:none;transition:transform 3s,opacity 3s`;
        document.body.appendChild(el);
        requestAnimationFrame(() => {
          el.style.transform = `translate(${(Math.random()-.5)*500}px,${(Math.random()-.5)*500}px) rotate(${Math.random()*720-360}deg)`;
          el.style.opacity = '0';
        });
        setTimeout(() => el.remove(), 3200);
      }, i * 80);
    }
  },

  'fake-cursor': () => {
    const prev = document.body.style.cursor;
    document.body.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22><text y=%2224%22 font-size=%2224%22>💩</text></svg>') 16 16, auto`;
    setTimeout(() => { document.body.style.cursor = prev; }, 8000);
    toast('Poop Cursor', 'Active for 8 seconds', 'purple', 3000);
  },
};
window.__sbBuiltinHandlers = builtinHandlers;

function runTerminal(title, lines) {
  const h = showDialog({
    title, icon: '⚙️',
    bodyHtml: '<div id="termOut" style="font-family:var(--mono);font-size:11px;height:260px;overflow-y:auto;background:#03050a;padding:10px;border-radius:8px;color:#8ea5c2"></div>',
    buttons: [{ label: 'Close', class: 'primary', action: () => { clearInterval(h._iv); h.close(); } }],
  });
  let i = 0;
  const out = h.overlay.querySelector('#termOut');
  h._iv = setInterval(() => {
    if (i >= lines.length) { clearInterval(h._iv); return; }
    out.innerHTML += lines[i++] + '<br>';
    out.scrollTop = out.scrollHeight;
  }, 250);
}