# GP User Module — Implementation Lab

**Week 7 of 8 · Installable PWA and an explicit offline experience**

**Objective:** Add install metadata, icons, service-worker registration and a generic offline screen without caching clinical pages or queuing writes.

## Setup / Prerequisites

Complete Week 6. Estimated 4–6 hours. Use localhost for local testing and HTTPS for a later authorised deployment. Installation controls differ across browsers and devices.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/public/manifest.webmanifest`, `frontend/public/icons/icon-192.png`, `frontend/public/icons/icon-512.png`, `frontend/public/offline.html`, `frontend/public/sw.js`, `frontend/components/pwa-status.tsx`, `frontend/app/layout.tsx`, `frontend/app/globals.css`.

## Laboratory Instructions

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
