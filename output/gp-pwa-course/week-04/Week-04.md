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

### (1) Rebuild actor, permission and resource context

Before SQL runs, determine who is calling and whether the requested home/client exists. Presentation role selection is only one input to write permission.

**Source:** `source/frontend/lib/chart-access.ts`, lines 1–16. Complete file.

```typescript
// The demo role selector is never sufficient to grant hosted write access.
export function chartAccess(headers: Headers, allowedEmails: string, localDevelopment: boolean, carerEmails = '') {
  const email = headers.get('oai-authenticated-user-email')?.toLowerCase() ?? '';
  const id = headers.get('oai-authenticated-user-id');
  const authenticated = localDevelopment || Boolean(id && email);
  const gp = localDevelopment || allowedEmails.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean).includes(email);
  const carer = localDevelopment || carerEmails.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean).includes(email);
  return {
    authenticated,
    canPrescribe: authenticated && gp,
    actor: localDevelopment ? (headers.get('x-chart-role') === 'carer' ? 'Local carer evaluation' : 'Local GP evaluation') : id ?? '',
    canWrite: authenticated && gp && headers.get('x-chart-role') === 'gp',
    canAdminister: authenticated && carer,
    canSign: authenticated && carer && headers.get('x-chart-role') === 'carer',
  };
}
```

**Source:** `source/frontend/lib/chart-server.ts`, lines 1–7. Complete file.

```typescript
import { groupHomes } from '@/data/demo';
export function chartContext(url: URL) {
  const home = groupHomes.find((item) => item.id === url.searchParams.get('home'));
  const client = home?.clients.find((item) => item.id === url.searchParams.get('client'));
  return home && client ? { home, client } : null;
}
export const chartJson = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
```

**What the code does:** Implement both complete modules. In local development, the deliberate demo bypass permits evaluation and uses a local actor string. In the hosted path, authenticated identity comes from trusted oai-authenticated-user-id/email headers, GP allowlist membership enables prescribing, and X-Chart-Role must also be gp for writes. chartContext searches a real home and a client within it rather than using fixture fallback helpers.

**Integration contract:** Unauthenticated read: 401. Invalid home/client: 404. Unauthorised write: 403. Responses are JSON with Cache-Control: no-store and errors shaped {error: string}.

**Why this design:** The server must independently evaluate permission because client storage, request bodies and selected roles are user-controlled. Resource validation prevents mismatched home/client identifiers.

**What breaks if miswired:** These trusted headers are safe only behind an ingress that authenticates and overwrites them; a directly exposed server that trusts arbitrary incoming headers is not secured. The repo does not implement organisation-level GP/client assignment on this path. Local success does not prove hosted security.

**General pattern:** Server-side authorisation; trusted identity boundary; contextual resource validation.

**Expected result:** You can explain why X-Chart-Role: gp alone is insufficient in hosted mode and why the local actor differs.

**Verify before continuing:** Run the chart-access unit tests in Week 8. Inspect the actual deployment ingress separately before any real deployment; do not invent a login screen that grants privileges locally.

### (2) Implement GET and reconstruct the latest chart

Read the latest revision of each medicine and return the capability envelope required by the UI.

**Source:** `source/frontend/app/api/prescriber-chart/route.ts`, lines 1–28. Verbatim chunk; assemble with the other chunks in the accompanying complete file.

