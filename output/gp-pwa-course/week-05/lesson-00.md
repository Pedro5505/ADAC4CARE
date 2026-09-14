# GP User Module — Implementation Lab

**Week 5 of 8 · Editable prescriptions, schedules, signatures and history**

**Objective:** Rebuild the source GP chart interaction with truthful save feedback, versioned writes and preserved administration history.

## Setup / Prerequisites

Complete Week 4. Estimated 6–8 hours; split into two sessions. Keep original GpMedicationTable and PrescriberSignature files as complete references.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/hooks/use-prescriber-chart.ts`, `frontend/components/gp-medication-table.tsx`, `frontend/components/prescriber-signature.tsx`, `frontend/lib/prescriber-chart.ts`.

## Laboratory Instructions

### (0) Connect HTTP results to React state

Implement the hook that owns acknowledged chart data and server capabilities. Components should receive an action, not duplicate the HTTP protocol.

**Source:** `source/frontend/hooks/use-prescriber-chart.ts`, lines 1–77. Complete file.

```typescript
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdministrationInput, AdministrationRecord, ChartRecord, ChartResponse, Prescription } from '@/lib/prescriber-chart';
import type { UserRole } from '@/data/demo/types';

export function usePrescriberChart(home: string, client: string, role: UserRole) {
  const [records, setRecords] = useState<Record<string, ChartRecord>>({});
  const [loaded, setLoaded] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [canSign, setCanSign] = useState(false);
  const [administrations, setAdministrations] = useState<AdministrationRecord[]>([]);
  const [error, setError] = useState('');
  const recordsRef = useRef(records);
  const saving = useRef(false);
  const endpoint = `/api/prescriber-chart?home=${encodeURIComponent(home)}&client=${encodeURIComponent(client)}`;
  const reload = useCallback(async () => {
    if (saving.current) return;
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const data = await response.json() as ChartResponse & { error?: string };
      if (!response.ok) throw new Error(data.error);
      // Do not overwrite a newer save with a read that started before it.
      if (saving.current) return;
      const result = data as ChartResponse;
      setRecords((previous) => {
        const next = { ...previous };
        for (const record of result.records) if ((next[record.medicationId]?.version ?? 0) <= record.version) next[record.medicationId] = record;
        recordsRef.current = next;
        return next;
      });
      setAllowed(result.canPrescribe);
      setCanSign(result.canAdminister);
      setAdministrations((previous) => {
        const merged = new Map(previous.map((record) => [`${record.medicationId}:${record.cellKey}`, record]));
        for (const record of result.administrations) merged.set(`${record.medicationId}:${record.cellKey}`, record);
        return [...merged.values()];
      });
      setLoaded(true);
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load saved prescriptions.'); }
  }, [endpoint]);
  useEffect(() => {
    void reload();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void reload(); }, 15000);
    window.addEventListener('focus', reload);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', reload); };
  }, [reload]);

  const save = async (medicationId: string, prescription: Prescription, expectedVersion: number) => {
    if (!loaded || !allowed || role !== 'gp') throw new Error('Only an authorised GP can edit this section.');
    if (saving.current) throw new Error('Please wait for the current save to finish.');
    saving.current = true;
    try {
      const response = await fetch(endpoint, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Chart-Role': role },
        body: JSON.stringify({ medicationId, prescription, version: expectedVersion }),
      });
      const result = await response.json() as ChartRecord & { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Changes were not saved.');
      const record = result as ChartRecord;
      recordsRef.current = { ...recordsRef.current, [medicationId]: record };
      setRecords(recordsRef.current);
      return record;
    } finally { saving.current = false; }
  };
  const signAdministration = async (input: AdministrationInput) => {
    if (!loaded || !canSign || role !== 'carer') throw new Error('Only an authorised carer can sign this cell.');
    const response = await fetch(endpoint.replace('/prescriber-chart?', '/chart-administrations?'), {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Chart-Role': role }, body: JSON.stringify(input),
    });
    const result = await response.json() as AdministrationRecord & { error?: string };
    if (!response.ok) throw new Error(result.error ?? 'Signature was not saved.');
    setAdministrations((previous) => [...previous.filter((r) => r.medicationId !== result.medicationId || r.cellKey !== result.cellKey), result]);
  };
  return { records, administrations, loaded, error, reload, save, signAdministration, canPrescribe: loaded && allowed && role === 'gp', canAdminister: loaded && canSign && role === 'carer' };
}
```

**What the code does:** Recreate this complete hook. reload uses no-store, merges versions monotonically and avoids applying reads during a save. The effect polls visible pages every 15 seconds and refreshes on focus. save serialises writes with a ref, submits the expected version and only updates the acknowledged map after response.ok. signAdministration exists because the chart is shared, but GP capability makes it unavailable.

**Integration contract:** The hook consumes the Week 4 response envelope and produces the component contract described in Week 3. Save resolves to the server’s ChartRecord or throws a human-readable error.

**Why this design:** A ref provides an immediate in-flight guard without waiting for React to rerender. Version checks keep an older polling response from replacing a newer acknowledged prescription.

**What breaks if miswired:** Not checking response.ok treats JSON errors as successful records. Clearing the saving flag outside finally can lock the editor after failure. Removing effect cleanup leaks timers when a patient changes.

**General pattern:** Server-state hook; serialised mutation; monotonic version merge; effect lifecycle.

**Expected result:** The chart loads once, refreshes on focus and shows saved changes after reload.

**Verify before continuing:** Observe a GET, one PATCH after an edit, then another GET after focus. Confirm no write is sent merely because a GET returned.

## Appendix

State labels must describe actual acknowledgement. Prescribing PATCH has no request-ID idempotency; Week 6’s communication endpoint introduces a separate retry pattern for comparison. Shared carer code is retained solely because the same chart renders administration history. The GP course does not teach performing a carer round.
