# GP User Module — Implementation Lab

**Week 4 of 8 · Database, HTTP contracts and GP permission checks**

**Objective:** Rebuild the active D1 chart read/write path and explain each boundary from request to stored revision.

## Setup / Prerequisites

Complete Weeks 1–3 and keep local D1 running. Estimated 6–8 hours. This week is intentionally separate from editing/signing UI.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/db/schema.ts`, `frontend/drizzle/0001_short_random.sql`, `frontend/lib/chart-db.ts`, `frontend/lib/chart-access.ts`, `frontend/lib/chart-server.ts`, `frontend/app/api/prescriber-chart/route.ts`.

## Laboratory Instructions

### (0) Create revision and administration storage

Reconstruct the actual persistence schema. Prescribing appends a new revision; staff administrations remain separate signed records.

**Source:** `source/frontend/drizzle/0001_short_random.sql`, lines 1–25. Complete file.

```sql
CREATE TABLE `administration_signatures` (
	`home_id` text NOT NULL,
	`client_id` text NOT NULL,
	`medication_id` text NOT NULL,
	`cell_key` text NOT NULL,
	`order_version` integer NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`qty` text NOT NULL,
	`signature` text NOT NULL,
	`actor` text NOT NULL,
	`saved_at` text NOT NULL,
	PRIMARY KEY(`home_id`, `client_id`, `medication_id`, `cell_key`)
);
--> statement-breakpoint
CREATE TABLE `prescription_revisions` (
	`home_id` text NOT NULL,
	`client_id` text NOT NULL,
	`medication_id` text NOT NULL,
	`version` integer NOT NULL,
	`prescription` text NOT NULL,
	`actor` text NOT NULL,
	`saved_at` text NOT NULL,
	PRIMARY KEY(`home_id`, `client_id`, `medication_id`, `version`)
);
```

**Source:** `source/frontend/lib/chart-db.ts`, lines 1–6. Complete file.

```typescript
import { env } from 'cloudflare:workers';

type ChartEnv = { DB: D1Database; ADAC_GP_EMAILS?: string; ADAC_CARER_EMAILS?: string };
export function chartDatabase() { return (env as unknown as ChartEnv).DB; }
export function gpEmails() { return (env as unknown as ChartEnv).ADAC_GP_EMAILS ?? ''; }
export function carerEmails() { return (env as unknown as ChartEnv).ADAC_CARER_EMAILS ?? ''; }
```

**What the code does:** Recreate the migration from the complete block and compare it with db/schema.ts. Do not reapply an already recorded migration by changing its contents: use a new migration for future schema changes. chartDatabase reads the DB binding from cloudflare:workers. ADAC_GP_EMAILS and ADAC_CARER_EMAILS are server-side allowlists, not browser settings.

**Integration contract:** Prescription partition: home_id/client_id/medication_id; revision identity adds version. JSON stores the complete prescription. Administration records retain order_version and cell_key so a later schedule edit cannot silently move history.

**Why this design:** An append-only model preserves earlier signed orders and makes conflicts detectable. A separate administration table models a different actor and event.

**What breaks if miswired:** Using only medication_id as a primary key would overwrite history and collide across homes/clients. Renaming DB in one file but not the runtime config makes every database call fail.

**General pattern:** Append-only revision log; composite identity; dependency binding.

**Expected result:** Local D1 contains prescription_revisions and administration_signatures with the expected keys.

**Verify before continuing:** Run the Week 1 local migration command from the learner frontend. Read the schema using Wrangler d1 execute DB --local --config wrangler.lab.json --command "SELECT name FROM sqlite_master WHERE type = 'table';". Compare column names with the route SQL.

## Appendix

Active endpoints: GET/PATCH /api/prescriber-chart and shared POST /api/chart-administrations. GP can read administrations but cannot sign them. Local config uses DB and the placeholder database ID only with --local. Do not run --remote as part of this lab. Production identity/session/MFA is an explicit deployment dependency, not a completed course login feature.