```typescript
import { chartDatabase, gpEmails, carerEmails } from '@/lib/chart-db';
import { chartAccess } from '@/lib/chart-access';
import { initialPrescription, prescriptionChanged, validatePrescription, type Prescription } from '@/lib/prescriber-chart';
import { chartContext as context, chartJson as json } from '@/lib/chart-server';

export const dynamic = 'force-dynamic';
const access = (request: Request) => chartAccess(request.headers, gpEmails(), import.meta.env.DEV, carerEmails());

export async function GET(request: Request) {
  const user = access(request);
  if (!user.authenticated) return json({ error: 'Sign in to view this medication chart.' }, 401);
  const ctx = context(new URL(request.url));
  if (!ctx) return json({ error: 'Client not found.' }, 404);
  try {
    const { results } = await chartDatabase().prepare(`SELECT medication_id, version, prescription FROM prescription_revisions
      WHERE home_id = ? AND client_id = ? AND (medication_id, version) IN
      (SELECT medication_id, MAX(version) FROM prescription_revisions WHERE home_id = ? AND client_id = ? GROUP BY medication_id)`)
      .bind(ctx.home.id, ctx.client.id, ctx.home.id, ctx.client.id).all<{ medication_id: string; version: number; prescription: string }>();
    const administrationResult = await chartDatabase().prepare('SELECT medication_id, cell_key, order_version, date, time, qty, signature FROM administration_signatures WHERE home_id = ? AND client_id = ?')
      .bind(ctx.home.id, ctx.client.id).all<{ medication_id: string; cell_key: string; order_version: number; date: string; time: string; qty: string; signature: string }>();
    return json({ canPrescribe: user.canPrescribe, canAdminister: user.canAdminister,
      records: results.map((r) => ({ medicationId: r.medication_id, version: r.version, prescription: { ...initialPrescription(ctx.client.medications.find((m) => m.id === r.medication_id)), ...JSON.parse(r.prescription) } })),
      administrations: administrationResult.results.map((r) => ({ medicationId: r.medication_id, cellKey: r.cell_key, orderVersion: r.order_version, date: r.date, time: r.time, qty: r.qty, signature: JSON.parse(r.signature) })),
    });
  } catch {
    return json({ error: 'The chart could not be loaded. Please retry.' }, 503);
  }
}
```

**What the code does:** Create the route file with this GET chunk first. The grouped MAX(version) query is scoped to the selected home/client. Stored JSON is overlaid on initialPrescription for a complete shape. The second query returns administration records. Capabilities travel beside the data; the browser does not have to guess them from a role label.

**Integration contract:** GET /api/prescriber-chart?home=banksia-house&client=james-miller returns {records, administrations, canPrescribe, canAdminister}. Empty arrays on a fresh database are valid. Fixture defaults still render in the chart.

**Why this design:** Returning server capability decisions with the resource aligns editable controls with the resource’s actual access policy. no-store prevents the response being reused as a stale HTTP cache entry.

**What breaks if miswired:** Removing the inner scope can select a revision from a different partition. Returning a different JSON field name makes the hook fail during iteration. Database failure must remain 503 rather than a fake empty success.

**General pattern:** Query projection; capability envelope; fail-visible reads.

**Expected result:** A fresh chart GET returns 200 and the exact four top-level fields.

**Verify before continuing:** Use Invoke-RestMethod against localhost:3200 and inspect the object. Try a nonexistent client and confirm 404. Stop the database path deliberately only in a disposable copy if you want to observe 503.

### (3) Implement PATCH with validation and atomic versioning

Complete the write route so a stale editor cannot overwrite a newer prescription, and a changed order cannot inherit an old signature.

**Source:** `source/frontend/app/api/prescriber-chart/route.ts`, lines 30–81. Verbatim chunk; assemble with the other chunks in the accompanying complete file.

