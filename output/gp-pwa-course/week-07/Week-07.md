# GP User Module — Implementation Lab

**Week 7 of 8 · Installable PWA and an explicit offline experience**

**Objective:** Add install metadata, icons, service-worker registration and a generic offline screen without caching clinical pages or queuing writes.

## Setup / Prerequisites

Complete Week 6. Estimated 4–6 hours. Use localhost for local testing and HTTPS for a later authorised deployment. Installation controls differ across browsers and devices.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/public/manifest.webmanifest`, `frontend/public/icons/icon-192.png`, `frontend/public/icons/icon-512.png`, `frontend/public/offline.html`, `frontend/public/sw.js`, `frontend/components/pwa-status.tsx`, `frontend/app/layout.tsx`, `frontend/app/globals.css`.

## Laboratory Instructions

### (0) Complete the manifest and app identity

The original manifest has an empty icons array. Extend it into a coherent installed-app identity while retaining the application name and palette.

**Source:** `extensions/week-07/frontend/public/manifest.webmanifest`, lines 1–25. Complete file.

```json
{
  "id": "/",
  "name": "ADAC4CARE Medication Management",
  "short_name": "ADAC4CARE",
  "description": "GP medication management course workspace",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#F7F5FB",
  "theme_color": "#B19CD7",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }
  ]
}
```

**What the code does:** Replace the manifest with this complete file and copy both provided PNG icons into public/icons. They are new course assets using the existing palette. Keep the root metadata manifest link. id and scope anchor the installation to this origin root, start_url opens Overview, and display requests a standalone window. The browser remains responsible for deciding when and how installation is offered.

**Integration contract:** The browser fetches /manifest.webmanifest and its public icon URLs. The 192×192 and 512×512 PNG files must return actual PNG bytes, not an HTML fallback.

**Why this design:** A manifest describes application identity and presentation. It is not an authentication system and does not by itself define an offline data policy.

**What breaks if miswired:** Broken icon URLs or an incorrect scope can make the installed experience incomplete. Do not promise identical prompts on Chrome, Edge and iOS. A service worker is useful for this offline design but is not a universal installability requirement.

**General pattern:** Web app manifest; progressive enhancement.

**Expected result:** Browser developer tools display the manifest name, scope, standalone mode and both icons without fetch errors.

**Verify before continuing:** Open both icon URLs directly. Inspect manifest in Application tools, then use the browser’s install/add-to-home-screen option if offered. Official reference: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable

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

### (2) Register the worker and show connection/update status

Connect PWA support to the existing root layout while keeping its provider and source page styling.

**Source:** `extensions/week-07/frontend/components/pwa-status.tsx`, lines 1–21. Complete file.

```tsx
'use client';
import { useEffect, useState } from 'react';

