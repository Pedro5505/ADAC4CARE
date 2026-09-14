# GP User Module — Implementation Lab

**Week 1 of 8 · Boot the complete interface and rebuild the shared shell**

**Objective:** Run the actual repository stack and reconstruct the shared GP page frame without losing the source styling.

## Setup / Prerequisites

PowerShell, Node 22.13 or newer (author used 22.23), npm 10, Python 3.12 recommended for the Django side. Internet is needed for a fresh npm/pip install. Use fictional fixture records. Estimated 5–7 hours in two sessions.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/package.json`, `frontend/vite.config.ts`, `frontend/app/layout.tsx`, `frontend/app/globals.css`, `frontend/components/role-provider.tsx`, `frontend/components/app-shell.tsx`.

## Laboratory Instructions

### (0) Create a separate course workspace and install the frontend

First make a runnable reference copy. This preserves the original application and gives you an exact visual target while you rebuild one file at a time in your learner copy.

```powershell
Set-Location 'C:\Users\pedim\OneDrive\Desktop\Side_projects\ADAC4CARE'
& '.\output\gp-pwa-course\New-CourseWorkspace.ps1' -Week 1 -Destination "$PWD\work\gp-pwa-learn"
Set-Location '.\work\gp-pwa-learn\frontend'
node --version
npm --version
npm ci
node node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --local --config wrangler.lab.json
npm run dev -- --host localhost --port 3200
```

**What the code does:** Keep this terminal running. Open http://localhost:3200. The snapshot contains the complete app, including shared role dependencies; its initial selected role is RN. Choose GP in the demo role selector. Do not create a new generic Next.js app: this repo runs Vinext on Vite with the Cloudflare plugin. The script refuses an existing destination. npm ci uses the included lockfile. The local migration command creates tables in this copy’s .wrangler/state tree.

**Integration contract:** The browser talks to the same-origin /api routes on port 3200. The DB binding is named DB in both the Vite config and wrangler.lab.json. This command does not use the remote database.

**Why this design:** One origin lets the browser use relative URLs and the server use a private database binding. A named binding is not a public API URL.

**What breaks if miswired:** Running migrations in the original frontend directory populates the wrong local database. A missing table produces a 503 from the chart route. If native helpers report spawn EPERM, run from a normal authorised terminal; do not rewrite the application to work around process permissions.

**General pattern:** Isolated working copy; same-origin backend-for-frontend.

**Expected result:** People and medication charts render in GP mode. Chart GET returns 200 with records, administrations and capability booleans.

**Verify before continuing:** In browser Network, inspect /api/prescriber-chart?home=banksia-house&client=james-miller. Record status, content type and body. Stop here if it is 503. Save a screenshot as your visual reference.

## Appendix

Toolchain: React 19.2.6, Vinext 1.0.0-beta.5, Vite 8.0.13, TypeScript 5.9.3, Tailwind 4.2.1. D1 is the active GP persistence store; Drizzle supplies schema/migrations. Django 5.2.6 and DRF 3.16.1 are separate. No clone URL is supplied because frontend/.git has no remote. Use the included source snapshot or the local repo path above. Stop dev servers with Ctrl+C; keep the learner folders and databases for next week.
