# GP User Module — Implementation Lab

**Week 1 of 8 · Boot the complete interface and rebuild the shared shell**

**Objective:** Run the actual repository stack and reconstruct the shared GP page frame without losing the source styling.

## Setup / Prerequisites

PowerShell, Node 22.13 or newer (author used 22.23), npm 10, Python 3.12 recommended for the Django side. Internet is needed for a fresh npm/pip install. Use fictional fixture records. Estimated 5–7 hours in two sessions.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/package.json`, `frontend/vite.config.ts`, `frontend/app/layout.tsx`, `frontend/app/globals.css`, `frontend/components/role-provider.tsx`, `frontend/components/app-shell.tsx`.

## Laboratory Instructions

### (1) Boot the separate Django service and identify the boundary

Install the repository’s Python service so you can compare its contracts with the active chart API. This service is present in the repo but is not connected to the GP chart screen.

```powershell
Set-Location 'C:\Users\pedim\OneDrive\Desktop\Side_projects\ADAC4CARE\work\gp-pwa-learn\backend'
py -3.12 -m venv .venv
& '.\.venv\Scripts\python.exe' -m pip install -r requirements/dev.txt
$env:DJANGO_SETTINGS_MODULE = 'config.settings.dev'
$env:DJANGO_DEBUG = 'true'
$env:DATABASE_URL = "sqlite:///$((Join-Path $PWD 'gp-course.sqlite3') -replace '\\','/')"
& '.\.venv\Scripts\python.exe' manage.py migrate
& '.\.venv\Scripts\python.exe' manage.py runserver localhost:8100
```

**What the code does:** Use a second terminal. If Python 3.12 is not installed, install it first or deliberately select your compatible installed Python version. The author previously tested the separate service using the repo’s Python environment. Environment variables here precede settings import, which matters because security settings are computed during import. A fresh copied .env.example supplies placeholders, not credentials.

**Integration contract:** GET http://localhost:8100/api/medication-orders/ requires a Django authenticated session. An unauthenticated 403 is expected. Frontend NEXT_PUBLIC_API_URL is a legacy client setting and does not redirect relative chart fetches to this server.

**Why this design:** Proving both services boot is different from proving a bridge exists. The D1 chart uses string fixture IDs and versioned JSON; Django uses UUIDs and relational medication orders.

**What breaks if miswired:** Changing the frontend base URL alone cannot map IDs, DTO fields, sessions, CSRF or revision semantics. This repo has no completed GP login/MFA bridge to teach as an existing feature.

**General pattern:** Explicit service boundary; adapter required between different domain contracts.

**Expected result:** Django starts and migrations apply. An unauthenticated request is rejected; the frontend chart continues to use port 3200.

**Verify before continuing:** Inspect lib/api-client.ts and search its imports. Compare the Network request URL with NEXT_PUBLIC_API_URL. Write down why no JWT should be added just because another tutorial used one.

## Appendix

Toolchain: React 19.2.6, Vinext 1.0.0-beta.5, Vite 8.0.13, TypeScript 5.9.3, Tailwind 4.2.1. D1 is the active GP persistence store; Drizzle supplies schema/migrations. Django 5.2.6 and DRF 3.16.1 are separate. No clone URL is supplied because frontend/.git has no remote. Use the included source snapshot or the local repo path above. Stop dev servers with Ctrl+C; keep the learner folders and databases for next week.
