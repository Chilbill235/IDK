/* ==========================================================================
   SafeBeef v80 — Hardware + IP ban system (upgraded)
   - Granular ban: by username, hardware, IP, or all
   - Human-readable timestamps in history
   - FP shadow keys work in checkSelf
   ========================================================================== */
'use strict';

(function () {
  const HW_FP_KEY        = 'sb26_hw_fp';
  const HW_FP_CANARY_KEY = 'sb26_hw_fp_canary';
  const BANS_KEY         = 'sb26_ip_bans';
  const MIRROR_KEY       = 'sb26_ip_bans_mirror';
  const REGISTRY_KEY     = 'sb26_ip_registry';
  const COOKIE_TOKEN     = 'sb26_ip_token';
  const COOKIE_CANARY    = 'sb26_ip_canary';
  const IDB_NAME         = 'sb26_anchor';
  const IDB_STORE        = 'anchors';
  const IDB_KEY          = 'hw';
  const CACHE_NAME       = 'sb26-anchor-v2';
  const CACHE_URL        = '/__sb26_anchor_v2__';
  const BANS_CHANNEL     = 'sb26_bans_v64';
  const COOKIE_MAX_AGE   = 60 * 60 * 24 * 400;

  function safeGet(store, key) { try { return store.getItem(key); } catch (e) { return null; } }
  function safeSet(store, key, val) { try { store.setItem(key, val); return true; } catch (e) { return false; } }
  function safeDel(store, key) { try { store.removeItem(key); } catch (e) {} }
  function readJSON(store, key, fallback) {
    try {
      const raw = safeGet(store, key);
      if (raw == null) return fallback;
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (e) { return fallback; }
  }
  function writeJSON(store, key, val) { return safeSet(store, key, JSON.stringify(val)); }

  function setCookie(name, value, maxAgeSec) {
    try {
      const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Strict', `Max-Age=${maxAgeSec}`];
      if (location.protocol === 'https:') parts.push('Secure');
      document.cookie = parts.join('; ');
    } catch (e) {}
  }
  function getCookie(name) {
    try {
      const target = encodeURIComponent(name) + '=';
      for (const p of (document.cookie || '').split(';')) {
        const t = p.trim();
        if (t.indexOf(target) === 0) return decodeURIComponent(t.slice(target.length));
      }
    } catch (e) {}
    return null;
  }
  function delCookie(name) {
    try { document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Strict`; } catch (e) {}
  }

  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) h = ((h ^ str.charCodeAt(i)) * 0x01000193) >>> 0;
    return h >>> 0;
  }
  function hashString(str) {
    const a = fnv1a(str);
    const b = fnv1a(str + '\x00a');
    const c = fnv1a(str.split('').reverse().join(''));
    const d = fnv1a(str + '|' + str.length);
    const hex = n => n.toString(16).padStart(8, '0');
    return (hex(a) + hex(b) + hex(c) + hex(d)).toUpperCase();
  }

  function collectSignals() {
    const parts = [];
    try {
      parts.push('ua:' + (navigator.userAgent || ''));
      parts.push('lang:' + (navigator.language || ''));
      parts.push('langs:' + ((navigator.languages || []).join(',')));
      parts.push('plat:' + (navigator.platform || ''));
      parts.push('vendor:' + (navigator.vendor || ''));
      parts.push('cores:' + (navigator.hardwareConcurrency || 0));
      parts.push('mem:' + (navigator.deviceMemory || 0));
      parts.push('touch:' + (navigator.maxTouchPoints || 0));
      parts.push('cookie:' + (navigator.cookieEnabled ? 1 : 0));
    } catch (e) {}
    try {
      const s = window.screen || screen;
      parts.push('sw:' + (s.width || 0) + 'sh:' + (s.height || 0));
      parts.push('saw:' + (s.availWidth || 0) + 'sah:' + (s.availHeight || 0));
      parts.push('scd:' + (s.colorDepth || 0) + 'spd:' + (s.pixelDepth || 0));
    } catch (e) {}
    try {
      parts.push('tz:' + (Intl.DateTimeFormat().resolvedOptions().timeZone || ''));
      parts.push('tzoff:' + (new Date()).getTimezoneOffset());
    } catch (e) {}
    try {
      const cvs = document.createElement('canvas');
      const gl = cvs.getContext('webgl') || cvs.getContext('experimental-webgl');
      if (gl) {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        if (dbg) {
          parts.push('glv:' + (gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || ''));
          parts.push('glr:' + (gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || ''));
        }
        parts.push('glver:' + (gl.getParameter(gl.VERSION) || ''));
      }
    } catch (e) {}
    try {
      const cvs = document.createElement('canvas');
      cvs.width = 220; cvs.height = 60;
      const ctx = cvs.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px "Arial"';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('SafeBeef-v80-fp', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('SafeBeef-v80-fp', 4, 17);
        ctx.beginPath();
        ctx.arc(60, 40, 12, 0, Math.PI * 2);
        ctx.fill();
        parts.push('canvas:' + cvs.toDataURL());
      }
    } catch (e) {}
    try {
      const fontList = ['Arial','Arial Black','Comic Sans MS','Courier New','Georgia','Impact','Lucida Console','Segoe UI','Tahoma','Times New Roman','Verdana','Helvetica','Menlo','Monaco','Consolas','Calibri','DejaVu Sans'];
      const baseFonts = ['monospace','sans-serif','serif'];
      const span = document.createElement('span');
      span.style.position = 'absolute';
      span.style.left = '-9999px';
      span.style.fontSize = '72px';
      span.textContent = 'mmmmmmmmmmlli';
      document.body.appendChild(span);
      const baseSizes = {};
      baseFonts.forEach(base => {
        span.style.fontFamily = base;
        baseSizes[base] = { w: span.offsetWidth, h: span.offsetHeight };
      });
      const detected = [];
      fontList.forEach(font => {
        for (const base of baseFonts) {
          span.style.fontFamily = `'${font}', ${base}`;
          if (span.offsetWidth !== baseSizes[base].w || span.offsetHeight !== baseSizes[base].h) {
            detected.push(font);
            break;
          }
        }
      });
      document.body.removeChild(span);
      parts.push('fonts:' + detected.join('|'));
    } catch (e) {}
    return parts.join('||');
  }

  async function collectAudioSignal() {
    try {
      const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!AC) return '';
      const ctx = new AC(1, 44100, 44100);
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(10000, ctx.currentTime);
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-50, ctx.currentTime);
      comp.knee.setValueAtTime(40, ctx.currentTime);
      comp.ratio.setValueAtTime(12, ctx.currentTime);
      comp.attack.setValueAtTime(0, ctx.currentTime);
      comp.release.setValueAtTime(0.25, ctx.currentTime);
      osc.connect(comp);
      comp.connect(ctx.destination);
      osc.start(0);
      const rendered = await new Promise(res => {
        ctx.oncomplete = ev => res(ev.renderedBuffer);
        ctx.startRendering();
      });
      const data = rendered.getChannelData(0);
      let sample = '';
      for (let i = 0; i < 30; i++) sample += Math.round(data[i] * 1e6);
      return 'audio:' + hashString(sample);
    } catch (e) { return ''; }
  }

  async function buildFingerprint() {
    const [signals, audio] = await Promise.all([Promise.resolve(collectSignals()), collectAudioSignal()]);
    return 'HW-' + hashString(signals + '||' + audio);
  }

  function openIDB() {
    return new Promise(resolve => {
      if (!('indexedDB' in window)) return resolve(null);
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        try {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
        } catch (e) {}
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    });
  }
  async function idbGet(key) {
    const db = await openIDB();
    if (!db) return null;
    return new Promise(resolve => {
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const rq = tx.objectStore(IDB_STORE).get(key);
        rq.onsuccess = () => resolve(rq.result || null);
        rq.onerror = () => resolve(null);
      } catch (e) { resolve(null); }
    });
  }
  async function idbSet(key, val) {
    const db = await openIDB();
    if (!db) return false;
    return new Promise(resolve => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(val, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) { resolve(false); }
    });
  }
  async function idbDel(key) {
    const db = await openIDB();
    if (!db) return false;
    return new Promise(resolve => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) { resolve(false); }
    });
  }

  async function cacheGet() {
    if (!('caches' in window)) return null;
    try {
      const cache = await caches.open(CACHE_NAME);
      const res = await cache.match(CACHE_URL);
      return res ? await res.text() : null;
    } catch (e) { return null; }
  }
  async function cacheSet(val) {
    if (!('caches' in window)) return false;
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(CACHE_URL, new Response(val, { headers: { 'Content-Type': 'text/plain' } }));
      return true;
    } catch (e) { return false; }
  }
  async function cacheDel() {
    if (!('caches' in window)) return false;
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(CACHE_URL);
      return true;
    } catch (e) { return false; }
  }

  function readBans() {
    const r = readJSON(localStorage, BANS_KEY, null) || { ips: {}, history: [] };
    if (!r.ips) r.ips = {};
    if (!r.history) r.history = [];
    const mirror = readJSON(sessionStorage, MIRROR_KEY, null);
    if (mirror && mirror.ips) for (const k in mirror.ips) if (!r.ips[k]) r.ips[k] = mirror.ips[k];
    return r;
  }
  function writeBans(bans) {
    writeJSON(localStorage, BANS_KEY, bans);
    writeJSON(sessionStorage, MIRROR_KEY, bans);
  }

  function readRegistry() { return readJSON(localStorage, REGISTRY_KEY, {}) || {}; }
  function writeRegistry(reg) { writeJSON(localStorage, REGISTRY_KEY, reg); }

  async function apiRequestIPBan(method, path, body) {
    try {
      const res = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: body ? JSON.stringify(body) : undefined,
      });
      return await res.json().catch(() => ({}));
    } catch (e) { return {}; }
  }
  function pruneRegistry() {
    const reg = readRegistry();
    const cutoff = Date.now() - 90 * 86400000;
    let changed = false;
    for (const fp in reg) {
      if (!reg[fp] || !reg[fp].lastSeen || reg[fp].lastSeen < cutoff) { delete reg[fp]; changed = true; }
    }
    if (changed) writeRegistry(reg);
  }
  function registerSelf(fp, username) {
    if (!fp) return;
    const reg = readRegistry();
    const ip = fingerprintToIP(fp);
    reg[fp] = {
      fp, ip,
      username: username || (reg[fp] && reg[fp].username) || null,
      lastSeen: Date.now(),
      lastSeenLocal: new Date().toLocaleString(),
    };
    writeRegistry(reg);
  }

  let _cachedFP = null;
  let _fpPromise = null;

  async function resolveFingerprint() {
    if (_cachedFP) return _cachedFP;
    if (_fpPromise) return _fpPromise;
    _fpPromise = (async () => {
      let fp = safeGet(localStorage, HW_FP_KEY);
      if (!fp) {
        const c = getCookie(COOKIE_TOKEN);
        if (c && /^HW-[A-F0-9]{32}$/i.test(c)) fp = c;
      }
      if (!fp) {
        const fromIdb = await idbGet(IDB_KEY);
        if (fromIdb && /^HW-[A-F0-9]{32}$/i.test(fromIdb)) fp = fromIdb;
      }
      if (!fp) {
        const fromCache = await cacheGet();
        if (fromCache && /^HW-[A-F0-9]{32}$/i.test(fromCache)) fp = fromCache;
      }
      if (!fp) fp = await buildFingerprint();
      safeSet(localStorage, HW_FP_KEY, fp);
      safeSet(localStorage, HW_FP_CANARY_KEY, fp);
      setCookie(COOKIE_TOKEN, fp, COOKIE_MAX_AGE);
      setCookie(COOKIE_CANARY, fp, COOKIE_MAX_AGE);
      idbSet(IDB_KEY, fp).catch(() => {});
      cacheSet(fp).catch(() => {});
      try {
        const session = readJSON(sessionStorage, 'sb26_session', null);
        registerSelf(fp, session && session.username);
      } catch (e) {}
      _cachedFP = fp;
      return fp;
    })();
    return _fpPromise;
  }

  function fingerprintToIP(fp) {
    const h = hashString('ip|' + fp);
    const oct = i => {
      const v = parseInt(h.substr(i * 2, 2), 16) % 253;
      return String(v + 1);
    };
    return `${oct(0)}.${oct(1)}.${oct(2)}.${oct(3)}`;
  }

  function parseDuration(duration) {
    if (!duration || duration === 'perm' || duration === 'permanent') return null;
    const map = {
      '1h': 3600000, '6h': 21600000, '12h': 43200000,
      '1d': 86400000, '3d': 259200000, '7d': 604800000, '30d': 2592000000,
    };
    return map[duration] || null;
  }

  function mkBanId(prefix) {
    return (prefix || 'BAN') + '-' + Date.now().toString(36).toUpperCase().slice(-6) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  const IPBan = {
    async ready() {
      const fp = await resolveFingerprint();
      return { fingerprint: fp, ip: fingerprintToIP(fp) };
    },
    async getFingerprint() { return resolveFingerprint(); },
    async getIP() { return fingerprintToIP(await resolveFingerprint()); },
    getFingerprintSync() { return _cachedFP; },
    getIPSync() { return _cachedFP ? fingerprintToIP(_cachedFP) : null; },

    registerSelf(username) { if (_cachedFP) registerSelf(_cachedFP, username); },

    /* ---------- Registry lookups ---------- */
    lookupUser(username) {
      const reg = readRegistry();
      for (const fp in reg) if (reg[fp].username === username) return reg[fp];
      return null;
    },
    lookupAll(username) {
      const all = Object.values(readRegistry());
      if (!username) return all;
      return all.filter(r => r.username === username);
    },
    listRegistry() { return Object.values(readRegistry()); },

    /* ---------- Read self ban status ---------- */
    async checkSelf() {
      // Try SQL server first
      const fp = await resolveFingerprint();
      const ip = fingerprintToIP(fp);
      try {
        const r = await fetch(`/__sb__/ip-ban/check-self?fingerprint=${encodeURIComponent(fp || '')}`, {
          credentials: 'same-origin',
        });
        if (r.ok) {
          const j = await r.json();
          if (j.banned && j.entry) {
            // Mirror to localStorage for offline/sync
            const bans = readBans();
            bans.ips[ip] = j.entry;
            if (j.entry.fingerprint) bans.ips['FP:' + j.entry.fingerprint] = j.entry;
            writeBans(bans);
            return j.entry;
          }
          return null;
        }
      } catch (e) { /* fall through to localStorage */ }

      // Fallback to localStorage
      const bans = readBans();
      let entry = bans.ips[ip] || null;
      let matchedKey = entry ? ip : null;
      if (!entry) {
        const shadow = bans.ips['FP:' + fp];
        if (shadow) { entry = shadow; matchedKey = 'FP:' + fp; }
      }
      if (!entry) {
        for (const k in bans.ips) {
          const e = bans.ips[k];
          if (e && e.fingerprint === fp) { entry = e; matchedKey = k; break; }
        }
      }
      if (!entry) return null;
      if (entry.expiresAt != null && Date.now() >= entry.expiresAt) {
        if (matchedKey) this.unban(matchedKey, { silent: true });
        return null;
      }
      return entry;
    },

    isBanned(ip) {
      const bans = readBans();
      const entry = bans.ips[ip];
      if (!entry) return null;
      if (entry.expiresAt != null && Date.now() >= entry.expiresAt) {
        this.unban(ip, { silent: true });
        return null;
      }
      return entry;
    },

    list() {
      // Try SQL server first
      try {
        const r = apiRequestIPBan('GET', '/__sb__/ip-ban/list');
        if (r && r.bans) {
          const out = [];
          for (const b of r.bans) {
            if (b.ip && !b.ip.startsWith('FP:')) out.push([b.ip, b]);
          }
          // Mirror to localStorage
          const bans = readBans();
          bans.ips = bans.ips || {};
          for (const b of r.bans) {
            if (b.ip && !b.ip.startsWith('FP:')) bans.ips[b.ip] = b;
            if (b.fingerprint) bans.ips['FP:' + b.fingerprint] = b;
          }
          writeBans(bans);
          return out;
        }
      } catch (e) { /* fall through to localStorage */ }

      // LocalStorage fallback
      const bans = readBans();
      const out = [];
      let changed = false;
      for (const ip in bans.ips) {
        const e = bans.ips[ip];
        if (!e) continue;
        if (ip.indexOf('FP:') === 0) continue;
        if (e.expiresAt != null && Date.now() >= e.expiresAt) { delete bans.ips[ip]; changed = true; continue; }
        out.push([ip, e]);
      }
      if (changed) writeBans(bans);
      return out;
    },

    listHardwareBans() {
      // Try SQL server first
      try {
        const r = apiRequestIPBan('GET', '/__sb__/ip-ban/list');
        if (r && r.bans) {
          const out = [];
          for (const b of r.bans) {
            if (b.fingerprint && !b.ip?.startsWith('FP:')) {
              out.push(['FP:' + b.fingerprint, { ...b, ip: 'FP:' + b.fingerprint }]);
            }
          }
          return out;
        }
      } catch (e) { /* fall through to localStorage */ }

      // LocalStorage fallback
      const bans = readBans();
      const out = [];
      for (const k in bans.ips) {
        if (k.indexOf('FP:') !== 0) continue;
        const e = bans.ips[k];
        if (!e) continue;
        if (e.expiresAt != null && Date.now() >= e.expiresAt) { delete bans.ips[k]; continue; }
        out.push([k, e]);
      }
      return out;
    },

    history() {
      const raw = readBans().history || [];
      return raw.map(h => ({
        ...h,
        atISO: h.at ? (h.atISO || new Date(h.at).toISOString()) : null,
        atLocal: h.at ? (h.atLocal || new Date(h.at).toLocaleString()) : null,
      }));
    },

    /* ========== BAN METHODS ========== */

    async ban(ip, opts = {}) {
      if (!ip) return false;
      if (!opts.force) {
        const selfIP = this.getIPSync();
        const selfFP = this.getFingerprintSync();
        if (ip === selfIP || (opts.fingerprint && opts.fingerprint === selfFP)) {
          throw new Error('Refusing to ban own device. Pass { force: true } to override.');
        }
      }
      // Sync to SQL server (server also enforces self-ban protection)
      try {
        const r = await fetch('/__sb__/ip-ban/ban', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            ip, fingerprint: opts.fingerprint || null, reason: opts.reason || 'IP + hardware ban',
            durationKey: opts.duration, durationMs: opts.duration ? parseDuration(opts.duration) : null,
            bannedBy: opts.bannedBy || (window.ME && window.ME.username) || 'system',
            force: !!opts.force,
          }),
        });
        if (r.ok) {
          const j = await r.json();
          // Mirror to localStorage
          const bans = readBans();
          bans.ips[ip] = j.ban || { ip, fingerprint: opts.fingerprint || null, reason: opts.reason, bannedAt: Date.now(), expiresAt: null, permanent: true };
          if (opts.fingerprint) bans.ips['FP:' + opts.fingerprint] = bans.ips[ip];
          writeBans(bans);
          this._broadcast('ip-ban', { ip, entry: bans.ips[ip] });
          return bans.ips[ip];
        }
        if (r.status === 403) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || 'Refusing to ban own device');
        }
      } catch (e) {
        if (e.message && e.message.includes('Refusing to ban')) throw e;
        // Fall through to localStorage fallback
      }

      // LocalStorage fallback
      const bans = readBans();
      const now = Date.now();
      const bannedBy = opts.bannedBy || (window.ME && window.ME.username) || 'system';
      const reason = opts.reason || 'IP + hardware ban';
      const fingerprint = opts.fingerprint || null;

      const durMs = parseDuration(opts.duration);
      const expiresAt = durMs ? now + durMs : null;

      const entry = {
        id: mkBanId('IPBAN'),
        ip, fingerprint, reason,
        bannedAt: now,
        bannedAtISO: new Date(now).toISOString(),
        bannedAtLocal: new Date(now).toLocaleString(),
        bannedBy, expiresAt, permanent: expiresAt == null,
        signal: fingerprint ? 'hardware+ip' : 'ip-only',
      };
      bans.ips[ip] = entry;
      if (fingerprint) {
        const shadowKey = 'FP:' + fingerprint;
        if (!bans.ips[shadowKey]) bans.ips[shadowKey] = { ...entry, ip, id: mkBanId('HWBAN') };
      }
      bans.history = bans.history || [];
      bans.history.push({
        action: 'ip-ban', username: ip, reason, bannedBy,
        at: now, atISO: new Date(now).toISOString(), atLocal: new Date(now).toLocaleString(),
        fingerprint,
      });
      if (bans.history.length > 500) bans.history = bans.history.slice(-500);
      writeBans(bans);
      this._broadcast('ip-ban', { ip, entry });
      return entry;
    },

    /**
     * Ban only a specific username's currently-known device (IP + fingerprint).
     */
    banByUsername(username, opts = {}) {
      const reg = this.lookupUser(username);
      if (!reg) return { error: 'User has no registered device. They must log in at least once.' };
      const ip = reg.ip || fingerprintToIP(reg.fp);
      try {
        const entry = this.ban(ip, { ...opts, fingerprint: reg.fp || null });
        return { success: true, entry };
      } catch (e) {
        return { error: e.message };
      }
    },

    /**
     * Ban ONLY a hardware fingerprint (survives IP/VPN changes).
     */
    banByFingerprint(fp, opts = {}) {
      if (!fp || !/^HW-[A-F0-9]+$/i.test(fp)) {
        return { error: 'Invalid fingerprint format. Must be HW- followed by hex.' };
      }
      // Sync to SQL server
      try {
        const r = apiRequestIPBan('POST', '/__sb__/ip-ban/ban', {
          ip: 'FP:' + fp, fingerprint: fp, reason: opts.reason || 'Hardware ban',
          durationKey: opts.duration, durationMs: opts.duration ? parseDuration(opts.duration) : null,
          bannedBy: opts.bannedBy || (window.ME && window.ME.username) || 'system',
          force: !!opts.force,
        });
        if (r.ok || r.ban) {
          const bans = readBans();
          const shadowKey = 'FP:' + fp;
          bans.ips[shadowKey] = r.ban || { ip: shadowKey, fingerprint: fp, reason: opts.reason || 'Hardware ban', bannedAt: Date.now(), expiresAt: null, permanent: true };
          writeBans(bans);
          this._broadcast('ip-ban', { ip: shadowKey, entry: bans.ips[shadowKey] });
          return { success: true, entry: bans.ips[shadowKey] };
        }
      } catch (e) { /* fall through to localStorage */ }

      // LocalStorage fallback
      const bans = readBans();
      const now = Date.now();
      const bannedBy = opts.bannedBy || (window.ME && window.ME.username) || 'system';
      const reason = opts.reason || 'Hardware ban';
      const durMs = parseDuration(opts.duration);
      const expiresAt = durMs ? now + durMs : null;

      const shadowKey = 'FP:' + fp;
      const entry = {
        id: mkBanId('HWBAN'),
        ip: shadowKey, fingerprint: fp, reason,
        bannedAt: now,
        bannedAtISO: new Date(now).toISOString(),
        bannedAtLocal: new Date(now).toLocaleString(),
        bannedBy, expiresAt, permanent: expiresAt == null,
        signal: 'hardware-only',
      };
      bans.ips[shadowKey] = entry;
      bans.history = bans.history || [];
      bans.history.push({
        action: 'hw-ban', username: 'FP:' + fp.slice(3, 15),
        reason, bannedBy,
        at: now, atISO: new Date(now).toISOString(), atLocal: new Date(now).toLocaleString(),
        fingerprint: fp,
      });
      if (bans.history.length > 500) bans.history = bans.history.slice(-500);
      writeBans(bans);
      this._broadcast('ip-ban', { ip: shadowKey, entry });
      return { success: true, entry };
    },

    /**
     * Ban a user AND every registered device they've used.
     */
    banByAllDevices(username, opts = {}) {
      const devices = this.lookupAll(username);
      if (!devices.length) return { error: 'No registered devices for this user' };
      let count = 0;
      const errors = [];
      for (const dev of devices) {
        try {
          const targetIP = dev.ip || fingerprintToIP(dev.fp);
          this.ban(targetIP, { ...opts, fingerprint: dev.fp, force: opts.force });
          count++;
        } catch (e) { errors.push(e.message); }
      }
      return { success: true, count, errors, total: devices.length };
    },

    /* ---------- Unban / extend ---------- */
    unban(ip, opts = {}) {
      // Sync to SQL server
      apiRequestIPBan('POST', '/__sb__/ip-ban/unban', { ip }).catch(() => {});

      // LocalStorage (authoritative cache)
      const bans = readBans();
      let removed = false;
      if (bans.ips[ip]) { delete bans.ips[ip]; removed = true; }
      const fp = opts.fingerprint || null;
      if (fp) {
        const shadowKey = 'FP:' + fp;
        if (bans.ips[shadowKey]) { delete bans.ips[shadowKey]; removed = true; }
      }
      for (const k in bans.ips) {
        if (bans.ips[k] && bans.ips[k].ip === ip) { delete bans.ips[k]; removed = true; }
      }
      if (!opts.silent) {
        const now = Date.now();
        bans.history = bans.history || [];
        bans.history.push({
          action: 'ip-unban', username: ip,
          reason: opts.reason || '',
          bannedBy: (window.ME && window.ME.username) || 'system',
          at: now, atISO: new Date(now).toISOString(), atLocal: new Date(now).toLocaleString(),
        });
      }
      writeBans(bans);
      if (removed) this._broadcast('ip-unban', { ip });
      return removed;
    },

    extend(ip, duration) {
      const bans = readBans();
      const entry = bans.ips[ip];
      if (!entry) return false;
      const durMs = parseDuration(duration);
      if (!durMs) {
        entry.expiresAt = null;
        entry.permanent = true;
      } else {
        entry.expiresAt = (entry.expiresAt || Date.now()) + durMs;
        entry.permanent = false;
      }
      writeBans(bans);
      this._broadcast('ip-ban-update', { ip, entry });
      return true;
    },

    fmtDur(ms) {
      if (ms == null) return 'Permanent';
      if (ms <= 0) return 'Expired';
      const s = Math.floor(ms / 1000);
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const parts = [];
      if (d) parts.push(d + 'd');
      if (h) parts.push(h + 'h');
      if (m) parts.push(m + 'm');
      if (!d && !h) parts.push((s % 60) + 's');
      return parts.join(' ');
    },

    async guard() {
      this._ensureChannel();
      const fp = await resolveFingerprint();
      const ip = fingerprintToIP(fp);
      const entry = await this.checkSelf();
      if (!entry) return false;
      const session = readJSON(sessionStorage, 'sb26_session', null);
      const users = readJSON(localStorage, 'sb26_users', {}) || {};
      const current = session && users[session.username];
      if (current && (current.role === 'owner' || current.role === 'mod')) return false;
      try { sessionStorage.removeItem('sb26_session'); } catch (e) {}
      try { sessionStorage.setItem('sb26_ip_banned_info', JSON.stringify(entry)); } catch (e) {}
      try { sessionStorage.setItem('sb26_hw_banned_fp', fp); } catch (e) {}
      try { sessionStorage.setItem('sb26_hw_banned_ip', ip); } catch (e) {}
      try { location.replace('banned.html'); } catch (e) {}
      return true;
    },

    _channel: null,
    _ensureChannel() {
      if (this._channel) return;
      try {
        this._channel = new BroadcastChannel(BANS_CHANNEL);
        this._channel.onmessage = (msg) => {
          const m = msg.data || {};
          if (m.action === 'ip-ban' || m.action === 'ip-ban-update' || m.action === 'ip-unban') {
            const bans = readBans();
            writeJSON(sessionStorage, MIRROR_KEY, bans);
            try { window.dispatchEvent(new CustomEvent('sb-ip-ban-update', { detail: m })); } catch (e) {}
            if (m.action === 'ip-ban' || m.action === 'ip-ban-update') this.guard();
          }
        };
      } catch (e) {}
    },
    _broadcast(action, payload) {
      try {
        const ch = new BroadcastChannel(BANS_CHANNEL);
        ch.postMessage({ action, ...payload });
        ch.close();
      } catch (e) {}
    },

    async _resetAll() {
      safeDel(localStorage, HW_FP_KEY);
      safeDel(localStorage, HW_FP_CANARY_KEY);
      safeDel(localStorage, BANS_KEY);
      safeDel(localStorage, REGISTRY_KEY);
      safeDel(sessionStorage, MIRROR_KEY);
      delCookie(COOKIE_TOKEN);
      delCookie(COOKIE_CANARY);
      await idbDel(IDB_KEY);
      await cacheDel();
      _cachedFP = null;
      _fpPromise = null;
    },
  };

  pruneRegistry();
  IPBan._ensureChannel();
  resolveFingerprint().catch(() => {});
  window.IPBan = IPBan;
})();