# GP User Module — Implementation Lab

**Week 5 of 8 · Editable prescriptions, schedules, signatures and history**

**Objective:** Rebuild the source GP chart interaction with truthful save feedback, versioned writes and preserved administration history.

## Setup / Prerequisites

Complete Week 4. Estimated 6–8 hours; split into two sessions. Keep original GpMedicationTable and PrescriberSignature files as complete references.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/hooks/use-prescriber-chart.ts`, `frontend/components/gp-medication-table.tsx`, `frontend/components/prescriber-signature.tsx`, `frontend/lib/prescriber-chart.ts`.

## Laboratory Instructions

### (1) Rebuild editable rows and autosave feedback

Give each medication row a draft that can be edited without pretending it is saved. Use the source blur/save behaviour rather than inventing a different form layout.

**Source:** `source/frontend/components/gp-medication-table.tsx`, lines 1–85. Verbatim chunk; assemble with the other chunks in the accompanying complete file.

```tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Client, Medication } from '@/data/demo/types';
import { Button } from '@/components/ui/button';
import { PrescriberSignatureDialog, SignatureImage } from '@/components/prescriber-signature';
import { AdministrationSignatureCell } from '@/components/administration-signature-cell';
import { administrationOrderReady, amendPrescription, initialPrescription, validatePrescription, type AdministrationInput, type AdministrationRecord, type ChartRecord, type Prescription, type PrescriptionField } from '@/lib/prescriber-chart';

type Save = (id: string, prescription: Prescription, version: number) => Promise<ChartRecord>;

