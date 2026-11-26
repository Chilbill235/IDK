const CACHE_NAME = 'safebeef-v36';
const ASSETS = [
  './',
  './index.html',
  './auth.html',
  './styles.css',
  './auth.js',
  './module.js',
  './prank-engine.js',
  './real-apis.js',
  './app.js',
  './push.js',
  './manifest.json',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Network-first for same-origin assets so edits apply immediately (the dev
  // server disables HTTP caching); fall back to the cache when offline.
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request).then(res => {
        try {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, copy)).catch(() => {});
        } catch (_) {}
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request).catch(() => res)));
});

self.addEventListener('push', (e) => {
  let data = { title: 'SafeBeef', body: 'You have a new notification.', type: 'info', url: './index.html', tag: 'safebeef' };
  try { if (e.data) data = e.data.json(); } catch (err) {}

  const notificationOptions = {
    body: data.body || '',
    icon: data.icon || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dGV4dCB5PSIuOWVtIiBmb250LXNpemU9IjkwIj7wn5CxPC90ZXh0Pjwvc3ZnPg==',
    badge: data.badge || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dGV4dCB5PSIuOWVtIiBmb250LXNpemU9IjkwIj7wn5CxPC90ZXh0Pjwvc3ZnPg==',
    vibrate: data.vibrate || [200, 100, 200],
    tag: data.tag || 'safebeef',
    renotify: data.renotify !== false,
    requireInteraction: data.requireInteraction === true,
    silent: data.silent !== false,
    data: data.data || {},
    actions: data.actions || [
      { action: 'open', title: 'Open SafeBeef', icon: './manifest.json' },
      { action: 'close', title: 'Close' },
    ],
  };

  e.waitUntil(
    self.registration.showNotification(data.title || 'SafeBeef', notificationOptions)
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  const action = e.action;
  const url = e.notification.data && e.notification.data.url ? e.notification.data.url : './index.html';

  if (action === 'close') {
    return;
  }

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('index.html') || c.url.endsWith('/')) {
          return c.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('notificationclose', (e) => {
  // Notification dismissed; no-op for analytics could go here
});