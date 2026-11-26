/* ==========================================================================
   SafeBeef v83 — Push Notification Client (Enhanced)
   Handles Push API subscription, VAPID key retrieval, and sync with server.
   ========================================================================== */
'use strict';

const PUSH_PUBLIC_KEY_URL = '/__sb__/push/vapid-public-key';
const PUSH_SUBSCRIBE_URL = '/__sb__/push/subscribe';
const PUSH_UNSUBSCRIBE_URL = '/__sb__/push/unsubscribe';
const PUSH_TEST_URL = '/__sb__/push/test';
const PUSH_STATUS_URL = '/__sb__/push/subscriptions';

const PUSH_SETTING_KEY = 'sb26_push_subscribed';
const PUSH_SUB_ENDPOINT_KEY = 'sb26_push_endpoint';

let pushRegistration = null;
let vapidPublicKey = null;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const uint8 = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);
  return uint8;
}

async function fetchVapidPublicKey() {
  try {
    const res = await fetch(PUSH_PUBLIC_KEY_URL);
    if (!res.ok) return null;
    const data = await res.json();
    vapidPublicKey = data.publicKey;
    return vapidPublicKey;
  } catch (e) {
    console.warn('[push] Could not fetch VAPID public key:', e);
    return null;
  }
}

window.isPushSupported = function () {
  return !!(window.serviceWorker && 'PushManager' in window);
};

function getPushUsername() {
  return window.__sbPushUsername || (window.ME && window.ME.username) || 'unknown';
}

window.subscribePush = async function () {
  if (!window.isPushSupported()) {
    return { granted: false, subscribed: false, error: 'Push API not supported' };
  }

  let reg;
  try {
    reg = await navigator.serviceWorker.ready;
  } catch (e) {
    return { granted: false, subscribed: false, error: 'Service worker not ready' };
  }

  try {
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      pushRegistration = existing;
      try { localStorage.setItem(PUSH_SETTING_KEY, 'true'); } catch (_) {}
      try { localStorage.setItem(PUSH_SUB_ENDPOINT_KEY, existing.endpoint); } catch (_) {}
      await registerWithServer(existing);
      return { granted: true, subscribed: true };
    }
  } catch (e) {
    console.warn('[push] getSubscription failed:', e);
  }

  const key = await fetchVapidPublicKey();
  if (!key) {
    return { granted: false, subscribed: false, error: 'VAPID key unavailable' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { granted: false, subscribed: false, error: 'Notification permission denied' };
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
    pushRegistration = subscription;

    try { localStorage.setItem(PUSH_SETTING_KEY, 'true'); } catch (_) {}
    try { localStorage.setItem(PUSH_SUB_ENDPOINT_KEY, subscription.endpoint); } catch (_) {}

    await registerWithServer(subscription);

    if (window.toast) {
      window.toast({ title: 'Push enabled', msg: 'You will receive notifications', type: 'success', dur: 3000 });
    }

    return { granted: true, subscribed: true };
  } catch (e) {
    console.warn('[push] subscribe failed:', e);
    if (window.toast) {
      window.toast({ title: 'Push failed', msg: e.message, type: 'error', dur: 4000 });
    }
    return { granted: false, subscribed: false, error: e.message };
  }
};

async function registerWithServer(subscription) {
  const username = getPushUsername();
  try {
    await fetch(PUSH_SUBSCRIBE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, username }),
    });
    console.log('[push] Registered with server for:', username);
  } catch (e) {
    console.warn('[push] Could not register subscription with server:', e);
  }
}

