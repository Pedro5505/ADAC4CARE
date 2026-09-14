# GP User Module — Implementation Lab

**Week 4 of 8 · Database, HTTP contracts and GP permission checks**

**Objective:** Rebuild the active D1 chart read/write path and explain each boundary from request to stored revision.

## Setup / Prerequisites

Complete Weeks 1–3 and keep local D1 running. Estimated 6–8 hours. This week is intentionally separate from editing/signing UI.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/db/schema.ts`, `frontend/drizzle/0001_short_random.sql`, `frontend/lib/chart-db.ts`, `frontend/lib/chart-access.ts`, `frontend/lib/chart-server.ts`, `frontend/app/api/prescriber-chart/route.ts`.

## Laboratory Instructions

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
