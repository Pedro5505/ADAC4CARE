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

## Appendix

Acceptance: source interface preserved; GP Overview discoverable; all five GP menu destinations plus profile work; chart edits/signatures version correctly; GP reports/notes persist; known demo behaviours labelled; PWA manifest/icons/worker/offline screen present; API/cache tests pass; browser installation and screen checks documented. Stretch work, not completed features: live dashboard/profile projection from D1, true discussion threads, unread/push delivery, pagination, tenant assignments and a Django adapter.