function MedicineRows({ medication, id, record, editable, save, month, days, kind, canAdminister, administrations: storedAdministrations, onSign, clientName }: {
  medication?: Medication; id: string; record?: ChartRecord; editable: boolean; save: Save; month: string; days: number[];
  kind: 'routine' | 'prn'; canAdminister: boolean; administrations: AdministrationRecord[]; onSign: (input: AdministrationInput) => Promise<void>; clientName: string;
}) {
  const initial = record?.prescription ?? { ...initialPrescription(medication), refer_prn: kind === 'prn' };
  const [draft, setDraft] = useState(initial);
  const draftRef = useRef(initial);
  const version = useRef(record?.version ?? 0);
  const dirty = useRef(false);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [signing, setSigning] = useState(false);
  useEffect(() => {
    if (!dirty.current && !savingRef.current && record && record.version > version.current) {
      version.current = record.version; draftRef.current = record.prescription;
      setDraft(record.prescription);
    }
  }, [record]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty.current || savingRef.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const persist = async (prescription: Prescription) => {
    if (!editable || savingRef.current) throw new Error('Please wait for the current save to finish.');
    validatePrescription(prescription);
    savingRef.current = true; setSaving(true); setError('');
    try {
      const saved = await save(id, prescription, version.current);
      version.current = saved.version; draftRef.current = saved.prescription;
      dirty.current = false; setDraft(saved.prescription); setNotice('Saved');
    } finally { savingRef.current = false; setSaving(false); }
  };
  const saveFields = async () => {
    if (!dirty.current || savingRef.current) return;
    try { await persist(draftRef.current); }
    catch (e) { setError(e instanceof Error ? e.message : 'Changes were not saved.'); }
  };
  const change = <K extends PrescriptionField | 'refer_prn' | 'times'>(field: K, value: Prescription[K]) => {
    if (!editable) return;
    draftRef.current = amendPrescription(draftRef.current, field, value);
    dirty.current = true; setDraft(draftRef.current); setNotice('Unsaved changes'); setError('');
  };
  const input = (field: PrescriptionField, label: string, type = 'text'): ReactNode => <label className={`chart-cell-field chart-field-${field}`}>
    <span>{label}</span>
    <input aria-label={`${label} — ${id}`} type={type} value={draft[field]} maxLength={200} readOnly={!editable} disabled={saving}
      onChange={(event) => change(field, event.target.value)} onBlur={() => void saveFields()}
      min={field === 'end_date' ? draft.start_date || undefined : undefined} />
  </label>;

  const seed = medication?.administrations.filter((row) => row.date.startsWith(month)) ?? [];
  const events = storedAdministrations.filter((event) => event.medicationId === id);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const maySignDate = (date: string) => canAdminister && administrationOrderReady(draft) && medication?.status !== 'ceased' && date <= today && date >= draft.start_date && (!draft.end_date || date <= draft.end_date);
  const signatureCell = (key: string, description: string, enabled: boolean, existing?: AdministrationRecord, initial?: string) => <AdministrationSignatureCell key={key} medicationId={id} cellKey={key} version={version.current} prescription={draft} record={existing} initial={initial} canSign={enabled} description={`${clientName}, ${draft.name || 'empty medicine'}, ${description}`} onSign={onSign} />;
  const cells = (line: number) => kind === 'routine' ? <>
    <td className="chart-time-cell"><input type="time" aria-label={`Administration time ${line + 1} — ${id}`} value={draft.times[line]} readOnly={!editable} disabled={saving} onChange={(event) => { const times = [...draft.times]; times[line] = event.target.value; change('times', times); }} onBlur={() => void saveFields()} /></td>
    {days.map((day) => {
      const date = `${month}-${String(day).padStart(2, '0')}`;
      const key = `routine:${date}:${draft.times[line]}`;
      const previous = seed.find((row) => row.date === date && row.time === draft.times[line]);
      return signatureCell(key + (draft.times[line] ? '' : `:blank-${line}`), `${date} at ${draft.times[line] || 'no prescribed time'}`, Boolean(draft.times[line]) && maySignDate(date), events.find((event) => event.cellKey === key), previous?.initial);
    })}
  </> : <>
    {line === 0 ? <td rowSpan={3} className="prn-instruction-cell">{input('max_dose', 'MAX dose/24 hours')}</td> : null}
    {line === 3 ? <td rowSpan={3} className="prn-instruction-cell"><label className="chart-cell-field"><span>Instruction</span><textarea aria-label={`Instruction — ${id}`} readOnly={!editable} disabled={saving} value={draft.instructions} maxLength={2000} onChange={(event) => change('instructions', event.target.value)} onBlur={() => void saveFields()} /></label></td> : null}
    {Array.from({ length: 4 }, (_, group) => {
      const slot = group * 6 + line;
      const key = `prn:${month}:${slot}`;
      const event = events.find((item) => item.cellKey === key);
      const previous = seed[slot];
```

**What the code does:** Recreate the component using the complete file; study the opening MedicineRows logic first, then its JSX. Follow draft, versionRef, dirty, saving and error. change calls amendPrescription; persist validates before saving and replaces the draft with the acknowledged record. Dirty local edits are not overwritten by polling. The beforeunload handler warns about unsaved work when leaving the document; it is not a complete SPA navigation blocker.

**Integration contract:** onSave accepts medication ID, whole prescription and expected version. A save error stays on the row and must not switch the label to Saved.

**Why this design:** Draft state is a user intention; server state is a confirmed fact. Holding both is necessary when latency or validation separates them.

**What breaks if miswired:** A stale save may produce 409 even when the input looked valid locally. Navigating within the SPA can bypass beforeunload. A learner should complete or discard edits deliberately before switching clients.

**General pattern:** Draft/acknowledged state separation; pessimistic save acknowledgement.

**Expected result:** Typing changes the draft; blur validates/saves; Saved appears only after success. Invalid data shows an error.

**Verify before continuing:** Edit a fictional dose, blur, reload and compare. Then enter duplicate times and verify rejection. Preserve a screenshot of Saving/Saved/error states in your lab evidence.

## Appendix

State labels must describe actual acknowledgement. Prescribing PATCH has no request-ID idempotency; Week 6’s communication endpoint introduces a separate retry pattern for comparison. Shared carer code is retained solely because the same chart renders administration history. The GP course does not teach performing a carer round.
