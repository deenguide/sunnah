importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB_s4Qlhc3Y-mNgKbMyD_MuUaGwxVTYZC4",
  authDomain: "sunnah-c8b5b.firebaseapp.com",
  projectId: "sunnah-c8b5b",
  storageBucket: "sunnah-c8b5b.firebasestorage.app",
  messagingSenderId: "155920554259",
  appId: "1:155920554259:web:b510e27897ec3da87ba2e6"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'sunnah-reminder',
    renotify: true
  });
});
const CACHE_NAME = 'sunnate-muakkada-v2';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Serif+Bengali:wght@400;600;700&display=swap'
];

// Install: cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('Some assets could not be cached:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first strategy
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        return caches.match('./index.html');
      });
    })
  );
});

// Notification: message from app
const scheduledTimers = [];

self.addEventListener('message', event => {
  if (!event.data) return;

  if (event.data.type === 'SCHEDULE_REMINDERS') {
    scheduledTimers.forEach(t => clearTimeout(t));
    scheduledTimers.length = 0;

    const reminders = event.data.reminders;
    reminders.forEach(r => {
      if (!r.enabled) return;

      const now = new Date();
      let h = r.hour % 12;
      if (r.ampm === 'PM') h += 12;
      const target = new Date();
      target.setHours(h, r.minute, 0, 0);

      if (target <= now) target.setDate(target.getDate() + 1);

      const delay = target - now;
      const t = setTimeout(() => {
        self.registration.showNotification('🕌 SUNNAH রিমাইন্ডার', {
          body: r.text,
          icon: './icon-192.png',
          badge: './icon-192.png',
          vibrate: [200, 100, 200],
          tag: 'sunnah-reminder-' + h + '-' + r.minute,
          renotify: true,
          requireInteraction: false
        });
      }, delay);
      scheduledTimers.push(t);
    });
  }
});

// Notification click: open app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});