/* real-apis.js — SafeBeef v24 — 40+ real browser API implementations */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast = (t, m, ty, d) => window.showToast?.(t, m, ty, d);
  const dialog = (title, html, opts = {}) => window.showDialog?.({
    title, icon: opts.icon || '🌐', subtitle: opts.subtitle || 'Real API result',
    bodyHtml: html, buttons: opts.buttons || [{ label: 'Close', action: 'close' }],
  });

  function kvTable(obj) {
    const rows = Object.entries(obj).map(([k, v]) => {
      let val = v;
      if (typeof v === 'object') val = JSON.stringify(v);
      if (typeof v === 'boolean') val = v ? '✅ true' : '❌ false';
      if (v === undefined || v === null) val = '—';
      return `<tr><td style="padding:6px 10px;color:var(--text-3);font-size:11px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--border);white-space:nowrap">${esc(k)}</td><td style="padding:6px 10px;font-family:var(--mono);font-size:11px;color:var(--cyan-2);border-bottom:1px solid var(--border);word-break:break-all">${esc(String(val))}</td></tr>`;
    }).join('');
    return `<table style="width:100%;border-collapse:collapse">${rows}</table>`;
  }

  const R = {};

  /* 1. Client hints */
  R['real-ua'] = async () => {
    const uad = navigator.userAgentData;
    let html;
    if (uad) {
      let high = null;
      try { high = await uad.getHighEntropyValues(['architecture','bitness','model','platformVersion','uaFullVersion','fullVersionList','wow64']); } catch (e) {}
      html = `<div class="api-result">${esc(JSON.stringify({ brands: uad.brands, mobile: uad.mobile, platform: uad.platform, ...(high || {}) }, null, 2))}</div>`;
    } else {
      html = `<div class="api-result">UserAgentData unavailable — falling back:\n${esc(navigator.userAgent)}</div>`;
    }
    dialog('Client Hints', html, { icon: '🪪' });
  };

  /* 2. Device orientation */
  R['real-sensors'] = () => {
    const h = window.showDialog({
      title: 'Device Orientation', icon: '📱', subtitle: 'Live sensor data',
      bodyHtml: `<div class="api-result" id="sensorOut">Waiting for sensor data…</div>
        <div style="margin-top:12px;text-align:center"><button class="btn danger" id="sensorStop">Stop</button></div>`,
      buttons: [{ label: 'Close', action: 'close' }],
    });
    const out = h.overlay.querySelector('#sensorOut');
    const onOrient = (e) => {
      out.textContent = `alpha (z): ${e.alpha?.toFixed(2) ?? '—'}\nbeta  (x): ${e.beta?.toFixed(2) ?? '—'}\ngamma (y): ${e.gamma?.toFixed(2) ?? '—'}\nabsolute: ${e.absolute}`;
    };
    window.addEventListener('deviceorientation', onOrient);
    h.overlay.querySelector('#sensorStop').addEventListener('click', () => {
      window.removeEventListener('deviceorientation', onOrient);
      h.close();
    });
    h.overlay.addEventListener('click', (e) => {
      if (e.target === h.overlay) window.removeEventListener('deviceorientation', onOrient);
    });
  };

  /* 3. Device motion */
  R['real-motion'] = () => {
    const h = window.showDialog({
      title: 'Device Motion', icon: '🎢', subtitle: 'Live acceleration',
      bodyHtml: `<div class="api-result" id="motionOut">Waiting for motion data…</div>
        <div style="margin-top:12px;text-align:center"><button class="btn danger" id="motionStop">Stop</button></div>`,
      buttons: [{ label: 'Close', action: 'close' }],
    });
    const out = h.overlay.querySelector('#motionOut');
    const onMotion = (e) => {
      const a = e.acceleration || {};
      const g = e.accelerationIncludingGravity || {};
      const r = e.rotationRate || {};
      out.textContent = `acceleration (no gravity):\n  x: ${a.x?.toFixed(3) ?? '—'}\n  y: ${a.y?.toFixed(3) ?? '—'}\n  z: ${a.z?.toFixed(3) ?? '—'}\n\nincl. gravity:\n  x: ${g.x?.toFixed(3) ?? '—'}\n  y: ${g.y?.toFixed(3) ?? '—'}\n  z: ${g.z?.toFixed(3) ?? '—'}\n\nrotation rate:\n  α: ${r.alpha?.toFixed(2) ?? '—'}\n  β: ${r.beta?.toFixed(2) ?? '—'}\n  γ: ${r.gamma?.toFixed(2) ?? '—'}`;
    };
    window.addEventListener('devicemotion', onMotion);
    h.overlay.querySelector('#motionStop').addEventListener('click', () => {
      window.removeEventListener('devicemotion', onMotion);
      h.close();
    });
  };

  /* 4. Network info */
  R['real-network'] = async () => {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    let html;
    if (c) {
      html = `<div class="api-result">${esc(JSON.stringify({
        effectiveType: c.effectiveType, downlink: c.downlink, rtt: c.rtt,
        saveData: c.saveData, type: c.type,
      }, null, 2))}</div>
      <div class="api-result" style="margin-top:10px">Online: ${navigator.onLine}\nPublic IP: <span id="netIp">looking up…</span></div>`;
    } else {
      html = `<div class="api-result">Network Information API unavailable.\n\nOnline: ${navigator.onLine}</div>`;
    }
    dialog('Network Info', html, { icon: '📶' });
    fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => {
      const el = document.getElementById('netIp');
      if (el) el.textContent = d.ip;
    }).catch(() => {});
  };

  /* 5. Permissions */
  R['real-perms'] = async () => {
    if (!navigator.permissions) {
      return dialog('Permissions', '<div class="api-result">Permissions API unavailable.</div>', { icon: '🛂' });
    }
    const names = ['geolocation','notifications','camera','microphone','clipboard-read','clipboard-write','persistent-storage','push','screen-wake-lock','midi'];
    const results = {};
    for (const n of names) {
      try {
        const st = await navigator.permissions.query({ name: n });
        results[n] = st.state;
      } catch (e) { results[n] = 'not supported'; }
    }
    dialog('Permissions', `<div class="api-result">${esc(JSON.stringify(results, null, 2))}</div>`, { icon: '🛂' });
  };

  /* 6. Languages */
  R['real-langs'] = () => {
    const html = kvTable({
      'Primary language': navigator.language,
      'Languages': (navigator.languages || []).join(', ') || navigator.language,
      'Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
      'Offset (min)': new Date().getTimezoneOffset(),
      'Locale': Intl.DateTimeFormat().resolvedOptions().locale,
      'Calendar': Intl.DateTimeFormat().resolvedOptions().calendar,
      'Numbering': Intl.DateTimeFormat().resolvedOptions().numberingSystem,
    });
    dialog('Languages', html, { icon: '🗣️' });
  };

  /* 7. Storage quota */
  R['real-storage'] = async () => {
    if (!navigator.storage?.estimate) {
      return dialog('Storage', '<div class="api-result">StorageManager.estimate unavailable.</div>', { icon: '💾' });
    }
    const est = await navigator.storage.estimate();
    const used = est.usage || 0;
    const quota = est.quota || 0;
    const pct = quota ? (used / quota * 100).toFixed(2) : '?';
    const html = `
      <div class="api-result">Quota: ${(quota/1024/1024).toFixed(1)} MB\nUsage: ${(used/1024/1024).toFixed(2)} MB (${pct}%)</div>
      <div style="height:12px;background:var(--surface-3);border-radius:6px;margin-top:12px;overflow:hidden">
        <div style="height:100%;width:${Math.min(100, Number(pct))}%;background:linear-gradient(90deg,var(--accent),var(--purple))"></div>
      </div>`;
    dialog('Storage Quota', html, { icon: '💾' });
  };

  /* 8. Idle detector */
  R['real-idle'] = async () => {
    if (!('IdleDetector' in window)) {
      return dialog('Idle Detector', '<div class="api-result">IdleDetector unavailable (Chromium only).</div>', { icon: '💤' });
    }
    try {
      const perm = await IdleDetector.requestPermission();
      if (perm !== 'granted') return toast('Denied', 'Idle permission needed', 'warn');
      const det = new IdleDetector();
      const h = dialog('Idle Detector', '<div class="api-result" id="idleOut">Starting…</div>', { icon: '💤' });
      const out = h?.overlay?.querySelector('#idleOut');
      det.addEventListener('change', () => {
        if (out) out.textContent = `State: ${det.userState}\nScreen: ${det.screenState}\nTime: ${new Date().toLocaleTimeString()}`;
      });
      await det.start({ threshold: 60000 });
    } catch (e) {
      dialog('Idle Detector', `<div class="api-result">Error: ${esc(e.message)}</div>`, { icon: '💤' });
    }
  };

  /* 9. Wake lock */
  R['real-wake'] = async () => {
    if (!('wakeLock' in navigator)) {
      return dialog('Wake Lock', '<div class="api-result">Wake Lock API unavailable.</div>', { icon: '💡' });
    }
    try {
      const lock = await navigator.wakeLock.request('screen');
      toast('Wake Lock ON', 'Screen will stay on', 'success');
      const h = dialog('Wake Lock', `<div class="api-result" id="wlOut">Active ✅</div>`, {
        icon: '💡',
        buttons: [
          { label: 'Release', class: 'danger', action: async () => { try { await lock.release(); } catch(e){} toast('Released', 'Wake lock released', 'warn'); h.close(); } },
          { label: 'Close', action: 'close' }
        ]
      });
      lock.addEventListener('release', () => { const el = h.overlay.querySelector('#wlOut'); if (el) el.textContent = 'Released.'; });
    } catch (e) {
      toast('Wake Lock failed', e.message, 'error');
    }
  };

  /* 10. Screen orientation */
  R['real-orient'] = () => {
    const s = screen.orientation || {};
    const html = kvTable({
      'Type': s.type || '—',
      'Angle': s.angle ?? '—',
      'Lock supported': !!(s && s.lock),
    });
    dialog('Screen Orientation', html, {
      icon: '🔄',
      buttons: [
        { label: 'Lock Portrait', class: 'primary', action: async () => {
          try { await screen.orientation.lock('portrait'); toast('Locked', 'Portrait', 'success'); }
          catch (e) { toast('Lock failed', e.message, 'error'); }
        }},
        { label: 'Unlock', action: () => { try { screen.orientation.unlock(); toast('Unlocked', '', 'warn'); } catch (e) {} } },
        { label: 'Close', action: 'close' }
      ]
    });
  };

  /* 11. Vibrate pattern */
  R['real-vibrate-pattern'] = () => {
    if (!navigator.vibrate) {
      return dialog('Vibrate', '<div class="api-result">Vibration API unavailable.</div>', { icon: '📳' });
    }
    window.showDialog({
      title: 'Vibrate Pattern', icon: '📳', subtitle: 'Tap a pattern',
      bodyHtml: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button class="btn" data-p="[200]">Single</button>
        <button class="btn" data-p="[200,100,200]">Pulse</button>
        <button class="btn" data-p="[100,50,100,50,100]">Fast</button>
        <button class="btn" data-p="[500,200,500]">Long</button>
        <button class="btn" data-p="[100,30,100,30,100,30,500]">SOS</button>
        <button class="btn" data-p="[1000]">1 second</button>
      </div>`,
      buttons: [
        { label: 'Stop', class: 'danger', action: () => { navigator.vibrate(0); } },
        { label: 'Close', action: 'close' }
      ]
    });
    setTimeout(() => {
      document.querySelectorAll('.dialog [data-p]').forEach(btn => {
        btn.addEventListener('click', () => {
          try { navigator.vibrate(JSON.parse(btn.dataset.p)); toast('Vibrate', btn.textContent, 'success', 1500); } catch(e) {}
        });
      });
    }, 50);
  };

  /* 12. Share files */
  R['real-web-share-files'] = () => {
    if (!navigator.share) {
      return dialog('Share Files', '<div class="api-result">Web Share API unavailable.</div>', { icon: '📤' });
    }
    const file = new File([new Blob(['Hello from SafeBeef!'])], 'safebeef.txt', { type: 'text/plain' });
    const can = navigator.canShare && navigator.canShare({ files: [file] });
    dialog('Share Files', `
      <div class="api-result">File sharing supported: ${can ? '✅ yes' : '❌ no'}</div>
      <div style="margin-top:12px;text-align:center">
        ${can ? '<button class="btn primary" id="shareFileBtn">Share a text file</button>' : '<span class="sb-muted">Not supported here.</span>'}
      </div>`, { icon: '📤' });
    setTimeout(() => {
      const b = document.getElementById('shareFileBtn');
      if (b) b.addEventListener('click', async () => {
        try { await navigator.share({ files: [file], title: 'SafeBeef' }); toast('Shared', 'File shared', 'success'); }
        catch (e) { if (e.name !== 'AbortError') toast('Error', e.message, 'error'); }
      });
    }, 50);
  };

  /* 13. Contact picker */
  R['real-contacts'] = async () => {
    if (!('contacts' in navigator)) {
      return dialog('Contact Picker', '<div class="api-result">Contact Picker unavailable (Chromium, needs gesture).</div>', { icon: '👥' });
    }
    try {
      const contacts = await navigator.contacts.select(['name','email','tel'], { multiple: true });
      dialog('Contacts', `<div class="api-result">${esc(JSON.stringify(contacts, null, 2))}</div>`, { icon: '👥' });
    } catch (e) {
      dialog('Contact Picker', `<div class="api-result">${esc(e.message)}</div>`, { icon: '👥' });
    }
  };

  /* 14. Payment request */
  R['real-payment'] = () => {
    if (!('PaymentRequest' in window)) {
      return dialog('Payment Request', '<div class="api-result">PaymentRequest unavailable.</div>', { icon: '💳' });
    }
    dialog('Payment Request', `
      <div class="api-result">PaymentRequest available ✅
Supported methods: https://google.com/pay, basic-card</div>
      <div class="sb-muted" style="margin-top:12px">Capability check only — no payment initiated.</div>`, { icon: '💳' });
  };

  /* 15. Credentials check */
  R['real-credentials'] = async () => {
    if (!navigator.credentials) {
      return dialog('Credentials', '<div class="api-result">Credentials API unavailable.</div>', { icon: '🔑' });
    }
    try {
      const cred = await navigator.credentials.get({ password: true, mediation: 'optional' });
      dialog('Credentials', `<div class="api-result">${cred ? '✅ Found stored credential (type: ' + esc(cred.type || 'password') + ')' : 'No stored credentials.'}</div>`, { icon: '🔑' });
    } catch (e) {
      dialog('Credentials', `<div class="api-result">${esc(e.message)}</div>`, { icon: '🔑' });
    }
  };

  /* 16. Full IP leak */
  R['real-ip-leak-full'] = async () => {
    const h = dialog('Full IP Leak', '<div class="api-result" id="ipLeakOut">Collecting ICE candidates…</div>', { icon: '🌍' });
    const out = h?.overlay?.querySelector('#ipLeakOut');
    if (!out) return;
    const lines = [];
    const pub = await fetch('https://api.ipify.org?format=json').then(r => r.json()).catch(() => null);
    lines.push(`Public IP (fetch): ${pub?.ip || 'unavailable'}`);
    lines.push('');
    lines.push('ICE candidates:');
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.createDataChannel('x');
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        lines.push(' ' + e.candidate.candidate);
        out.textContent = lines.join('\n');
      }
    };
    await pc.setLocalDescription(await pc.createOffer());
    await new Promise(r => setTimeout(r, 2500));
    pc.close();
    if (lines.length === 3) lines.push(' (no candidates — strict NAT)');
    out.textContent = lines.join('\n');
  };

  /* 17. ECDSA sign */
  R['real-crypto-sign'] = async () => {
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const data = new TextEncoder().encode('SafeBeef signed message');
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, data);
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey, sig, data);
    const pubJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
    dialog('ECDSA Sign', `
      <div class="api-result">Message: "SafeBeef signed message"
Signature (hex): ${[...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 64)}…
Verified: ${ok ? '✅ yes' : '❌ no'}</div>
      <div class="api-result" style="margin-top:10px">Public JWK:\n${esc(JSON.stringify(pubJwk, null, 2))}</div>`, { icon: '✍️' });
  };

  /* 18. AES-GCM */
  R['real-crypto-encrypt'] = async () => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plain = new TextEncoder().encode('Hello SafeBeef — this is secret.');
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    dialog('AES-GCM', `
      <div class="api-result">Plain: ${esc(new TextDecoder().decode(plain))}
IV: ${[...iv].map(b => b.toString(16).padStart(2, '0')).join('')}
Ciphertext (hex): ${[...new Uint8Array(ct)].map(b => b.toString(16).padStart(2, '0')).join('')}
Decrypted: ${esc(new TextDecoder().decode(dec))}
Roundtrip OK: ${new TextDecoder().decode(dec) === 'Hello SafeBeef — this is secret.' ? '✅' : '❌'}</div>`, { icon: '🔒' });
  };

  /* 19. Secure random */
  R['real-random'] = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    dialog('Secure Random', `
      <div class="api-result">Bytes: ${[...bytes].join(' ')}
Hex: ${[...bytes].map(b => b.toString(16).padStart(2, '0')).join('')}
Base64: ${btoa(String.fromCharCode(...bytes))}
Uint32: ${crypto.getRandomValues(new Uint32Array(1))[0]}</div>`, { icon: '🎲' });
  };

  /* 20. UUID */
  R['real-uuid'] = () => {
    const uuids = Array.from({ length: 5 }, () => crypto.randomUUID?.() || 'unavailable');
    dialog('UUID v4', `<div class="api-result">${uuids.join('\n')}</div>`, { icon: '🆔' });
  };

  /* 21. Broadcast test */
  R['real-broadcast-test'] = () => {
    if (typeof BroadcastChannel === 'undefined') {
      return dialog('Broadcast Test', '<div class="api-result">BroadcastChannel unavailable.</div>', { icon: '📡' });
    }
    const ch = new BroadcastChannel('sb-test-' + Math.random().toString(36).slice(2));
    let received = false;
    ch.onmessage = () => { received = true; ch.close(); };
    ch.postMessage('ping');
    setTimeout(() => {
      ch.close();
      dialog('Broadcast Test', `<div class="api-result">BroadcastChannel available ✅\nRound-trip: ${received ? '✅ received in same tab (unexpected but OK)' : '✅ no echo (correct — BroadcastChannel skips sender)'}</div>`, { icon: '📡' });
    }, 400);
  };

  /* 22. Web Worker */
  R['real-workers'] = () => {
    if (typeof Worker === 'undefined') {
      return dialog('Web Worker', '<div class="api-result">Worker unavailable.</div>', { icon: '⚙️' });
    }
    const code = `self.onmessage = (e) => {
      let sum = 0;
      for (let i = 0; i < e.data; i++) sum += i;
      self.postMessage(sum);
    };`;
    const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    const w = new Worker(url);
    const start = performance.now();
    w.onmessage = (e) => {
      const ms = (performance.now() - start).toFixed(2);
      URL.revokeObjectURL(url);
      w.terminate();
      dialog('Web Worker', `<div class="api-result">Sum 0..999999 = ${e.data}\nTime: ${ms} ms\nWorker terminated.</div>`, { icon: '⚙️' });
    };
    w.postMessage(1000000);
  };

  /* 23. WebAssembly */
  R['real-wasm'] = () => {
    if (typeof WebAssembly === 'undefined') {
      return dialog('WebAssembly', '<div class="api-result">WebAssembly unavailable.</div>', { icon: '⚡' });
    }
    // Minimal wasm module: exports add(i32,i32) -> i32
    const bytes = new Uint8Array([
      0x00,0x61,0x73,0x6d,0x01,0x00,0x00,0x00,
      0x01,0x07,0x01,0x60,0x02,0x7f,0x7f,0x01,0x7f,
      0x03,0x02,0x01,0x00,
      0x07,0x07,0x01,0x03,0x61,0x64,0x64,0x00,0x00,
      0x0a,0x09,0x01,0x07,0x00,0x20,0x00,0x20,0x01,0x6a,0x0b
    ]);
    WebAssembly.instantiate(bytes).then(({ instance }) => {
      const r = instance.exports.add(20, 22);
      dialog('WebAssembly', `<div class="api-result">WASM available ✅\nTiny module instantiated.\nadd(20, 22) = ${r}</div>`, { icon: '⚡' });
    }).catch(e => {
      dialog('WebAssembly', `<div class="api-result">Error: ${esc(e.message)}</div>`, { icon: '⚡' });
    });
  };

  /* 24. WebGL2 */
  R['real-webgl'] = () => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) {
      return dialog('WebGL2', '<div class="api-result">WebGL unavailable.</div>', { icon: '🎮' });
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const version = gl.getParameter(gl.VERSION);
    dialog('WebGL2', `<div class="api-result">Vendor: ${esc(vendor)}\nRenderer: ${esc(renderer)}\nVersion: ${esc(version)}\nMax texture: ${gl.getParameter(gl.MAX_TEXTURE_SIZE)}</div>`, { icon: '🎮' });
  };

  /* 25. Audio analyser */
  R['real-audio-analyser'] = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const h = window.showDialog({
        title: 'Audio Analyser', icon: '🎵', subtitle: 'Live FFT',
        bodyHtml: `<div class="api-result" id="aaOut">Listening…</div>
          <canvas id="aaCanvas" width="480" height="150" style="width:100%;background:#000;border-radius:8px;border:1px solid var(--border-2);margin-top:10px"></canvas>`,
        buttons: [{ label: 'Stop', class: 'danger', action: () => {
          stream.getTracks().forEach(t => t.stop());
          ctx.close();
          h.close();
        }}, { label: 'Close', action: 'close' }],
      });
      const out = h.overlay.querySelector('#aaOut');
      const canvas = h.overlay.querySelector('#aaCanvas');
      const cctx = canvas.getContext('2d');
      const draw = () => {
        if (!document.body.contains(canvas)) { return; }
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(data);
        cctx.fillStyle = '#000'; cctx.fillRect(0, 0, canvas.width, canvas.height);
        let peak = 0, peakIdx = 0;
        const barW = canvas.width / data.length;
        for (let i = 0; i < data.length; i++) {
          const v = data[i];
          if (v > peak) { peak = v; peakIdx = i; }
          const bh = (v / 255) * canvas.height;
          cctx.fillStyle = `hsl(${200 + (v / 255) * 160}, 100%, 60%)`;
          cctx.fillRect(i * barW, canvas.height - bh, barW - 1, bh);
        }
        const domFreq = (peakIdx * ctx.sampleRate / analyser.fftSize).toFixed(0);
        out.textContent = `Peak: ${peak}/255\nDominant frequency: ${domFreq} Hz\nSample rate: ${ctx.sampleRate} Hz`;
      };
      draw();
    } catch (e) {
      toast('Mic denied', e.message, 'error');
    }
  };

  /* 26. Canvas hash */
  R['real-canvas-hash'] = () => {
    const c = document.createElement('canvas');
    c.width = 300; c.height = 60;
    const ctx = c.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '16px "Arial"';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('SafeBeef 🐝', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.font = '18px "Times New Roman"';
    ctx.fillText('SafeBeef 🐝', 4, 17);
    const dataURL = c.toDataURL();
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataURL)).then(h => {
      const hex = [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
      window.showDialog({
        title: 'Canvas Hash', icon: '🖼️', subtitle: 'Fingerprint',
        bodyHtml: `<img src="${dataURL}" style="width:100%;border-radius:8px;border:1px solid var(--border-2)">
          <div class="api-result" style="margin-top:10px">SHA-256: ${hex}</div>`,
        buttons: [{ label: 'Close', action: 'close' }],
      });
    });
  };

  /* 27. Audio hash */
  R['real-audio-hash'] = async () => {
    try {
      const ctx = new OfflineAudioContext(1, 5000, 44100);
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 10000;
      const comp = ctx.createDynamicsCompressor();
      osc.connect(comp); comp.connect(ctx.destination);
      osc.start(0);
      const buf = await ctx.startRendering();
      const ch = buf.getChannelData(0);
      let sig = 0;
      for (let i = 0; i < ch.length; i += 100) sig += Math.abs(ch[i]);
      crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(sig))).then(h => {
        const hex = [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
        dialog('Audio Hash', `<div class="api-result">Signature: ${sig.toFixed(6)}\nSHA-256: ${hex}</div>`, { icon: '🔉' });
      });
    } catch (e) {
      dialog('Audio Hash', `<div class="api-result">Error: ${esc(e.message)}</div>`, { icon: '🔉' });
    }
  };

  /* 28. Font detect */
  R['real-font-check'] = () => {
    const fonts = ['Arial','Verdana','Times New Roman','Courier New','Georgia','Comic Sans MS','Impact','Trebuchet MS','Webdings','Lucida Console','Monaco','Consolas','Tahoma','Brush Script MT','Palatino'];
    const base = ['monospace','sans-serif','serif'];
    const test = 'mmmmmmmmmlli';
    const c = document.createElement('canvas').getContext('2d');
    function measure(font) { c.font = `30px "${font}", monospace`; return c.measureText(test).width; }
    const baseW = Math.min(...base.map(measure));
    const found = fonts.filter(f => measure(f) !== baseW);
    dialog('Font Detect', `<div class="api-result">Detected (${found.length}):\n${found.join(', ') || '(none)'}</div>`, { icon: '🔤' });
  };

  /* 29. Battery full */
  R['real-battery-full'] = async () => {
    if (!navigator.getBattery) {
      return dialog('Battery', '<div class="api-result">Battery Status API unavailable.</div>', { icon: '🔋' });
    }
    const b = await navigator.getBattery();
    dialog('Battery', `<div class="api-result">${esc(JSON.stringify({
      level: (b.level * 100).toFixed(0) + '%',
      charging: b.charging,
      chargingTime: b.chargingTime + 's',
      dischargingTime: b.dischargingTime + 's',
    }, null, 2))}</div>`, { icon: '🔋' });
  };

  /* 30. Timezone offsets */
  R['real-timezone-offset'] = () => {
    const rows = [];
    for (let m = 0; m < 12; m++) {
      const d = new Date(2024, m, 15);
      const off = -d.getTimezoneOffset() / 60;
      rows.push(`${d.toLocaleString('en', { month: 'short' })} 2024: UTC${off >= 0 ? '+' : ''}${off}`);
    }
    dialog('Timezone Offsets', `<div class="api-result">${rows.join('\n')}</div>`, { icon: '🕐' });
  };

  /* 31. Intl collation */
  R['real-intl-collation'] = () => {
    const items = ['zebra', 'Apple', 'banana', 'ápple', 'Zebra', 'apple'];
    const sorted = [...items].sort(new Intl.Collator(undefined, { sensitivity: 'base' }).compare);
    dialog('Collation', `<div class="api-result">Locale: ${Intl.DateTimeFormat().resolvedOptions().locale}\nOriginal: ${items.join(', ')}\nSorted: ${sorted.join(', ')}</div>`, { icon: '🔠' });
  };

  /* 32. Native dialog element */
  R['real-dialog-show'] = () => {
    const dlg = document.createElement('dialog');
    dlg.style.cssText = 'background:var(--surface);color:var(--text);border:1px solid var(--border-2);border-radius:12px;padding:24px;max-width:400px';
    dlg.innerHTML = `
      <h3 style="margin-bottom:12px">Native &lt;dialog&gt;</h3>
      <p style="color:var(--text-2);font-size:13px;margin-bottom:16px">This is the browser's built-in dialog element with backdrop.</p>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button class="btn" id="dlgClose">Close</button>
      </div>`;
    document.body.appendChild(dlg);
    dlg.showModal();
    dlg.querySelector('#dlgClose').addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', () => dlg.remove());
  };

  /* 33. Native popover */
  R['real-popover'] = () => {
    if (!('popover' in HTMLElement.prototype)) {
      return toast('Unsupported', 'Popover API unavailable', 'warn');
    }
    const pop = document.createElement('div');
    pop.popover = 'auto';
    pop.style.cssText = 'padding:16px;border:1px solid var(--border-2);border-radius:10px;background:var(--surface);color:var(--text)';
    pop.textContent = '🎈 This is a native popover!';
    document.body.appendChild(pop);
    pop.showPopover();
    setTimeout(() => { try { pop.hidePopover(); pop.remove(); } catch(e){} }, 3000);
  };

  /* 34. Fullscreen element */
  R['real-fullscreen-element'] = () => {
    const el = document.querySelector('.modules-wrap') || document.body;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(e => toast('Fullscreen failed', e.message, 'error'));
    } else {
      document.exitFullscreen();
    }
  };

  /* 35. Picture-in-Picture */
  R['real-pip'] = async () => {
    if (!document.pictureInPictureEnabled) {
      return toast('Unsupported', 'PiP unavailable', 'warn');
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 400; canvas.height = 300;
      const ctx = canvas.getContext('2d');
      let angle = 0;
      const draw = () => {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 400, 300);
        ctx.fillStyle = `hsl(${angle}, 80%, 60%)`;
        ctx.beginPath();
        ctx.arc(200 + Math.cos(angle * Math.PI / 180) * 80, 150 + Math.sin(angle * Math.PI / 180) * 80, 40, 0, Math.PI * 2);
        ctx.fill();
        angle = (angle + 3) % 360;
        if (document.pictureInPictureElement === video) requestAnimationFrame(draw);
      };
      const stream = canvas.captureStream(30);
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.play();
      draw();
      await video.requestPictureInPicture();
      video.addEventListener('leavepictureinpicture', () => {
        stream.getTracks().forEach(t => t.stop());
        video.remove();
      });
      toast('PiP', 'Right-click the PiP window → Back to tab', 'success');
    } catch (e) {
      toast('PiP failed', e.message, 'error');
    }
  };

  /* 36. Clipboard watch */
  R['real-clip-watch'] = async () => {
    if (!navigator.clipboard?.readText) {
      return toast('Unsupported', 'Clipboard API unavailable', 'warn');
    }
    try {
      await navigator.clipboard.readText();
      toast('Watching', 'Copy something — updates every 2s', 'success');
      const start = Date.now();
      let last = '';
      const iv = setInterval(async () => {
        try {
          const t = await navigator.clipboard.readText();
          if (t !== last && t) {
            last = t;
            window.SafeBeef?.log?.(`<span style="color:var(--cyan-2)">CLIP</span> "${esc(t.slice(0, 40))}"`);
          }
        } catch (e) {}
        if (Date.now() - start > 30000) clearInterval(iv);
      }, 2000);
    } catch (e) {
      toast('Clipboard blocked', 'Permission denied', 'warn');
    }
  };

  /* 37. Page visibility */
  R['real-visibility'] = () => {
    const h = window.showDialog({
      title: 'Page Visibility', icon: '👁️', subtitle: 'Live state',
      bodyHtml: `<div class="api-result" id="visOut">State: ${document.visibilityState}\nHidden: ${document.hidden}\nTimestamp: ${Date.now()}</div>
        <div class="sb-muted" style="margin-top:10px">Switch tabs and come back — this updates live.</div>`,
      buttons: [{ label: 'Close', action: 'close' }],
    });
    const out = h.overlay.querySelector('#visOut');
    const onChange = () => {
      if (out) out.textContent = `State: ${document.visibilityState}\nHidden: ${document.hidden}\nTimestamp: ${Date.now()}`;
    };
    document.addEventListener('visibilitychange', onChange);
    h.overlay.addEventListener('click', (e) => {
      if (e.target === h.overlay) document.removeEventListener('visibilitychange', onChange);
    });
  };

  /* 38. Keyboard layout */
  R['real-keyboard-layout'] = async () => {
    if (!navigator.keyboard?.getLayoutMap) {
      return dialog('Keyboard Layout', '<div class="api-result">Keyboard Map API unavailable.</div>', { icon: '⌨️' });
    }
    try {
      const map = await navigator.keyboard.getLayoutMap();
      const rows = [];
      map.forEach((v, k) => { if (rows.length < 30) rows.push(`${k} → ${v}`); });
      dialog('Keyboard Layout', `<div class="api-result">${esc(rows.join('\n'))}</div>`, { icon: '⌨️' });
    } catch (e) {
      dialog('Keyboard Layout', `<div class="api-result">${esc(e.message)}</div>`, { icon: '⌨️' });
    }
  };

  /* 39. Schedule notification */
  R['real-schedule-notif'] = async () => {
    if (!('Notification' in window)) {
      return toast('Unsupported', 'Notifications unavailable', 'warn');
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return toast('Denied', 'Notification permission denied', 'warn');
    toast('Scheduled', 'Notification in 5 seconds…', 'info', 3000);
    setTimeout(() => {
      try { new Notification('SafeBeef Scheduled', { body: 'This is a delayed notification.' }); }
      catch (e) { toast('Notification failed', e.message, 'error'); }
    }, 5000);
  };

  /* Public API */
  window.RealAPIs = {
    has(id) { return typeof R[id] === 'function'; },
    run(id) {
      const fn = R[id];
      if (!fn) return false;
      try { fn(); return true; }
      catch (e) { console.error('[real-api]', id, e); toast('API error', e.message, 'error'); return false; }
    },
    list() { return Object.keys(R); }
  };
})();

