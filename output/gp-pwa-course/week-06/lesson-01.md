# GP User Module — Implementation Lab

**Week 6 of 8 · Clinical reports, care messages and persistent GP actions**

**Objective:** Keep the source report/message screens while replacing GP demo-success actions with an append-only database workflow.

## Setup / Prerequisites

Complete Week 5. Estimated 6–8 hours. These files are explicitly new course extensions, not features falsely attributed to the original repo.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/drizzle/0002_course_communications.sql`, `frontend/lib/clinical-records.ts`, `frontend/app/api/clinical-records/route.ts`, `frontend/hooks/use-clinical-home.ts`, `frontend/components/gp-communication-form.tsx`, `frontend/app/reports/page.tsx`, `frontend/app/messages/page.tsx`, `frontend/app/page.tsx`, `frontend/app/people/page.tsx`.

## Laboratory Instructions

### (1) Implement read, create, retry and error responses

Build the server route before wiring the compose dialogs. A success message should mean that the database confirmed a record.

**Source:** `extensions/week-06/frontend/app/api/clinical-records/route.ts`, lines 1–48. Complete file.

```typescript
import { groupHomes } from '@/data/demo';
import { chartAccess } from '@/lib/chart-access';
import { chartDatabase, gpEmails } from '@/lib/chart-db';
import { chartJson as json } from '@/lib/chart-server';
import { validCommunication, type Communication } from '@/lib/clinical-records';

export const dynamic = 'force-dynamic';
const access = (r: Request) => chartAccess(r.headers, gpEmails(), import.meta.env.DEV);
const homeFor = (r: Request) => groupHomes.find(h => h.id === new URL(r.url).searchParams.get('home'));

export async function GET(request: Request) {
  if (!access(request).authenticated) return json({ error: 'Sign in to read records.' }, 401);
  const home = homeFor(request);
  if (!home) return json({ error: 'Home not found.' }, 404);
  try {
    const { results } = await chartDatabase().prepare('SELECT id, client_id, kind, record_json FROM gp_communications WHERE home_id = ? ORDER BY created_at DESC, id DESC').bind(home.id).all<{ id: string; client_id: string; kind: 'report' | 'message'; record_json: string }>();
    const records: Communication[] = results.map(r => ({ id: r.id, clientId: r.client_id, kind: r.kind, record: JSON.parse(r.record_json) }));
    return json({ records, canCreate: access(request).canPrescribe });
  } catch { return json({ error: 'Records are unavailable. Check the course migration and retry.' }, 503); }
}

export async function POST(request: Request) {
  const user = access(request);
  if (!user.canWrite) return json({ error: 'GP permission is required.' }, 403);
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Origin mismatch.' }, 403);
  const home = homeFor(request);
  if (!home) return json({ error: 'Home not found.' }, 404);
  const raw = await request.text();
  if (raw.length > 12000) return json({ error: 'Record too large.' }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  if (!validCommunication(body)) return json({ error: 'Complete the title, details and required report action using supported values.' }, 400);
  if (!home.clients.some(c => c.id === body.clientId)) return json({ error: 'Client not found in this home.' }, 404);
  const input = body;
  const canonical = JSON.stringify([input.clientId, input.kind, input.category, input.title, input.body, input.action]);
  const date = new Date().toISOString();
  const common = { id: input.id, title: input.title.trim(), author: user.actor, date };
  const record = input.kind === 'report'
    ? { ...common, category: input.category, authorRole: 'GP', summary: input.body, action: input.action, acknowledged: false }
    : { ...common, type: input.category, role: 'GP', body: input.body + (input.action ? '\nAction: ' + input.action : ''), priority: input.category === 'incident' ? 'important' : 'routine', pinned: false };
  try {
    const db = chartDatabase();
    const result = await db.prepare('INSERT OR IGNORE INTO gp_communications (id, home_id, client_id, kind, request_json, record_json, actor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(input.id, home.id, input.clientId, input.kind, canonical, JSON.stringify(record), user.actor, date).run();
    const saved = await db.prepare('SELECT home_id, actor, request_json, record_json FROM gp_communications WHERE id = ?').bind(input.id).first<{ home_id: string; actor: string; request_json: string; record_json: string }>();
    if (!saved || saved.home_id !== home.id || saved.actor !== user.actor || saved.request_json !== canonical) return json({ error: 'This request ID was already used with different content. Start a new record.' }, 409);
    return json({ item: { id: input.id, clientId: input.clientId, kind: input.kind, record: JSON.parse(saved.record_json) } }, result.meta.changes ? 201 : 200);
  } catch { return json({ error: 'Save could not be confirmed. Retry the unchanged form.' }, 503); }
}
```

**What the code does:** Create the route exactly. GET lists records for a known home and returns canCreate. POST requires GP capability plus same origin, validates input and client membership, then uses INSERT OR IGNORE. It reloads the row and compares home, actor and canonical request content before returning it. Server time and actor populate the displayed record. Reusing an ID with different content yields a conflict.

**Integration contract:** GET 200: {records, canCreate}; POST 201 on create, 200 on identical retry: {item}. Invalid JSON/data 400; permission/origin 403; unknown home/client 404; reused ID with different content 409; oversized request 413; storage failure 503. All responses are no-store JSON with {error} for errors.

**Why this design:** Network failure can happen after a commit but before the response reaches the browser. Retrying the same ID/content recovers the saved result instead of inserting a duplicate. Concurrent duplicates are resolved by the primary key.

**What breaks if miswired:** Changing the content during an uncertain retry is a new command, not proof the previous one failed. This route inherits the original hosted identity/allowlist boundary and lacks organisation assignment enforcement. It must not be described as deployment-ready multi-tenant clinical storage.

**General pattern:** Idempotent create; append-only command handling; trusted actor stamping.

**Expected result:** The same POST twice creates one row. A changed title with the same ID returns 409.

**Verify before continuing:** Run Test-Course.mjs after starting the Week 6 or later checkpoint. Inspect the author in the returned JSON and confirm the browser never submitted it.

## Appendix

Apply extensions/week-06 files after Week 2; the Week 6 Overview file already includes Week 2 changes. New endpoint: GET/POST /api/clinical-records?home=… . New table: gp_communications(id, home_id, client_id, kind, request_json, record_json, actor, created_at). No delete/edit, pagination, subscriptions or organisation-scoped permission model is added. A dose-change report documents an instruction; it does not itself modify a prescription. Make the actual order change through Medication charts.
