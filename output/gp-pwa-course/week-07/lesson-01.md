# GP User Module — Implementation Lab

**Week 7 of 8 · Installable PWA and an explicit offline experience**

**Objective:** Add install metadata, icons, service-worker registration and a generic offline screen without caching clinical pages or queuing writes.

## Setup / Prerequisites

Complete Week 6. Estimated 4–6 hours. Use localhost for local testing and HTTPS for a later authorised deployment. Installation controls differ across browsers and devices.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/public/manifest.webmanifest`, `frontend/public/icons/icon-192.png`, `frontend/public/icons/icon-512.png`, `frontend/public/offline.html`, `frontend/public/sw.js`, `frontend/components/pwa-status.tsx`, `frontend/app/layout.tsx`, `frontend/app/globals.css`.

## Laboratory Instructions

### (1) Implement the generic offline page and cache allowlist

Define offline behaviour deliberately. A GP should see an honest offline message instead of a cached patient page that looks current.

**Source:** `extensions/week-07/frontend/public/offline.html`, lines 1–3. Complete file.

```html
<!doctype html><html lang="en-AU"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#B19CD7"><title>ADAC4CARE — Offline</title>
<style>body{background:#F7F5FB;color:#26372c;font:18px system-ui;margin:0;padding:8vh 7vw}main{max-width:38rem;background:white;border-radius:24px;padding:32px;border-top:8px solid #c2d79c}a{color:#435d30}</style>
<main><h1>You are offline</h1><p>Connect to the internet to load patient information and confirm saved changes.</p><p>This course app does not store clinical pages offline or queue prescriptions. A save without confirmation must be checked when the connection returns.</p><a href="/">Try the GP home page again</a></main></html>
```

**Source:** `extensions/week-07/frontend/public/sw.js`, lines 1–21. Complete file.

```javascript
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
```

**What the code does:** Create these complete files. Install preloads only offline.html and the two generic icons. Fetch handling ignores non-GET, cross-origin and /api/ requests. Navigations try the network and fall back to the generic page only on network failure. Clinical route HTML is never written to Cache Storage by this worker. Activation deletes only older caches with this course’s own prefix.

**Integration contract:** Cache allowlist: exactly three public paths. API GET/PATCH/POST use their ordinary network behaviour. There is no background sync or offline mutation queue.

**Why this design:** An offline fallback communicates loss of access without inventing a medical-record synchronisation system. Scoped cleanup avoids deleting unrelated applications’ caches.

**What breaks if miswired:** A catch-all cache-first fetch strategy could retain patient pages and API JSON. Serving the offline page for failed API requests would turn expected JSON into HTML. Network-only is not a guarantee of zero browser memory or HTTP caching; it describes this worker’s explicit storage policy.

**General pattern:** Allowlist caching; network-first navigation with generic fallback; network-only mutations.

**Expected result:** After worker activation and a second visit, turning the network offline and navigating produces the generic offline screen.

**Verify before continuing:** Inspect Cache Storage: only offline.html and icons should be present. Open a patient page online, then check again. Run the worker routing harness in Test-Course. Official reference: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers

## Appendix

MDN references were consulted for installability and service-worker behaviour. Browser-specific installation must be verified on the learner’s target platform. The course adds no push notifications, background medication sync or cached patient views. Use the existing Messages shortcut for in-app communication; do not label it a notification delivery service.
