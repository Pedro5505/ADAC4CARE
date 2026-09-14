# GP User Module — Implementation Lab

**Week 7 of 8 · Installable PWA and an explicit offline experience**

**Objective:** Add install metadata, icons, service-worker registration and a generic offline screen without caching clinical pages or queuing writes.

## Setup / Prerequisites

Complete Week 6. Estimated 4–6 hours. Use localhost for local testing and HTTPS for a later authorised deployment. Installation controls differ across browsers and devices.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/public/manifest.webmanifest`, `frontend/public/icons/icon-192.png`, `frontend/public/icons/icon-512.png`, `frontend/public/offline.html`, `frontend/public/sw.js`, `frontend/components/pwa-status.tsx`, `frontend/app/layout.tsx`, `frontend/app/globals.css`.

## Laboratory Instructions

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

## Appendix

MDN references were consulted for installability and service-worker behaviour. Browser-specific installation must be verified on the learner’s target platform. The course adds no push notifications, background medication sync or cached patient views. Use the existing Messages shortcut for in-app communication; do not label it a notification delivery service.