window.unsubscribePush = async function () {
  try {
    const endpoint = localStorage.getItem(PUSH_SUB_ENDPOINT_KEY);
    if (endpoint) {
      try {
        await fetch(PUSH_UNSUBSCRIBE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      } catch (e) {
        console.warn('[push] Unsubscribe server call failed:', e);
      }
      try { localStorage.removeItem(PUSH_SUB_ENDPOINT_KEY); } catch (_) {}
    }

    if (pushRegistration) {
      await pushRegistration.unsubscribe();
      pushRegistration = null;
    } else {
      let reg;
      try {
        reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      } catch (e) {
        console.warn('[push] unsubscribe SW failed:', e);
      }
    }

    try { localStorage.setItem(PUSH_SETTING_KEY, 'false'); } catch (_) {}

    if (window.toast) {
      window.toast({ title: 'Push disabled', msg: 'You will no longer receive notifications', type: 'info', dur: 3000 });
    }

    return { ok: true };
  } catch (e) {
    console.warn('[push] unsubscribe failed:', e);
    return { ok: false, error: e.message };
  }
};

window.getPushStatus = function () {
  const subscribed = localStorage.getItem(PUSH_SETTING_KEY) === 'true';
  return { subscribed, supported: window.isPushSupported() };
};

window.sendPushToAll = async function (payload) {
  try {
    const res = await fetch('/__sb__/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    });
    const data = await res.json();
    return data.ok;
  } catch (e) {
    console.warn('[push] broadcast failed:', e);
    return false;
  }
};

window.pushToUser = async function (username, payload) {
  if (!username || !payload) return false;
  try {
    const res = await fetch('/__sb__/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUsername: username, payload }),
    });
    const data = await res.json();
    return data.ok;
  } catch (e) {
    console.warn('[push] targeted send failed:', e);
    return false;
  }
};

window.pushNotify = async function (title, body, opts) {
  opts = opts || {};
  const payload = {
    title: title || 'SafeBeef',
    body: body || '',
    type: opts.type || 'info',
    tag: opts.tag || 'safebeef',
    url: opts.url || './index.html',
    requireInteraction: opts.requireInteraction === true,
    silent: opts.silent !== false,
    data: opts.data || {},
  };

  // Local (this device) — best effort.
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.active) await reg.showNotification(payload.title, payload);
        else new Notification(payload.title, payload);
      } else {
        new Notification(payload.title, payload);
      }
    }
  } catch (e) { /* ignore local failures */ }

  // Remote (other subscribed devices for the target user, or everyone).
  try {
    if (opts.username) await window.pushToUser(opts.username, payload);
    else await window.sendPushToAll(payload);
  } catch (e) { /* ignore remote failures */ }

  return true;
};

window.testPush = async function () {
  try {
    const res = await fetch(PUSH_TEST_URL, { method: 'POST' });
    const data = await res.json();
    if (window.toast) {
      window.toast({ title: 'Test push sent', msg: `Sent to ${data.sent} of ${data.total} subscriptions`, type: data.sent > 0 ? 'success' : 'warn', dur: 4000 });
    }
    return data;
  } catch (e) {
    console.warn('[push] test failed:', e);
    if (window.toast) {
      window.toast({ title: 'Test failed', msg: e.message, type: 'error', dur: 4000 });
    }
    return { ok: false, error: e.message };
  }
};

window.checkPushSubscriptions = async function () {
  try {
    const res = await fetch(PUSH_STATUS_URL);
    const data = await res.json();
    if (window.toast) {
      window.toast({ title: 'Push subscriptions', msg: `${data.count} active`, type: 'info', dur: 3000 });
    }
    return data;
  } catch (e) {
    console.warn('[push] check failed:', e);
    return { count: 0, error: e.message };
  }
};

window.initPush = async function () {
  const wasSubscribed = localStorage.getItem(PUSH_SETTING_KEY) === 'true';
  if (!wasSubscribed || !window.isPushSupported()) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      pushRegistration = existing;
      vapidPublicKey = await fetchVapidPublicKey();
      // Re-register with server in case of new instance
      await registerWithServer(existing);
    } else {
      try { localStorage.setItem(PUSH_SETTING_KEY, 'false'); } catch (_) {}
    }
  } catch (e) {
    console.warn('[push] init check failed:', e);
  }
};

// Handle incoming push messages (when app is open)
window.handlePushMessage = async function (data) {
  const payload = {
    title: data.title || 'SafeBeef',
    body: data.body || '',
    type: data.type || 'info',
    tag: data.tag || 'safebeef',
    url: data.url || './index.html',
    requireInteraction: data.requireInteraction === true,
    silent: data.silent !== false,
    data: data.data || {},
  };

  // Show local notification
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.active) await reg.showNotification(payload.title, payload);
        else new Notification(payload.title, payload);
      } else {
        new Notification(payload.title, payload);
      }
    }
  } catch (e) { console.warn('[push] show notification failed:', e); }

  // Also show in-app toast
  if (window.toast && document.visibilityState === 'visible') {
    window.toast({
      title: payload.title,
      msg: payload.body,
      type: payload.type,
      dur: payload.requireInteraction ? 0 : 5000,
      onClick: () => { window.focus(); },
    });
  }
};