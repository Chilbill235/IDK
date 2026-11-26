/* prank-engine.js — SafeBeef v24 — All fake/prank/spooky module implementations */
(function () {
  'use strict';

  const COLORS = ['#ff5a6e','#ffb340','#34d97f','#4d9dff','#b586ff','#2ee6d6','#ff66ff','#ffe066'];
  const $ = (id) => document.getElementById(id);
  const toast = (t, m, ty, d) => window.showToast?.(t, m, ty, d);

  function injectStyle(id, css) {
    let s = document.getElementById(id);
    if (!s) { s = document.createElement('style'); s.id = id; document.head.appendChild(s); }
    s.textContent = css;
    return s;
  }

  /* --- Sound --- */
  let _audioCtx = null;
  function audioCtx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return _audioCtx;
  }
  function beep(freq = 440, dur = 0.1, type = 'sine', vol = 0.15) {
    try {
      const ctx = audioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + dur);
    } catch (e) {}
  }
  function scream() {
    try {
      const ctx = audioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.7);
    } catch (e) {}
  }

  /* --- Overlay --- */
  function overlay(html, { autoMs = 0, clickClose = true, cls = '' } = {}) {
    const el = document.createElement('div');
    el.className = 'sb-overlay-fullscreen ' + cls;
    el.innerHTML = html;
    if (clickClose) {
      el.addEventListener('click', (e) => {
        if (e.target === el || e.target.closest('[data-dismiss]')) el.remove();
      });
    }
    document.body.appendChild(el);
    if (autoMs) setTimeout(() => el.remove(), autoMs);
    return el;
  }

  /* --- Scanlines --- */
  function scanlines(lines, { interval = 180, tone = '#4d9dff', done, sound = false } = {}) {
    const host = document.createElement('div');
    host.className = 'sb-scan-host';
    host.innerHTML = '<pre class="sb-scan-pre" style="color:' + tone + '"></pre>';
    document.body.appendChild(host);
    const pre = host.querySelector('pre');
    let i = 0;
    const iv = setInterval(() => {
      if (i >= lines.length) {
        clearInterval(iv);
        setTimeout(() => { done && done(host); }, 800);
        return;
      }
      pre.textContent += lines[i++] + '\n';
      pre.scrollTop = pre.scrollHeight;
      if (sound) beep(1200, 0.02, 'square', 0.05);
    }, interval);
    host.addEventListener('click', () => { clearInterval(iv); host.remove(); });
    return host;
  }

  /* --- Particles --- */
  function particleCanvas(opts) {
    const c = document.createElement('canvas');
    c.className = 'sb-matrix';
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const particles = [];
    const { count = 100, speed = 3, size = 3, colors = COLORS, gravity = 0, spawn, chars } = opts;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * c.width,
        y: spawn === 'top' ? -10 : Math.random() * c.height,
        vx: spawn === 'top' ? (Math.random() - 0.5) * 2 : (Math.random() - 0.5) * speed * 2,
        vy: spawn === 'top' ? 1 + Math.random() * 3 : (Math.random() - 0.5) * speed * 2,
        life: 1,
        decay: 1 / (60 * 4),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: size * (0.5 + Math.random()),
      });
    }
    let frames = 0;
    const maxFrames = opts.maxFrames || 600;
    const iv = setInterval(() => {
      ctx.fillStyle = opts.fade || 'rgba(0,0,0,0.1)';
      ctx.fillRect(0, 0, c.width, c.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += gravity;
        p.life -= p.decay;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        if (opts.shape === 'rect') ctx.fillRect(p.x, p.y, p.size, p.size * 0.6);
        else if (opts.shape === 'text' && chars) {
          ctx.font = p.size * 6 + 'px monospace';
          ctx.fillText(chars[Math.floor(Math.random() * chars.length)], p.x, p.y);
        } else {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        }
        if (p.life <= 0 || p.y > c.height + 50) particles.splice(i, 1);
      }
      ctx.globalAlpha = 1;
      frames++;
      if (frames > maxFrames) { clearInterval(iv); c.remove(); }
    }, 30);
    return c;
  }

  const P = {};

  /* ================= PRANKS ================= */

  P['fake-bsod'] = () => {
    beep(200, 0.4, 'square', 0.2);
    overlay(`
      <div class="sb-bsod">
        <div class="sb-bsod-emoji">:(</div>
        <div class="sb-bsod-text">
          Your PC ran into a problem and needs to restart. We're just collecting some error info, and then we'll restart for you.
          <br><br><strong><span id="sbBsodPct">0</span>% complete</strong>
          <br><br><span class="sb-muted">(Prank — click anywhere to dismiss)</span>
        </div>
      </div>`, { clickClose: false }).addEventListener('click', (e) => {
        if (e.target === e.currentTarget) e.currentTarget.remove();
      });
    let pct = 0;
    const iv = setInterval(() => {
      pct = Math.min(99, pct + Math.floor(Math.random() * 3) + 1);
      const el = document.getElementById('sbBsodPct');
      if (el) el.textContent = pct;
      if (!el) clearInterval(iv);
    }, 400);
  };

  P['fake-update'] = () => {
    const host = overlay(`
      <div class="sb-update">
        <div class="sb-update-icon">🔄</div>
        <div class="sb-update-title">Working on updates</div>
        <div class="sb-update-pct" id="sbUpdPct">0% complete</div>
        <div class="sb-update-hint">Don't turn off your PC.</div>
        <div class="sb-muted" data-dismiss style="margin-top:60px;cursor:pointer;padding:10px">(click to cancel prank)</div>
      </div>`, { clickClose: false });
    host.addEventListener('click', (e) => { if (e.target === host) host.remove(); });
    let pct = 0;
    const iv = setInterval(() => {
      pct = Math.min(99, pct + Math.floor(Math.random() * 3) + 1);
      const el = document.getElementById('sbUpdPct');
      if (el) el.textContent = pct + '% complete';
      if (!el) clearInterval(iv);
    }, 700);
  };

  P['fake-virus'] = () => {
    beep(300, 0.2, 'square', 0.1);
    const box = document.createElement('div');
    box.className = 'sb-virus';
    box.innerHTML = `
      <div class="sb-virus-emoji">🦠</div>
      <div class="sb-virus-title">VIRUS DETECTED</div>
      <div class="sb-virus-body">
        Your device has been infected with <strong>7 viruses</strong>!<br>
        <span class="sb-muted">(Prank — nothing is wrong.)</span>
      </div>
      <button class="btn primary" id="sbVirusClose" style="width:100%">OK, phew</button>`;
    document.body.appendChild(box);
    box.querySelector('#sbVirusClose').onclick = () => box.remove();
    setTimeout(() => box.remove(), 15000);
  };

  P['fake-ransom'] = () => scanlines([
    '> Scanning filesystem...',
    '> Found 14,231 files',
    '> Generating AES-256 key...',
    '> Encrypting C:\\Users\\Documents\\...',
    '> Encrypting C:\\Users\\Pictures\\...',
    '> Appending .locked extension...',
    '> Sending key to attacker...',
    '> [||||||||||] 100%',
    '<span style="color:#5cea9f">> SIMULATION ONLY. Your files are safe.</span>',
  ], { interval: 280, tone: '#ff8294', sound: true });

  P['fake-crack'] = () => {
    beep(150, 0.3, 'sawtooth', 0.2);
    const crack = document.createElement('div');
    crack.className = 'sb-crack';
    let paths = '';
    const cx = 500, cy = 500;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.3;
      const r = 400 + Math.random() * 500;
      const ex = cx + Math.cos(angle) * r;
      const ey = cy + Math.sin(angle) * r;
      const mx = cx + Math.cos(angle + 0.1) * r * 0.5;
      const my = cy + Math.sin(angle + 0.1) * r * 0.5;
      paths += `<path d="M${cx},${cy} L${mx},${my} L${ex},${ey}"/>`;
      for (let b = 0; b < 2; b++) {
        const ba = angle + (Math.random() - 0.5) * 0.6;
        const br = 150 + Math.random() * 200;
        paths += `<path d="M${mx},${my} L${mx + Math.cos(ba) * br},${my + Math.sin(ba) * br}"/>`;
      }
    }
    crack.innerHTML = `
      <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none">
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <g stroke="#fff" stroke-width="1.5" fill="none" opacity="0.9" filter="url(#glow)">${paths}</g>
        <circle cx="${cx}" cy="${cy}" r="30" fill="rgba(255,255,255,0.15)"/>
        <circle cx="${cx}" cy="${cy}" r="8" fill="#fff"/>
      </svg>`;
    document.body.appendChild(crack);
    setTimeout(() => crack.remove(), 3500);
  };

  P['fake-matrix'] = () => {
    const c = document.createElement('canvas');
    c.className = 'sb-matrix';
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const cols = Math.floor(c.width / 16);
    const drops = Array(cols).fill(0).map(() => Math.random() * -100);
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01ABCDEF01';
    let frames = 0;
    const iv = setInterval(() => {
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.font = '16px monospace';
      for (let i = 0; i < drops.length; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const y = drops[i] * 16;
        ctx.fillStyle = y < 30 ? '#fff' : '#0f0';
        ctx.fillText(ch, i * 16, y);
        if (y > c.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      if (++frames > 400) { clearInterval(iv); c.remove(); }
    }, 40);
  };

  P['fake-hacked'] = () => {
    beep(600, 0.15, 'square', 0.15);
    setTimeout(() => beep(400, 0.15, 'square', 0.15), 150);
    overlay(`
      <div class="sb-hacked">
        <div class="sb-hacked-title">⚠ HACKED ⚠</div>
        <div class="sb-hacked-body">
          <p>Your system has been compromised.</p>
          <p class="sb-muted">IP: 192.168.x.x — Session: ${(window.SafeBeef?.state?.active?.name) || 'unknown'}</p>
          <p class="sb-muted" data-dismiss style="cursor:pointer;margin-top:30px">(click to dismiss — this is a prank)</p>
        </div>
      </div>`);
  };

  P['fake-scan'] = () => {
    const lines = ['> Antivirus: Deep Scan', '> Loading signature database (4.2M signatures)...'];
    const files = ['C:\\Windows\\System32\\kernel32.dll','C:\\Windows\\System32\\ntdll.dll','C:\\Program Files\\Browser\\browser.exe','C:\\Users\\user\\Documents\\report.docx','C:\\Windows\\Fonts\\arial.ttf','C:\\Windows\\System32\\drivers\\etc\\hosts'];
    files.forEach((f, i) => lines.push(`> [${i + 1}/${files.length}] Scanning ${f}`));
    lines.push('> 14,231 files scanned', '> 0 threats found', '<span style="color:#5cea9f">> Scan complete. All clear.</span>');
    scanlines(lines, { interval: 200, sound: true });
  };

  P['fake-delete'] = () => scanlines([
    '> WARNING: Deletion in progress',
    '> Deleting C:\\Windows\\System32\\config\\SAM',
    '> Deleting C:\\Users\\user\\Documents\\important.docx',
    '> Deleting C:\\Users\\user\\.ssh\\id_rsa',
    '> 1,024 files deleted',
    '<span style="color:#5cea9f">> SIMULATION ONLY. Nothing was deleted.</span>',
  ], { interval: 320, tone: '#ff8294' });

  P['fake-trojan'] = () => scanlines([
    '⚠ THREAT FOUND ⚠','',
    'Threat name: Trojan.Win32.Agent.xyz',
    'Severity: HIGH',
    'Location: C:\\Users\\AppData\\Local\\Temp\\svchost.exe',
    'Status: Simulated — no real threat','',
    '<span style="color:#5cea9f">(click to dismiss)</span>',
  ], { interval: 220, tone: '#ff5a6e' });

  P['fake-cmd'] = () => {
    const box = document.createElement('div');
    box.className = 'sb-cmd';
    box.innerHTML = '<pre class="sb-cmd-pre"></pre>';
    document.body.appendChild(box);
    const pre = box.querySelector('pre');
    const lines = [
      'Microsoft Windows [Version 10.0.19045.3803]',
      '(c) Microsoft Corporation. All rights reserved.','',
      'C:\\Users\\you> whoami','desktop-9f3k2\\you','',
      'C:\\Users\\you> dir',' Directory of C:\\Users\\you',
      '  <DIR>          .ssh','  <DIR>          Documents',
      '  <DIR>          Pictures','  0 File(s)      0 bytes','',
      'C:\\Users\\you> _',
    ];
    let i = 0;
    const iv = setInterval(() => {
      if (i >= lines.length) { clearInterval(iv); return; }
      pre.textContent += lines[i++] + '\n';
      pre.scrollTop = pre.scrollHeight;
      beep(800 + Math.random() * 200, 0.02, 'square', 0.03);
    }, 180);
    box.addEventListener('click', () => { clearInterval(iv); box.remove(); });
    setTimeout(() => box.remove(), 12000);
  };

  P['fake-fbi'] = () => {
    beep(300, 0.2, 'sawtooth', 0.2);
    setTimeout(() => beep(300, 0.2, 'sawtooth', 0.2), 400);
    overlay(`
      <div class="sb-fbi">
        <div class="sb-fbi-badge">🚔</div>
        <div class="sb-fbi-title">FBI WARNING</div>
        <div class="sb-fbi-body">
          Your IP address has been logged.<br>
          A fine of up to $100,000 may apply.<br>
          <br><span class="sb-muted">(This is a prank. No agency is involved.)</span>
          <br><br><span data-dismiss style="cursor:pointer;color:var(--accent)">(click to dismiss)</span>
        </div>
      </div>`);
  };

  P['fake-glitch'] = () => {
    injectStyle('sb-glitch-style', `
      @keyframes sbGlitch {
        0%,100% { filter: none; transform: none; }
        20% { filter: hue-rotate(90deg) saturate(2); transform: translateX(-4px) skewX(2deg); }
        40% { filter: hue-rotate(180deg) invert(0.2); transform: translateX(4px) skewX(-2deg); }
        60% { filter: hue-rotate(270deg) contrast(1.5); transform: translateY(2px); }
        80% { filter: hue-rotate(45deg) brightness(1.2); transform: translateY(-2px); }
      }
      .sb-glitch { animation: sbGlitch 0.3s steps(1) infinite !important; }
    `);
    document.body.classList.add('sb-glitch');
    setTimeout(() => { document.body.classList.remove('sb-glitch'); setTimeout(() => $('sb-glitch-style')?.remove(), 100); }, 3000);
  };

  P['fake-glitch2'] = () => {
    injectStyle('sb-rgb-split', `
      .sb-rgb-split { position:relative; }
      .sb-rgb-split::before, .sb-rgb-split::after {
        content:''; position:fixed; inset:0; pointer-events:none; z-index:99990; mix-blend-mode: screen;
      }
      .sb-rgb-split::before { background: linear-gradient(to right, rgba(255,0,0,0.18), transparent 50%); transform: translateX(-4px); }
      .sb-rgb-split::after  { background: linear-gradient(to right, transparent 50%, rgba(0,150,255,0.18)); transform: translateX(4px); }
    `);
    document.body.classList.add('sb-rgb-split');
    setTimeout(() => { document.body.classList.remove('sb-rgb-split'); setTimeout(() => $('sb-rgb-split')?.remove(), 100); }, 3000);
  };

  P['fake-snow'] = () => {
    const c = document.createElement('canvas');
    c.className = 'sb-matrix';
    c.width = window.innerWidth; c.height = window.innerHeight;
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(c.width, c.height);
    let frames = 0;
    const iv = setInterval(() => {
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i+1] = img.data[i+2] = v;
        img.data[i+3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      if (++frames > 60) { clearInterval(iv); c.remove(); }
    }, 50);
  };

  P['fake-gravity'] = () => {
    injectStyle('sb-gravity-style', `
      @keyframes sbFloat {
        0% { transform: translate(0,0) rotate(0); opacity:1; }
        100% { transform: translate(var(--tx, 0), 100vh) rotate(var(--r, 360deg)); opacity:0; }
      }
      .sb-float { animation: sbFloat 2.5s ease-in forwards !important; }
    `);
    document.querySelectorAll('.module, .zombie, .m-cat-title, .pane-head').forEach((el, i) => {
      el.style.setProperty('--tx', (Math.random() - 0.5) * 400 + 'px');
      el.style.setProperty('--r', (Math.random() - 0.5) * 720 + 'deg');
      el.style.animationDelay = (i * 0.03) + 's';
      el.classList.add('sb-float');
      setTimeout(() => el.classList.remove('sb-float'), 3000 + i * 30);
    });
    setTimeout(() => $('sb-gravity-style')?.remove(), 4000);
  };

  P['fake-invert'] = () => {
    injectStyle('sb-invert-style', `.sb-invert { filter: invert(1) hue-rotate(180deg) !important; }`);
    document.documentElement.classList.toggle('sb-invert');
  };

  P['fake-burn'] = () => {
    injectStyle('sb-burn-style', `
      @keyframes sbBurn { 0% { opacity:0.9; } 100% { opacity:0.5; } }
      .sb-burn::after {
        content:''; position:fixed; inset:0; pointer-events:none; z-index:99990;
        background: radial-gradient(ellipse at center, rgba(255,140,0,0.35), rgba(255,60,0,0.15) 60%, transparent 80%);
        animation: sbBurn 2s ease-in forwards;
      }
    `);
    document.body.classList.add('sb-burn');
    setTimeout(() => { document.body.classList.remove('sb-burn'); setTimeout(() => $('sb-burn-style')?.remove(), 100); }, 3500);
  };

  P['fake-spin'] = () => {
    const el = document.querySelector('.workspace') || document.body;
    el.style.transition = 'transform 2s cubic-bezier(.5,.1,.5,1)';
    el.style.transform = 'rotate(360deg)';
    setTimeout(() => { el.style.transform = ''; }, 2200);
  };

  P['fake-flip'] = () => {
    document.documentElement.style.transition = 'transform 0.7s ease';
    document.documentElement.style.transform = 'rotate(180deg)';
    setTimeout(() => { document.documentElement.style.transform = ''; }, 3500);
  };

  P['fake-shake'] = () => {
    const el = document.querySelector('.workspace') || document.body;
    el.style.transition = 'transform 0.05s linear';
    let n = 0;
    const iv = setInterval(() => {
      el.style.transform = `translate(${(Math.random()-0.5)*24}px, ${(Math.random()-0.5)*24}px) rotate(${(Math.random()-0.5)*2}deg)`;
      if (++n > 60) { clearInterval(iv); el.style.transform = ''; }
    }, 50);
  };

  P['fake-zoom'] = () => {
    const el = document.querySelector('.workspace') || document.body;
    el.style.transition = 'transform 6s ease-in';
    el.style.transform = 'scale(2.5)';
    setTimeout(() => { el.style.transform = ''; }, 6200);
  };

  P['fake-zoomout'] = () => {
    const el = document.querySelector('.workspace') || document.body;
    el.style.transition = 'transform 6s ease-in';
    el.style.transform = 'scale(0.35)';
    setTimeout(() => { el.style.transform = ''; }, 6200);
  };

  P['fake-panic'] = () => {
    injectStyle('sb-panic-style', `
      @keyframes sbPanic { 0%,100% { background:#000; } 50% { background:#ff0000; } }
      .sb-panic { animation: sbPanic 0.25s steps(1) infinite !important; }
    `);
    document.body.classList.add('sb-panic');
    beep(880, 0.1, 'square', 0.1);
    setTimeout(() => { document.body.classList.remove('sb-panic'); setTimeout(() => $('sb-panic-style')?.remove(), 100); }, 3500);
  };

  P['fake-cops'] = () => {
    injectStyle('sb-cops-style', `
      @keyframes sbCops {
        0%,49% { box-shadow: inset 0 0 200px 60px rgba(255,0,0,0.6); }
        50%,100% { box-shadow: inset 0 0 200px 60px rgba(0,80,255,0.6); }
      }
      .sb-cops { animation: sbCops 0.4s steps(1) infinite !important; }
    `);
    document.body.classList.add('sb-cops');
    setTimeout(() => { document.body.classList.remove('sb-cops'); setTimeout(() => $('sb-cops-style')?.remove(), 100); }, 3500);
  };

  P['fake-lava'] = () => {
    const prevBg = document.body.style.background;
    document.body.style.background = 'radial-gradient(circle at 50% 100%, #ff2200, #7a0000)';
    const banner = document.createElement('div');
    banner.className = 'sb-banner';
    banner.textContent = '🌋 THE FLOOR IS LAVA 🌋';
    document.body.appendChild(banner);
    setTimeout(() => { banner.remove(); document.body.style.background = prevBg; }, 5000);
  };

  P['fake-disco'] = () => {
    let i = 0;
    const iv = setInterval(() => {
      document.body.style.background = `hsl(${i * 60 % 360}, 100%, 50%)`;
      if (++i > 60) { clearInterval(iv); document.body.style.background = ''; }
    }, 100);
  };

  P['fake-rain'] = () => particleCanvas({ count: 80, spawn: 'top', speed: 4, size: 12, shape: 'text', chars: ['😀','😂','🎉','🐝','💖','⭐','🔥','🍕','🐶','🐱'], gravity: 0.15, maxFrames: 200, fade: 'rgba(0,0,0,0.05)' });
  P['fake-confetti'] = () => particleCanvas({ count: 200, spawn: 'top', speed: 4, size: 4, shape: 'rect', gravity: 0.1, maxFrames: 200, fade: 'rgba(0,0,0,0)' });

  P['fake-fireworks'] = () => {
    const c = document.createElement('canvas');
    c.className = 'sb-matrix';
    c.style.background = '#000';
    c.width = window.innerWidth; c.height = window.innerHeight;
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const parts = [];
    let frames = 0;
    const iv = setInterval(() => {
      if (frames % 8 === 0) {
        const x = Math.random() * c.width;
        const y = Math.random() * c.height * 0.5;
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        for (let i = 0; i < 40; i++) {
          const angle = (Math.PI * 2 * i) / 40;
          const speed = 2 + Math.random() * 4;
          parts.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, life: 1, color });
        }
      }
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, c.width, c.height);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life -= 0.012;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
        if (p.life <= 0) parts.splice(i, 1);
      }
      ctx.globalAlpha = 1;
      if (++frames > 400) { clearInterval(iv); c.remove(); }
    }, 30);
  };

  P['fake-trail'] = () => {
    injectStyle('sb-trail-style', `
      @keyframes sbTrailFade { from { opacity:1; transform:scale(1); } to { opacity:0; transform:scale(0); } }
      .sb-trail-dot { position:fixed; width:12px; height:12px; border-radius:50%; pointer-events:none; z-index:99998; animation: sbTrailFade 0.8s ease-out forwards; }
    `);
    let idx = 0;
    const handler = (e) => {
      const dot = document.createElement('div');
      dot.className = 'sb-trail-dot';
      dot.style.left = (e.clientX - 6) + 'px';
      dot.style.top = (e.clientY - 6) + 'px';
      dot.style.background = COLORS[idx++ % COLORS.length];
      dot.style.boxShadow = `0 0 12px ${dot.style.background}`;
      document.body.appendChild(dot);
      setTimeout(() => dot.remove(), 800);
    };
    document.addEventListener('mousemove', handler);
    setTimeout(() => { document.removeEventListener('mousemove', handler); }, 10000);
    toast('🌈 Cursor trail', 'Move your mouse — 10s', 'purple', 3000);
  };

  P['fake-cursor'] = () => {
    const prev = document.body.style.cursor;
    document.body.style.cursor = "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22><text y=%2224%22 font-size=%2224%22>💩</text></svg>') 16 16, auto";
    setTimeout(() => { document.body.style.cursor = prev; }, 8000);
  };

  P['fake-coffee'] = () => {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:99990;pointer-events:none';
    el.innerHTML = `
      <svg width="100%" height="100%" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid meet">
        <defs><radialGradient id="cg"><stop offset="0%" stop-color="#5a2f15"/><stop offset="100%" stop-color="#2a1508"/></radialGradient></defs>
        <g fill="url(#cg)" opacity="0.9">
          <ellipse cx="400" cy="620" rx="320" ry="60"/>
          <ellipse cx="300" cy="580" rx="80" ry="30"/>
          <ellipse cx="520" cy="600" rx="120" ry="40"/>
          <ellipse cx="200" cy="630" rx="40" ry="15"/>
        </g>
      </svg>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  };

  P['fake-spider'] = () => {
    const spiders = [];
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.textContent = '🕷';
        el.style.cssText = `position:fixed;left:${Math.random()*90}vw;top:${Math.random()*80}vh;font-size:${28+Math.random()*20}px;z-index:99998;pointer-events:none;transition:transform 4s linear;filter:drop-shadow(0 0 8px rgba(0,0,0,0.6))`;
        document.body.appendChild(el);
        const tx = (Math.random() - 0.5) * 600;
        const ty = (Math.random() - 0.5) * 600;
        requestAnimationFrame(() => { el.style.transform = `translate(${tx}px, ${ty}px) rotate(${Math.random()*360}deg)`; });
        spiders.push(el);
      }, i * 100);
    }
    setTimeout(() => spiders.forEach(s => s.remove()), 5000);
  };

  P['fake-roach'] = () => {
    for (let i = 0; i < 15; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.textContent = '🪳';
        el.style.cssText = `position:fixed;left:${Math.random()*95}vw;top:${Math.random()*90}vh;font-size:${20+Math.random()*20}px;z-index:99998;pointer-events:none;transition:transform 2s ease-out, opacity 2s ease-out;filter:drop-shadow(0 0 6px rgba(0,0,0,0.6))`;
        document.body.appendChild(el);
        requestAnimationFrame(() => {
          el.style.transform = `translate(${(Math.random()-0.5)*400}px, ${(Math.random()-0.5)*400}px) rotate(${Math.random()*720-360}deg)`;
          el.style.opacity = '0';
        });
        setTimeout(() => el.remove(), 2200);
      }, i * 60);
    }
  };

  P['fake-alert'] = () => {
    beep(600, 0.15, 'square', 0.12);
    overlay(`
      <div class="sb-dialog-box">
        <div class="sb-dialog-head"><span>⚠ System Alert</span><button data-dismiss style="background:none;border:0;color:#fff;font-size:20px;cursor:pointer">×</button></div>
        <div class="sb-dialog-body"><p><strong>Critical error detected.</strong></p><p>Error code: 0x0000DEAD</p><p class="sb-muted">(This is a prank.)</p></div>
        <div class="sb-dialog-foot"><button class="btn primary" data-dismiss>OK</button></div>
      </div>`);
  };

  P['fake-popups'] = () => {
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        const p = document.createElement('div');
        p.className = 'sb-popup';
        p.style.top = (20 + Math.random() * Math.max(0, window.innerHeight - 200)) + 'px';
        p.style.left = (20 + Math.random() * Math.max(0, window.innerWidth - 260)) + 'px';
        p.style.zIndex = 99990 + i;
        p.innerHTML = `🪟 You are the <b>${Math.floor(Math.random()*9000)+1000}</b>th visitor!<br><small class="sb-muted">(click to close — prank)</small>`;
        p.onclick = () => p.remove();
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 7000);
      }, i * 150);
    }
  };

  P['fake-adware'] = () => {
    const ads = ['💎 BUY NOW! 90% OFF!', '🎁 CLAIM YOUR PRIZE', '💊 Lose 20lbs in 3 days!', '💰 Make $$$ from home!', '📱 iPhone 15 GIVEAWAY', '🎰 SPIN TO WIN!'];
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const a = document.createElement('div');
        a.className = 'sb-ad';
        a.textContent = ads[Math.floor(Math.random() * ads.length)];
        a.style.top = (10 + Math.random() * 80) + 'vh';
        a.style.left = (10 + Math.random() * 70) + 'vw';
        a.onclick = () => a.remove();
        document.body.appendChild(a);
        setTimeout(() => a.remove(), 6000);
      }, i * 200);
    }
  };

  P['fake-keyboard'] = () => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handler);
    setTimeout(() => document.removeEventListener('keydown', handler), 8000);
    toast('⌨️ Evil Keyboard', 'Typing disabled for 8s', 'warn', 3000);
  };

  P['fake-text'] = () => {
    const els = document.querySelectorAll('h1,h2,h3,p,button,span,a,.z-name,.m-name,.m-desc,.m-cat-title');
    const original = [];
    els.forEach(el => original.push([el, el.textContent]));
    const chars = '!<>-_\\/[]{}—=+*^?#________';
    let frame = 0;
    const iv = setInterval(() => {
      els.forEach((el) => {
        if (frame < 20) {
          el.textContent = el.textContent.split('').map(c => c === ' ' ? ' ' : chars[Math.floor(Math.random()*chars.length)]).join('');
        }
      });
      if (++frame > 20) {
        clearInterval(iv);
        original.forEach(([el, txt]) => el.textContent = txt);
      }
    }, 40);
  };

  P['fake-404'] = () => overlay(`
      <div class="sb-404">
        <div class="sb-404-num">404</div>
        <div class="sb-404-sub">Page not found</div>
        <div class="sb-muted" data-dismiss style="margin-top:30px;cursor:pointer;padding:10px">(click to go back — page is fine)</div>
      </div>`, { clickClose: false, autoMs: 6000 });

  P['fake-500'] = () => overlay(`
    <div class="sb-404">
      <div class="sb-404-num" style="color:#ff5a6e">500</div>
      <div class="sb-404-sub">Internal Server Error</div>
      <div class="sb-muted" data-dismiss style="margin-top:30px;cursor:pointer;padding:10px">(click to dismiss — this is a prank)</div>
    </div>`, { autoMs: 6000 });

  P['fake-offline'] = () => {
    injectStyle('sb-offline-style', `
      .sb-offline::before { content:''; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:99999; }
      .sb-offline::after {
        content:'📡 No Internet Connection'; position:fixed; top:50%; left:50%;
        transform:translate(-50%,-50%); z-index:100000; color:#fff;
        font-size:24px; font-weight:800; font-family:system-ui;
      }
    `);
    document.body.classList.add('sb-offline');
    setTimeout(() => { document.body.classList.remove('sb-offline'); setTimeout(() => $('sb-offline-style')?.remove(), 100); }, 4000);
  };

  P['fake-license'] = () => overlay(`
    <div class="sb-dialog-box">
      <div class="sb-dialog-head"><span>💳 Windows Activation</span><button data-dismiss style="background:none;border:0;color:#fff;font-size:20px;cursor:pointer">×</button></div>
      <div class="sb-dialog-body"><p><strong>Windows is not activated.</strong></p><p>Go to Settings to activate Windows.</p><p class="sb-muted">(Prank — you are fine.)</p></div>
      <div class="sb-dialog-foot"><button class="btn primary" data-dismiss>OK</button></div>
    </div>`);

  P['fake-anticheat'] = () => overlay(`
    <div class="sb-dialog-box">
      <div class="sb-dialog-head" style="background:#7a0000"><span>🎮 Anti-Cheat Alert</span><button data-dismiss style="background:none;border:0;color:#fff;font-size:20px;cursor:pointer">×</button></div>
      <div class="sb-dialog-body"><p><strong>Account permanently banned.</strong></p><p>Reason: Cheat detection triggered (prank).</p></div>
      <div class="sb-dialog-foot"><button class="btn primary" data-dismiss>OK</button></div>
    </div>`);

  P['fake-ddos'] = () => scanlines([
    '⚠ DDoS DETECTED ⚠','','Incoming: 2.4 Tbps','Source: 12,431 IPs','Ports: 80, 443, 22','Status: Under attack (simulated)','',
    '<span style="color:#5cea9f">(click to dismiss)</span>',
  ], { interval: 200, tone: '#ff5a6e' });

  P['fake-rootkit'] = () => scanlines([
    '> Scanning for rootkits...','> Checking kernel modules...','> Analyzing /dev...',
    '> Found suspicious: /dev/.hidden (simulated)',
    '<span style="color:#5cea9f">> SIMULATION ONLY. No rootkit found.</span>',
  ], { interval: 300 });

  P['fake-js'] = () => {
    const box = document.createElement('div');
    box.className = 'sb-js-error';
    box.innerHTML = `
      <div class="sb-js-title">Uncaught TypeError</div>
      <div class="sb-js-body">
        Cannot read properties of undefined (reading 'secure')<br>
        at Object.&lt;anonymous&gt; (main.js:42:13)<br>
        <span class="sb-muted">(Fake — click to dismiss)</span>
      </div>`;
    box.onclick = () => box.remove();
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 8000);
  };

  P['fake-cpu'] = () => scanlines([
    '⚠ CPU MELTDOWN ⚠','','Usage: 100%','Temperature: 98°C','Clock: 4.8 GHz','Status: Simulated (your CPU is fine)','',
    '<span style="color:#5cea9f">(click to dismiss)</span>',
  ], { interval: 200, tone: '#ffb340' });

  P['fake-ram'] = () => scanlines([
    '⚠ OUT OF MEMORY ⚠','','RAM: 16/16 GB used','Processes: 247','Swap: 0 bytes','Status: Simulated','',
    '<span style="color:#5cea9f">(click to dismiss)</span>',
  ], { interval: 200, tone: '#ff5a6e' });

  P['fake-disk'] = () => scanlines([
    '⚠ DISK FULL ⚠','','Drive C: 0 bytes free of 512 GB','Drive D: 0 bytes free of 1 TB','Status: Simulated','',
    '<span style="color:#5cea9f">(click to dismiss)</span>',
  ], { interval: 200, tone: '#ffb340' });

  P['fake-battery'] = () => {
    const banner = document.createElement('div');
    banner.className = 'sb-banner';
    banner.style.background = '#ff2200';
    banner.textContent = '🔋 Battery critical: 1%';
    document.body.appendChild(banner);
    let pct = 99;
    const iv = setInterval(() => {
      pct = Math.max(1, pct - 5);
      banner.textContent = `🔋 Battery critical: ${pct}%`;
      if (pct <= 1) clearInterval(iv);
    }, 200);
    setTimeout(() => { clearInterval(iv); banner.remove(); }, 5000);
  };

  P['fake-heat'] = () => scanlines([
    '🔥 OVERHEATING 🔥','','CPU: 95°C','GPU: 89°C','Fan: 100%','Status: Simulated (your device is fine)','',
    '<span style="color:#5cea9f">(click to dismiss)</span>',
  ], { interval: 200, tone: '#ff5a6e' });

  P['fake-wifi'] = () => scanlines([
    '📡 WIFI COMPROMISED 📡','','SSID: HomeNetwork','Password: [CAPTURED] (simulated)','Status: Simulated','',
    '<span style="color:#5cea9f">(click to dismiss)</span>',
  ], { interval: 250, tone: '#ff5a6e' });

  P['fake-bt'] = () => scanlines([
    '🔵 BLUETOOTH PAIRED 🔵','','Device: Unknown-Device','MAC: XX:XX:XX:XX:XX:XX','Status: Simulated','',
    '<span style="color:#5cea9f">(click to dismiss)</span>',
  ], { interval: 250, tone: '#4d9dff' });

  P['fake-camera'] = () => {
    injectStyle('sb-rec-style', `@keyframes sbRec { 0%,100% { opacity:1; } 50% { opacity:0.3; } }`);
    const banner = document.createElement('div');
    banner.className = 'sb-banner';
    banner.style.background = 'rgba(0,0,0,0.9)';
    banner.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:#ff0000;display:inline-block;animation:sbRec 1s infinite"></span> Camera ON — recording (prank)`;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 5000);
  };

  P['fake-mic'] = () => {
    injectStyle('sb-rec-style', `@keyframes sbRec { 0%,100% { opacity:1; } 50% { opacity:0.3; } }`);
    const banner = document.createElement('div');
    banner.className = 'sb-banner';
    banner.style.background = 'rgba(0,0,0,0.9)';
    banner.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:#ff0000;display:inline-block;animation:sbRec 1s infinite"></span> Microphone ON — recording (prank)`;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 5000);
  };

  P['fake-loc'] = () => scanlines([
    '📍 LOCATION TRACKED 📍','','Lat: 37.7749 (simulated)','Lng: -122.4194 (simulated)','Status: Prank — no real tracking','',
    '<span style="color:#5cea9f">(click to dismiss)</span>',
  ], { interval: 250, tone: '#ff5a6e' });

  P['fake-files'] = () => scanlines([
    '> Browsing filesystem...','> /home/user/Documents','> /home/user/Pictures','> /home/user/.ssh/id_rsa (simulated)','> /etc/passwd (simulated)',
    '<span style="color:#5cea9f">> SIMULATION ONLY. No files accessed.</span>',
  ], { interval: 280 });

  P['fake-crypto'] = () => {
    particleCanvas({ count: 50, spawn: 'top', speed: 2, size: 8, shape: 'text', chars: ['₿','Ξ','💎','🪙'], gravity: 0.05, maxFrames: 300, fade: 'rgba(0,0,0,0.08)' });
    scanlines([
      '🪙 CRYPTO MINER STARTED 🪙','','Algorithm: XMR','Pool: pool.simulated.local','Hashrate: 0 H/s (simulated)','Status: Prank','',
      '<span style="color:#5cea9f">(click to dismiss)</span>',
    ], { interval: 250, tone: '#ffb340' });
  };

  P['fake-ads'] = () => overlay(`
    <div class="sb-dialog-box">
      <div class="sb-dialog-head" style="background:#ffb340;color:#000"><span>📺 Congratulations!</span><button data-dismiss style="background:none;border:0;color:#000;font-size:20px;cursor:pointer">×</button></div>
      <div class="sb-dialog-body" style="text-align:center"><p style="font-size:32px">🎁</p><p><strong>You won an iPhone 15!</strong></p><p class="sb-muted">(This is a prank.)</p></div>
      <div class="sb-dialog-foot"><button class="btn primary" data-dismiss>Claim (prank)</button></div>
    </div>`);

  P['fake-prize'] = () => overlay(`
    <div class="sb-dialog-box" style="text-align:center">
      <div class="sb-dialog-body"><p style="font-size:48px">🎁</p><p><strong>CONGRATULATIONS!</strong></p><p>You are our 1,000,000th visitor!</p><p class="sb-muted">(Prank — no prize. Sorry.)</p></div>
      <div class="sb-dialog-foot" style="justify-content:center"><button class="btn primary" data-dismiss>Claim (prank)</button></div>
    </div>`);

  P['fake-vpn'] = () => {
    const banner = document.createElement('div');
    banner.className = 'sb-banner';
    banner.style.background = '#ff2200';
    banner.textContent = '🛡 VPN disconnected — IP exposed (prank)';
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 5000);
  };

  P['fake-antivirus'] = () => overlay(`
    <div class="sb-dialog-box">
      <div class="sb-dialog-head" style="background:#ffb340;color:#000"><span>🛡 Antivirus Alert</span><button data-dismiss style="background:none;border:0;color:#000;font-size:20px;cursor:pointer">×</button></div>
      <div class="sb-dialog-body"><p><strong>Your antivirus license has expired!</strong></p><p>Renew now to stay protected.</p><p class="sb-muted">(Prank.)</p></div>
      <div class="sb-dialog-foot"><button class="btn primary" data-dismiss>Renew (prank)</button></div>
    </div>`);

  /* ================= SPOOKY ================= */
  P['fun-jumpscare'] = () => {
    scream();
    const el = overlay(`<div style="font-size:min(80vh,80vw);animation:sbJumpZoom 0.3s ease-out forwards">😱</div>`, { autoMs: 2500 });
    injectStyle('sb-jump-style', '@keyframes sbJumpZoom{from{transform:scale(.2)}to{transform:scale(1)}}');
  };

  P['fun-rickroll'] = () => {
    window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank', 'noopener,noreferrer');
    toast('🎵 Never gonna give you up', 'Opened in a new tab', 'purple', 4000);
  };

  P['fun-ghost'] = () => {
    const ghost = document.createElement('div');
    ghost.textContent = '👻';
    ghost.style.cssText = 'position:fixed;font-size:80px;z-index:99998;pointer-events:none;transition:all 6s ease-in-out;top:100vh;left:50vw;filter:drop-shadow(0 0 20px rgba(200,200,255,0.8))';
    document.body.appendChild(ghost);
    requestAnimationFrame(() => {
      ghost.style.top = '20vh';
      ghost.style.left = '20vw';
      ghost.style.transform = 'rotate(-15deg)';
    });
    setTimeout(() => { ghost.style.opacity = '0'; }, 5500);
    setTimeout(() => ghost.remove(), 6500);
  };

  P['fun-blood'] = () => {
    const c = document.createElement('canvas');
    c.style.cssText = 'position:fixed;inset:0;z-index:99998;pointer-events:none';
    c.width = window.innerWidth; c.height = window.innerHeight;
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const drops = Array.from({ length: 15 }, () => ({
      x: Math.random() * c.width, y: 0,
      w: 10 + Math.random() * 30,
      h: 30 + Math.random() * 150,
      vy: 0.5 + Math.random(),
    }));
    let frames = 0;
    const iv = setInterval(() => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#8a0000';
      drops.forEach(d => {
        d.y += d.vy;
        ctx.fillRect(d.x, d.y - d.h, d.w, d.h);
        ctx.beginPath(); ctx.arc(d.x + d.w/2, d.y, d.w/2, 0, Math.PI * 2); ctx.fill();
      });
      if (++frames > 300) { clearInterval(iv); c.remove(); }
    }, 30);
  };

  P['fun-ouija'] = () => {
    const el = overlay(`
      <div style="text-align:center;font-family:'Courier New',monospace">
        <div style="font-size:80px;margin-bottom:30px">🕯️</div>
        <div style="color:#b0c2d6;font-size:14px;letter-spacing:2px">The spirits say:</div>
        <div id="sbOuijaText" style="font-size:32px;color:#c9a5ff;font-weight:900;letter-spacing:8px;margin-top:20px;text-shadow:0 0 30px #b586ff;min-height:1em"></div>
      </div>`, { autoMs: 8000 });
    const msg = 'BOO! 👻';
    const txtEl = el.querySelector('#sbOuijaText');
    let i = 0;
    const iv = setInterval(() => {
      if (i >= msg.length) { clearInterval(iv); return; }
      txtEl.textContent += msg[i++];
    }, 250);
  };

  P['fun-vignette'] = () => {
    injectStyle('sb-vignette-style', '@keyframes sbVig{0%{opacity:0}50%{opacity:1}100%{opacity:0}}');
    const v = document.createElement('div');
    v.style.cssText = 'position:fixed;inset:0;z-index:99997;pointer-events:none;box-shadow:inset 0 0 200px 100px rgba(0,0,0,0.9);animation:sbVig 4s ease-in-out forwards';
    document.body.appendChild(v);
    setTimeout(() => v.remove(), 4200);
  };

  /* Aliases for backwards compat */
  P['fake-jumpscare'] = P['fun-jumpscare'];
  P['fake-rickroll'] = P['fun-rickroll'];

  /* ================= Public API ================= */
  window.PrankEngine = {
    has(id) { return typeof P[id] === 'function'; },
    run(id) {
      const fn = P[id];
      if (!fn) { toast('Unknown prank', id, 'warn'); return false; }
      try { fn(); return true; }
      catch (e) { console.error('[prank]', id, e); toast('Prank error', e.message, 'error'); return false; }
    },
    list() { return Object.keys(P); }
  };
})();