export function PwaStatus() {
  const [offline, setOffline] = useState(false);
  const [status, setStatus] = useState('');
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update(); window.addEventListener('online', update); window.addEventListener('offline', update);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then(registration => {
          if (registration.waiting) setStatus('An app update is ready. Finish your work, then close all app windows and reopen.');
        })
        .catch(() => setStatus('Offline support is unavailable. You can continue using the online app.'));
    }
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  if (!offline && !status) return null;
  return <aside role="status" className="course-pwa-status">{offline ? 'Offline: patient data may be stale. Saves are not queued. Reconnect and confirm each change.' : status}</aside>;
}
```

**Source:** `extensions/week-07/frontend/app/layout.tsx`, lines 1–27. Complete file.

```tsx
import type { Metadata } from 'next';
import { RoleProvider } from '@/components/role-provider';
import './globals.css';
import { PwaStatus } from '@/components/pwa-status';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'ADAC4CARE | Medication management',
  description: 'Safer, calmer medication management for disability and community care.',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'ADAC4CARE | Medication management',
    description: 'Safer medication management for every shift.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'ADAC4CARE medication management' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ADAC4CARE | Medication management',
    description: 'Safer medication management for every shift.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-AU"><body><RoleProvider><PwaStatus />{children}</RoleProvider></body></html>;
}
```

**What the code does:** Create PwaStatus, replace the Week 7 layout and use the complete Week 7 globals.css. Only a small status style is appended to the source CSS. navigator.onLine provides an advisory banner, while actual requests still determine success. Registration failures are visible. The worker does not call skipWaiting, so an existing chart is not forcibly switched to a new worker mid-session.

**Integration contract:** register(/sw.js, {scope: /, updateViaCache: none}) asks the browser to manage the worker lifecycle. The status component adds no API endpoint and does not alter chart save semantics.

**Why this design:** A new worker should not silently change the app environment while the user has an unsaved clinical draft. Waiting for windows to close is a simple course update policy.

**What breaks if miswired:** The online flag can be true while the server is unavailable; it cannot justify a Saved message. A waiting update is checked on registration here, not exposed through a complete live update centre. In production, version changes require incrementing the cache name when cached resources change.

**General pattern:** Progressive enhancement; explicit worker lifecycle; advisory connectivity state.

**Expected result:** Online pages retain their source layout. Loss of network shows a status banner; hard navigation offline shows the generic page.

**Verify before continuing:** Check online/offline transitions in developer tools, then close all app tabs and reopen. Confirm the new worker controls the next navigation. Do not expect first-load offline support before the initial cache install succeeds.

### (3) Verify installation, recovery and clinical data boundaries

Test the installed experience as a user would, including reopening and reconnecting. Keep this separate from unit tests because operating-system installation is a browser capability.

```powershell
Set-Location 'C:\Users\pedim\OneDrive\Desktop\Side_projects\ADAC4CARE\work\gp-pwa-learn\frontend'
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run build
```

**What the code does:** These commands check types and build output. Then use the manual installation matrix in Week 8. On localhost, use a supporting desktop browser’s install control; on a phone, localhost means that phone itself, so testing the laptop app requires a deliberately configured secure origin rather than replacing localhost with an arbitrary insecure LAN address. No hosting or deployment command is part of this course.

**Integration contract:** An installed window uses the same origin, routes, storage and server permissions as the browser application. It is not a separate native backend.

**Why this design:** Installability, offline fallback, application data consistency and authorisation are four different properties and require different evidence.

**What breaks if miswired:** A successful build does not prove installation, mobile rendering or hosted identity. A request that lost its response might still have committed; after reconnecting compare chart versions or retry an unchanged communication ID before creating another record.

**General pattern:** Layered verification; uncertain-outcome recovery.

**Expected result:** The app can be opened in an installed window where supported, using the original navigation and pages. Offline writes never appear queued or confirmed.

**Verify before continuing:** Record browser/OS, install result, icon, start page, standalone display, offline fallback, reconnect result and worker cache entries. For cleanup, remove only this app’s worker/cache through browser Application tools; leave the D1 database intact.

## Appendix

MDN references were consulted for installability and service-worker behaviour. Browser-specific installation must be verified on the learner’s target platform. The course adds no push notifications, background medication sync or cached patient views. Use the existing Messages shortcut for in-app communication; do not label it a notification delivery service.

### Endpoint quick reference

| Method / route | Purpose | Access and response |
|---|---|---|
| GET /api/prescriber-chart?home=…&client=… | Latest chart and administrations | Authenticated; 200 capability envelope; 401/404/503 |
| PATCH /api/prescriber-chart?home=…&client=… | Append prescription revision | GP write + same origin; 200 record; 400/403/404/409/413/503 |
| POST /api/chart-administrations?home=…&client=… | Shared staff signature path | Carer only; GP reads history through chart GET |
| GET /api/clinical-records?home=… | Week 6 report/message list | Authenticated; 200 records/canCreate; 401/404/503 |
| POST /api/clinical-records?home=… | Week 6 GP instruction/note | GP + same origin; 201 create/200 retry; 400/403/404/409/413/503 |
| GET /api/medication-orders/ on Django | Separate relational API | Django session required; not called by chart UI |

### Storage and configuration

| Item | Meaning |
|---|---|
| prescription_revisions | home/client/medication/version key; prescription JSON, actor and saved_at |
| administration_signatures | home/client/medication/cell key; order version and signed event |
| gp_communications (Week 6) | UUID, home/client, kind, original request, returned record, actor, creation time |
| DB | Private D1 runtime binding; migrations and dev server must share local state location |
| ADAC_GP_EMAILS | Server GP allowlist for hosted identity; local development deliberately bypasses it |
| ADAC_CARER_EMAILS | Shared carer allowlist; does not grant GP administration actions |
| NEXT_PUBLIC_API_URL | Legacy Django client URL; not used by relative chart fetches |
| NEXT_PUBLIC_SITE_URL | Root metadata base; local example is port 3000 and may be set to port 3200 for this course |
| DJANGO_SETTINGS_MODULE / DJANGO_DEBUG / DATABASE_URL | Separate Python service settings; set before launching Django |

**Source provenance:** Snapshot of the actual repository inspected 10 September 2026; frontend commit c53e0eaccf0d9771a9babfada1fab6de8b1f35f3. Full original files are under source; new teaching code is under extensions/week-02, week-06 and week-07. source-manifest.json records hashes. Integration-Reference.md preserves the detailed first lab for deeper chart/Django explanations.
