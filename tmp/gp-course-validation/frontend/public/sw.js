/* Course extension: cache only these generic public resources. */
const CACHE = 'adac-gp-public-v1';
const PUBLIC = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLIC)));
  // Do not skipWaiting: an open chart keeps its current worker until closed.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('adac-gp-public-') && k !== CACHE).map(k => caches.delete(k)))));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html').then(response => response || new Response('Offline. Reconnect to continue.', { status: 503 }))));
  } else if (PUBLIC.includes(url.pathname) && !url.search) {
    event.respondWith(caches.match(request).then(response => response || fetch(request)));
  }
});
