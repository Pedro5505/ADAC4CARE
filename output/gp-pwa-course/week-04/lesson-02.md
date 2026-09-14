# GP User Module — Implementation Lab

**Week 4 of 8 · Database, HTTP contracts and GP permission checks**

**Objective:** Rebuild the active D1 chart read/write path and explain each boundary from request to stored revision.

## Setup / Prerequisites

Complete Weeks 1–3 and keep local D1 running. Estimated 6–8 hours. This week is intentionally separate from editing/signing UI.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/db/schema.ts`, `frontend/drizzle/0001_short_random.sql`, `frontend/lib/chart-db.ts`, `frontend/lib/chart-access.ts`, `frontend/lib/chart-server.ts`, `frontend/app/api/prescriber-chart/route.ts`.

## Laboratory Instructions

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

## Appendix

Active endpoints: GET/PATCH /api/prescriber-chart and shared POST /api/chart-administrations. GP can read administrations but cannot sign them. Local config uses DB and the placeholder database ID only with --local. Do not run --remote as part of this lab. Production identity/session/MFA is an explicit deployment dependency, not a completed course login feature.
