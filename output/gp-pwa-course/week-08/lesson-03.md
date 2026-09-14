# GP User Module — Implementation Lab

**Week 8 of 8 · Full GP journey, regression checks and final hand-in**

**Objective:** Prove the complete source-based GP experience works across navigation, persistence, failure recovery and PWA behaviour.

## Setup / Prerequisites

Complete Weeks 1–7. Estimated 4–6 hours. Work only with the isolated fictional-data database. The supplied scripts create additional fictional test records.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `Test-GpWorkflow.mjs`, `Test-Course.mjs`, `VALIDATION-COURSE.md`, `Integration-Reference.md`.

## Laboratory Instructions

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
