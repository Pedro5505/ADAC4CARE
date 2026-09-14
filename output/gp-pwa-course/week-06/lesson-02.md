# GP User Module — Implementation Lab

**Week 6 of 8 · Clinical reports, care messages and persistent GP actions**

**Objective:** Keep the source report/message screens while replacing GP demo-success actions with an append-only database workflow.

## Setup / Prerequisites

Complete Week 5. Estimated 6–8 hours. These files are explicitly new course extensions, not features falsely attributed to the original repo.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/drizzle/0002_course_communications.sql`, `frontend/lib/clinical-records.ts`, `frontend/app/api/clinical-records/route.ts`, `frontend/hooks/use-clinical-home.ts`, `frontend/components/gp-communication-form.tsx`, `frontend/app/reports/page.tsx`, `frontend/app/messages/page.tsx`, `frontend/app/page.tsx`, `frontend/app/people/page.tsx`.

## Laboratory Instructions

### (2) Merge saved records into the source lists

Build a reusable read hook that overlays persisted GP records on the fictional fixture reports/messages. Preserve the source list and filter components.

**Source:** `extensions/week-06/frontend/hooks/use-clinical-home.ts`, lines 1–47. Complete file.

```typescript
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getHome } from '@/data/demo';
import type { CareMessage, ClinicalReport } from '@/data/demo/types';
import type { Communication, NewCommunication } from '@/lib/clinical-records';

export function useClinicalHome(homeId: string) {
  const [snapshot, setSnapshot] = useState<{ homeId: string; records: Communication[] }>({ homeId, records: [] });
  const [error, setError] = useState('');
  const [canCreate, setCanCreate] = useState(false);
  const sequence = useRef(0);
  const endpoint = '/api/clinical-records?home=' + encodeURIComponent(homeId);
  const reload = useCallback(async () => {
    const ticket = ++sequence.current;
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const result = await response.json() as { records: Communication[]; canCreate: boolean; error?: string };
      if (!response.ok) throw new Error(result.error || 'Records could not be loaded.');
      if (ticket !== sequence.current) return;
      setSnapshot({ homeId, records: result.records }); setCanCreate(result.canCreate); setError('');
    } catch (reason) {
      if (ticket === sequence.current) { setError(reason instanceof Error ? reason.message : 'Request failed.'); setCanCreate(false); }
    }
  }, [endpoint, homeId]);
  useEffect(() => {
    setCanCreate(false); void reload();
    const refresh = () => { if (!document.hidden) void reload(); };
    window.addEventListener('focus', refresh); window.addEventListener('gp-records-changed', refresh);
    const timer = window.setInterval(refresh, 15000);
    return () => { ++sequence.current; window.clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('gp-records-changed', refresh); };
  }, [reload]);
  const save = async (input: NewCommunication) => {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-chart-role': 'gp' }, body: JSON.stringify(input) });
    const result = await response.json() as { item: Communication; error?: string };
    if (!response.ok) throw new Error(result.error || 'Save failed.');
    ++sequence.current;
    setSnapshot(current => ({ homeId, records: [result.item, ...(current.homeId === homeId ? current.records : []).filter(r => r.id !== input.id)] }));
    window.dispatchEvent(new Event('gp-records-changed'));
  };
  const records = snapshot.homeId === homeId ? snapshot.records : [];
  const base = getHome(homeId);
  const home = { ...base, clients: base.clients.map(client => ({ ...client,
    reports: [...client.reports, ...records.filter(r => r.clientId === client.id && r.kind === 'report').map(r => r.record as ClinicalReport)],
    messages: [...client.messages, ...records.filter(r => r.clientId === client.id && r.kind === 'message').map(r => r.record as CareMessage)],
  })) };
  return { home, error, canCreate, save, reload };
}
```

**What the code does:** Create this hook, then use the complete Week 6 Reports, Messages, People and Overview files. The hook partitions snapshot state by homeId and ignores responses from older request sequences. It adds saved records to each matching client, polls visible pages and refreshes on focus or a same-window change event. A save inserts the returned item into local state and asks other hook instances to reload.

**Integration contract:** The hook returns {home, error, canCreate, save, reload}. home has the original GroupHome shape; the view can keep its existing flatMap/filter/sort logic. Draft values are not persisted in browser storage.

**Why this design:** Adapting data at the hook boundary preserves the existing design while making its data source explicit. A request sequence prevents a slow response from the previous home replacing the current home’s snapshot.

**What breaks if miswired:** The original profile server page and medication summary counts are still fixture-based; they are not secretly subscribed to this hook. Read the current communication list through Reports/Messages. Offline or failed reads show an error rather than claiming all data is current.

**General pattern:** Read-model adapter; stale-response suppression; event-triggered revalidation.

**Expected result:** A new GP instruction appears in Reports and updates Overview’s latest instruction and People’s note count after refresh.

**Verify before continuing:** Create a report, navigate to Overview and People, reload, then switch home. The record must remain only in its home/client. Return and confirm it persists.

## Appendix

Apply extensions/week-06 files after Week 2; the Week 6 Overview file already includes Week 2 changes. New endpoint: GET/POST /api/clinical-records?home=… . New table: gp_communications(id, home_id, client_id, kind, request_json, record_json, actor, created_at). No delete/edit, pagination, subscriptions or organisation-scoped permission model is added. A dose-change report documents an instruction; it does not itself modify a prescription. Make the actual order change through Medication charts.
