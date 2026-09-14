# GP User Module — Implementation Lab

**Week 4 of 8 · Database, HTTP contracts and GP permission checks**

**Objective:** Rebuild the active D1 chart read/write path and explain each boundary from request to stored revision.

## Setup / Prerequisites

Complete Weeks 1–3 and keep local D1 running. Estimated 6–8 hours. This week is intentionally separate from editing/signing UI.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/db/schema.ts`, `frontend/drizzle/0001_short_random.sql`, `frontend/lib/chart-db.ts`, `frontend/lib/chart-access.ts`, `frontend/lib/chart-server.ts`, `frontend/app/api/prescriber-chart/route.ts`.

## Laboratory Instructions

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

## Appendix

Active endpoints: GET/PATCH /api/prescriber-chart and shared POST /api/chart-administrations. GP can read administrations but cannot sign them. Local config uses DB and the placeholder database ID only with --local. Do not run --remote as part of this lab. Production identity/session/MFA is an explicit deployment dependency, not a completed course login feature.
