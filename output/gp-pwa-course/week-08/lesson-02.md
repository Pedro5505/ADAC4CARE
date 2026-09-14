# GP User Module — Implementation Lab

**Week 8 of 8 · Full GP journey, regression checks and final hand-in**

**Objective:** Prove the complete source-based GP experience works across navigation, persistence, failure recovery and PWA behaviour.

## Setup / Prerequisites

Complete Weeks 1–7. Estimated 4–6 hours. Work only with the isolated fictional-data database. The supplied scripts create additional fictional test records.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `Test-GpWorkflow.mjs`, `Test-Course.mjs`, `VALIDATION-COURSE.md`, `Integration-Reference.md`.

## Laboratory Instructions

### (2) Exercise conflicts, accessibility, print and PWA recovery

Test conditions that normal happy-path navigation does not reveal. Focus on whether the interface tells the truth when it cannot complete an action.

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

**What the code does:** Use two chart tabs on the same medicine: save in A, then submit stale content in B and expect a conflict rather than overwrite. Disconnect while a draft is unsaved; verify no Saved label or background queue appears. Restore connectivity and reload/compare before retrying. At 390px, 768px and desktop widths inspect menus, dialog scrolling, chart horizontal scrolling and button reachability. Keyboard-test search, tabs, select menus, dialog focus/close and signature alternatives actually present in the source. Print preview should remove navigation while retaining chart information.

**Integration contract:** A failed client response does not prove a failed server commit. Chart recovery uses version comparison; communication recovery uses the unchanged request ID. Offline fallback is generic by design.

**Why this design:** Different mutations require different retry strategies. Accessibility and responsive layout are user-facing contracts not established by API tests.

**What breaks if miswired:** Automatically discarding a dirty draft on a conflict loses user work. Claiming canvas accessibility or device installation from typecheck alone is not evidence. Record problems found; do not mark an unperformed check passed.

**General pattern:** Failure-mode testing; accessible interaction review; conservative recovery.

**Expected result:** Stale writes conflict, offline state is visible, reconnect allows verification, and no patient documents appear in the worker cache.

**Verify before continuing:** Write the exact observed result for each browser/device. Inspect both 192px/512px icons and standalone start URL after installation. Remove the local install only after collecting evidence.

## Appendix

Acceptance: source interface preserved; GP Overview discoverable; all five GP menu destinations plus profile work; chart edits/signatures version correctly; GP reports/notes persist; known demo behaviours labelled; PWA manifest/icons/worker/offline screen present; API/cache tests pass; browser installation and screen checks documented. Stretch work, not completed features: live dashboard/profile projection from D1, true discussion threads, unread/push delivery, pagination, tenant assignments and a Django adapter.