```typescript
export async function PATCH(request: Request) {
  const user = access(request);
  if (!user.canWrite) return json({ error: 'Only an authorised GP can edit the prescriber section.' }, 403);
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return json({ error: 'Invalid request origin.' }, 403);
  const ctx = context(new URL(request.url));
  if (!ctx) return json({ error: 'Client not found.' }, 404);
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 500_000) return json({ error: 'Signature is too large.' }, 413);
    body = JSON.parse(raw);
    if (!body || Object.keys(body).some((key) => !['medicationId', 'version', 'prescription'].includes(key))) throw new Error('Only prescriber fields can be edited.');
    if (typeof body.medicationId !== 'string' || !Number.isInteger(body.version) || body.version < 0) throw new Error('Invalid chart row.');
    validatePrescription(body.prescription);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Invalid prescription.' }, 400);
  }
  const medication = ctx.client.medications.find((item) => item.id === body.medicationId);
  const newSlot = /^(regular|prn)-slot-[1-8]$/.test(body.medicationId);
  if (!medication && !newSlot) return json({ error: 'Medicine row not found.' }, 404);
  if (newSlot) {
    const type = body.medicationId.startsWith('prn-') ? 'prn' : 'routine';
    const occupied = ctx.client.medications.filter((item) => item.type === type).length;
    if (Number(body.medicationId.slice(-1)) <= occupied) return json({ error: 'This chart row already belongs to an existing medicine.' }, 400);
  }
  try {
    const db = chartDatabase();
    const previous = await db.prepare('SELECT version, prescription FROM prescription_revisions WHERE home_id = ? AND client_id = ? AND medication_id = ? ORDER BY version DESC LIMIT 1')
      .bind(ctx.home.id, ctx.client.id, body.medicationId).first<{ version: number; prescription: string }>();
    if ((previous?.version ?? 0) !== body.version) return json({ error: 'This row changed in another session. Reload the chart before editing again.' }, 409);
    const before: Prescription = { ...initialPrescription(medication), ...(previous ? JSON.parse(previous.prescription) : {}) };
    const next = body.prescription as Prescription;
    const changed = prescriptionChanged(before, next);
    const now = new Date().toISOString();
    for (const field of ['prescriber_signature'] as const) {
      if (next[field]) {
        const sameDrawing = JSON.stringify(next[field]?.strokes) === JSON.stringify(before[field]?.strokes);
        // An old drawing may never be carried onto changed prescription details.
        if (changed && sameDrawing) return json({ error: 'Prescription details changed. Please sign again.' }, 400);
        next[field] = !changed && sameDrawing ? before[field] : { strokes: next[field]!.strokes, signedAt: now, signedBy: user.actor };
      }
    }
    const result = await db.prepare(`INSERT INTO prescription_revisions (home_id, client_id, medication_id, version, prescription, actor, saved_at)
      SELECT ?, ?, ?, ?, ?, ?, ? WHERE COALESCE((SELECT MAX(version) FROM prescription_revisions WHERE home_id = ? AND client_id = ? AND medication_id = ?), 0) = ?`)
      .bind(ctx.home.id, ctx.client.id, body.medicationId, body.version + 1, JSON.stringify(next), user.actor, now, ctx.home.id, ctx.client.id, body.medicationId, body.version).run();
    if (!result.meta.changes) return json({ error: 'This row changed in another session. Reload the chart before editing again.' }, 409);
    return json({ medicationId: body.medicationId, version: body.version + 1, prescription: next });
  } catch {
    return json({ error: 'Your changes were not saved. Please retry.' }, 503);
  }
}
```

**What the code does:** Append this complete PATCH implementation. It checks GP write capability, same origin, context, body size, allowed fields, prescription structure and medication slot identity. It compares the submitted version with the latest version and also guards the INSERT using the expected version. Signature attribution is server-assigned. The source rejects carrying an unchanged drawing onto a changed prescription.

**Integration contract:** PATCH body is {medicationId, version, prescription}. Success 200 returns one ChartRecord with incremented version. Invalid input 400; origin/access 403; unknown context 404; stale revision 409; oversize body 413; storage failure 503. Errors use {error}.

**Why this design:** The SQL guard closes the race between reading the current version and inserting. A preliminary JavaScript version check alone cannot prevent two concurrent writers succeeding.

**What breaks if miswired:** Blind retries after 409 lose the meaning of an expected version. Retrying an uncertain successful PATCH may return 409 because the first request committed. Reload and compare before editing again. This endpoint is not idempotent by request ID.

**General pattern:** Optimistic concurrency control; compare-and-swap; server-stamped attribution.

**Expected result:** A valid edit appends version 1. Another request with expected version 0 conflicts. No prior row is overwritten.

**Verify before continuing:** Use Test-GpWorkflow.mjs in Week 8. Inspect versions in D1. Read Integration-Reference.md steps (2)–(6) for the expanded validator and write-contract walkthrough before moving to UI autosave.

## Appendix

Active endpoints: GET/PATCH /api/prescriber-chart and shared POST /api/chart-administrations. GP can read administrations but cannot sign them. Local config uses DB and the placeholder database ID only with --local. Do not run --remote as part of this lab. Production identity/session/MFA is an explicit deployment dependency, not a completed course login feature.

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
