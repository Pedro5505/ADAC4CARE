# GP User Module — Implementation Lab

**Week 8 of 8 · Full GP journey, regression checks and final hand-in**

**Objective:** Prove the complete source-based GP experience works across navigation, persistence, failure recovery and PWA behaviour.

## Setup / Prerequisites

Complete Weeks 1–7. Estimated 4–6 hours. Work only with the isolated fictional-data database. The supplied scripts create additional fictional test records.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `Test-GpWorkflow.mjs`, `Test-Course.mjs`, `VALIDATION-COURSE.md`, `Integration-Reference.md`.

## Laboratory Instructions

### (0) Run the automated integration gates

Validate behaviour across the HTTP/database boundary, not just whether a page compiles. Run the checks once against a fresh final checkpoint.

```powershell
Set-Location 'C:\Users\pedim\OneDrive\Desktop\Side_projects\ADAC4CARE\work\gp-pwa-learn\frontend'
node node_modules/typescript/bin/tsc --noEmit --incremental false
node --experimental-strip-types --test tests/prescriber-chart.test.ts
$env:COURSE_URL = 'http://localhost:3200'
node '..\..\..\output\gp-pwa-course\Test-Course.mjs'
node '..\..\..\output\gp-pwa-course\Test-GpWorkflow.mjs' 'http://localhost:3200'
npm run build
```

**What the code does:** Keep the development server running in its first terminal. Test-Course adds a report and message, retries a report, rejects invalid/unauthorised submissions, checks routes and manifest, and executes the actual service-worker fetch handler in a harness. Test-GpWorkflow exercises the prescription round trip. Read its configuration header before running; the integration reference describes its disposable slot and version behaviour.

**Integration contract:** Tests observe status codes, persisted reads, duplicate counts and cache-routing decisions. They are deliberately different from UI screenshots.

**Why this design:** A route returning 200 HTML is insufficient evidence that editing, retries or signatures work. The checks target effects that would otherwise be easy to fake with local state.

**What breaks if miswired:** Running against another app’s port produces misleading failures or unwanted test data. Node process restrictions can prevent test runners spawning; use an authorised normal terminal. Do not weaken assertions to obtain a green result.

**General pattern:** Contract/integration testing; invariant verification.

**Expected result:** Typecheck and relevant rule tests pass; persistent create/retry returns one record; invalid operations return their documented statuses.

**Verify before continuing:** Save terminal output with date and URL. Compare it against VALIDATION-COURSE.md, which distinguishes author-tested behaviour from checks you must perform yourself.

### (1) Walk every GP screen and menu action

Verify the complete user journey rather than treating the chart as the whole product. Use the following screen matrix as your hand-in checklist.

```powershell
$base = 'http://localhost:3200'
$paths = '/', '/people?q=James', '/people/james-miller', '/medication-charts?client=james-miller', '/reports?client=james-miller', '/messages?client=james-miller'
foreach ($path in $paths) {
  $response = Invoke-WebRequest -Uri ($base + $path)
  "$path : $($response.StatusCode)"
}
```

**What the code does:** The command checks route reachability only. In the browser select GP and Banksia House. Overview: inspect four cards, selected client, medication list and right rail. People: header/local search, no-results, clear and both card actions. Profile: allergies, orders, reports, contacts and support details. Chart: regular/PRN, edit, blur, sign and print. Reports: client/category filters and persistent GP form. Messages: client/type filters, incident/handover creation and follow-up Reply. Header: home switch, search, role menu and Bell shortcut.

**Integration contract:** Every navigation must preserve or deliberately reset the selected client/home. Every persistent action must be confirmed by a subsequent GET/reload.

**Why this design:** Testing the actual paths reveals state-reset defects that isolated page tests miss. Using one patient makes unintended context switches obvious.

**What breaks if miswired:** Do not call source fixture medication counts live after a chart edit. Do not call static profile reports current after Week 6 creation. Do not treat management pins, other-role demo actions or Bell navigation as implemented notification delivery.

**General pattern:** End-to-end journey testing; context continuity.

**Expected result:** All six main screens and GP menu options are reachable with the source layout. The implemented saves survive reload.

**Verify before continuing:** Capture one desktop and one narrow-screen image of each page and a short result note for every action above. Explain remaining source/demo limitations in your hand-in instead of concealing them.

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

### (3) Package your rebuild and explain the integration

Finish with a reviewable implementation and an explanation you can reuse in another stack. Completion means understanding the boundaries as well as reproducing screens.

```powershell
Set-Location 'C:\Users\pedim\OneDrive\Desktop\Side_projects\ADAC4CARE\work\gp-pwa-learn\frontend'
Get-Content -LiteralPath 'package.json'
Get-Content -LiteralPath '.env.example'
Get-Content -LiteralPath 'app\api\clinical-records\route.ts' -TotalCount 18
```

**What the code does:** Hand in your learner source files, a README with exact install/migration/run commands, test output and the six-screen comparison evidence. Exclude node_modules, .venv, .wrangler, actual .env files and databases. Explain one chart PATCH from field edit to D1 revision and one communication POST from form to acknowledged timeline item. Include a diagram in your own words: browser → same-origin route → access/context checks → D1 → JSON → hook → view.

**Integration contract:** Document active chart and communication endpoints, their payloads and failures. Document Django separately with its missing ID/auth/DTO bridge. Identify the source snapshot and the course extensions you used.

**Why this design:** A transferable integration explanation identifies ownership, authority and failure handling rather than memorising framework-specific filenames.

**What breaks if miswired:** A real clinical deployment still needs authenticated ingress, organisation/client access policy, operational controls and verification of the intended clinical workflow. This course is an isolated rebuild with fictional data, not evidence those missing systems are already supplied.

**General pattern:** Reproducible delivery; boundary documentation; evidence-based acceptance.

**Expected result:** Another learner can run your copy and follow the same GP journey without hidden files or undocumented services.

**Verify before continuing:** Stop both servers with Ctrl+C. Keep your workspace and local database for comparison; do not copy secrets or test patient records into the final source ZIP. Re-run only checks affected by subsequent changes.

## Appendix

Acceptance: source interface preserved; GP Overview discoverable; all five GP menu destinations plus profile work; chart edits/signatures version correctly; GP reports/notes persist; known demo behaviours labelled; PWA manifest/icons/worker/offline screen present; API/cache tests pass; browser installation and screen checks documented. Stretch work, not completed features: live dashboard/profile projection from D1, true discussion threads, unread/push delivery, pagination, tenant assignments and a Django adapter.

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
