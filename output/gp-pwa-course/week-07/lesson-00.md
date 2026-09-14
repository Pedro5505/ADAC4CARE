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

## Appendix

MDN references were consulted for installability and service-worker behaviour. Browser-specific installation must be verified on the learner’s target platform. The course adds no push notifications, background medication sync or cached patient views. Use the existing Messages shortcut for in-app communication; do not label it a notification delivery service.
