# GP User Module — Implementation Lab

**Week 8 of 8 · Full GP journey, regression checks and final hand-in**

**Objective:** Prove the complete source-based GP experience works across navigation, persistence, failure recovery and PWA behaviour.

## Setup / Prerequisites

Complete Weeks 1–7. Estimated 4–6 hours. Work only with the isolated fictional-data database. The supplied scripts create additional fictional test records.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `Test-GpWorkflow.mjs`, `Test-Course.mjs`, `VALIDATION-COURSE.md`, `Integration-Reference.md`.

## Laboratory Instructions

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

## Appendix

Acceptance: source interface preserved; GP Overview discoverable; all five GP menu destinations plus profile work; chart edits/signatures version correctly; GP reports/notes persist; known demo behaviours labelled; PWA manifest/icons/worker/offline screen present; API/cache tests pass; browser installation and screen checks documented. Stretch work, not completed features: live dashboard/profile projection from D1, true discussion threads, unread/push delivery, pagination, tenant assignments and a Django adapter.
