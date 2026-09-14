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

### (2) Trace a drawn signature through the full round trip

Rebuild the signature canvas and understand what exactly is signed. The stored drawing belongs to one prescription revision.

**Source:** `source/frontend/components/prescriber-signature.tsx`, lines 1–116. Complete file.

```tsx
'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { validateAdministrationSignature, type Signature } from '@/lib/prescriber-chart';

export function SignatureImage({ signature, label = 'Saved handwritten prescriber signature' }: { signature: Signature; label?: string }) {
  if (signature.initials) return <span className="cell-typed-initials" style={{ fontSize: Math.min(14, 42 / (signature.initials.length * 0.8)) }} aria-label={`${label}: ${signature.initials}`}>{signature.initials}</span>;
  return <svg viewBox="0 0 600 220" preserveAspectRatio="xMidYMid meet" className="prescriber-ink" role="img" aria-label={label}>
    {signature.strokes.map((stroke, index) => <polyline key={index} points={stroke.map(([x, y]) => `${x * 600},${y * 220}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />)}
  </svg>;
}

export function PrescriberSignatureDialog({ open, onClose, medicine, onSave, autoSave = true, details }: {
  open: boolean; onClose: () => void; medicine: string; onSave: (strokes: number[][][], initials?: string) => Promise<void>; autoSave?: boolean; details?: React.ReactNode;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<number[][][]>([]);
  const pointer = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawingRevision = useRef(0);
  const savedRevision = useRef(0);
  const savingRef = useRef(false);
  const mounted = useRef(true);
  const [status, setStatus] = useState<'blank' | 'drawing' | 'saving' | 'saved' | 'error'>('blank');
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [entryMode, setEntryMode] = useState<'draw' | 'type'>('draw');
  const [initials, setInitials] = useState('');
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (timer.current) clearTimeout(timer.current); };
  }, []);

  const save = async () => {
    const typed = !autoSave && entryMode === 'type';
    if (pointer.current !== null || savingRef.current || (!typed && !strokes.current.length)) return;
    if (!autoSave && !confirmed) return;
    const revision = drawingRevision.current;
    savingRef.current = true;
    setStatus('saving');
    setError('');
    try {
      if (typed) {
        const signature = validateAdministrationSignature([], initials);
        await onSave(signature.strokes, signature.initials);
      } else await onSave(strokes.current.map((stroke) => stroke.map((point) => [...point])));
      savedRevision.current = revision;
      if (mounted.current) setStatus(drawingRevision.current === revision ? 'saved' : 'drawing');
      if (!autoSave) onClose();
    } catch (e) {
      if (mounted.current) { setStatus('error'); setError(e instanceof Error ? e.message : 'Signature was not saved.'); }
    } finally { savingRef.current = false; }
  };
  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))];
  };
  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    if (savingRef.current || pointer.current !== null || event.button !== 0) return;
    event.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    pointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    strokes.current.push([point(event)]);
    setStatus('drawing');
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current !== event.pointerId) return;
    const stroke = strokes.current[strokes.current.length - 1];
    const previous = stroke[stroke.length - 1];
    const next = point(event);
    if (Math.hypot(next[0] - previous[0], next[1] - previous[1]) < 0.001) return;
    stroke.push(next);
    const ctx = canvas.current?.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#183357'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(previous[0] * 1200, previous[1] * 440); ctx.lineTo(next[0] * 1200, next[1] * 440); ctx.stroke();
    }
  };
  const end = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    if (strokes.current.at(-1)!.length < 2) strokes.current.pop();
    if (strokes.current.length) {
      drawingRevision.current += 1;
      if (autoSave) timer.current = setTimeout(() => void save(), 1000);
    } else setStatus('blank');
  };
  const close = async () => {
    if (savingRef.current || pointer.current !== null) return;
    if (drawingRevision.current > savedRevision.current && strokes.current.length) { if (timer.current) clearTimeout(timer.current); await save(); }
    if (savedRevision.current === drawingRevision.current) onClose();
  };
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    strokes.current = []; canvas.current?.getContext('2d')?.clearRect(0, 0, 1200, 440);
    setInitials('');
    // Clearing the pad does not erase the last saved signature on the chart.
    drawingRevision.current = savedRevision.current;
    setStatus('blank'); setError('');
  };
  return <Dialog open={open} onOpenChange={(value) => { if (!value && !savingRef.current) { if (autoSave) void close(); else onClose(); } }}>
    <DialogContent className="signature-dialog" showCloseButton={false}>
      <DialogHeader><DialogTitle>{autoSave ? 'Prescriber signature' : 'Administration signature / initials'}</DialogTitle><DialogDescription>{medicine}. {autoSave ? 'Sign below with your mouse, finger or pen. Your signature saves automatically when you pause.' : 'Draw your signature or type your initials. They will be saved only in the selected cell.'}</DialogDescription></DialogHeader>
      {details}
      {!autoSave ? <div className="initials-entry-options" aria-label="Initials entry method">{(['draw', 'type'] as const).map((mode) => <Button key={mode} variant={entryMode === mode ? 'default' : 'outline'} aria-pressed={entryMode === mode} disabled={status === 'saving'} onClick={() => { setEntryMode(mode); setError(''); setStatus((mode === 'type' ? initials.trim().length > 0 : strokes.current.length > 0) ? 'drawing' : 'blank'); }}>{mode === 'draw' ? 'Draw signature / initials' : 'Type initials'}</Button>)}</div> : null}
      <canvas hidden={!autoSave && entryMode === 'type'} aria-label={autoSave ? 'Draw your prescriber signature here' : 'Draw your administration signature or initials here'} ref={canvas} width={1200} height={440} className="signature-pad" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} />
      {!autoSave && entryMode === 'type' ? <label className="typed-initials-field">Your initials<input aria-label="Your initials" autoComplete="off" maxLength={6} placeholder="e.g. MR" value={initials} disabled={status === 'saving'} onChange={(event) => { setInitials(event.target.value); setStatus(event.target.value.trim() ? 'drawing' : 'blank'); setError(''); }} /><small>Use 1–6 letters.</small></label> : null}
      {!autoSave ? <label className="administration-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I administered this medicine and completed the required medication safety checks.</label> : null}
      <p role="status" className={status === 'error' ? 'chart-error-text' : 'signature-save-status'}>{status === 'saving' ? 'Saving signature…' : status === 'saved' ? 'Signature saved to the chart.' : status === 'error' ? error : status === 'drawing' ? 'Signature not saved yet…' : 'The signature box is blank.'}</p>
      <div className="dialog-actions"><Button variant="outline" disabled={status === 'saving'} onClick={clear}>Clear box</Button>{autoSave ? <>{status === 'error' ? <Button onClick={() => void save()}>Retry save</Button> : null}<Button disabled={status === 'saving'} onClick={() => void close()}>Done</Button></> : <><Button variant="ghost" disabled={status === 'saving'} onClick={onClose}>Cancel</Button><Button disabled={status === 'saving' || !confirmed || status === 'blank'} onClick={() => void save()}>{status === 'error' ? 'Retry save' : 'Save initials / signature'}</Button></>}</div>
    </DialogContent>
  </Dialog>;
}
```

**What the code does:** Recreate the complete component, then follow the onSave callback in GpMedicationTable. The canvas stores normalised points so the drawing can render at different sizes. The source debounces saves after drawing and waits on Done. Clear affects the pad; it is not an API to delete an existing persisted signature. The route stamps signedBy/signedAt and rejects invalid or unchanged carried-over drawings on amended orders.

**Integration contract:** Signature contains strokes plus server attribution. Validation requires finite in-range points and actual movement; a clicked dot or typed display name is not the GP drawn-signature workflow.

**Why this design:** Normalised geometry decouples data from canvas pixels. Tying signature invalidation to prescription changes avoids representing an old drawing as approval of a new dose.

**What breaks if miswired:** Saving while a drawing is still changing can acknowledge an older drawing revision; the source tracks drawing versions to prevent that. Clearing an already saved pad must not falsely tell the user the server record was deleted.

**General pattern:** Debounced input persistence; revision-bound signature; server attribution.

**Expected result:** A drawn signature saves, survives reload and disappears from the amended draft when a prescribed field changes.

**Verify before continuing:** Draw, finish, reload; amend dose; observe unsigned state; save; draw a fresh signature. Read stored revision JSON to confirm the old signed revision remains intact.

### (3) Reconstruct PRN sections and immutable history

Finish the regular/PRN tables, six scheduling slots and history rendering. Distinguish validation from clinical decision support.

**Source:** `source/frontend/lib/prescriber-chart.ts`, lines 36–100. Verbatim chunk; assemble with the other chunks in the accompanying complete file.

```typescript
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function validatePrescription(value: unknown): asserts value is Prescription {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid prescription.');
  const p = value as Prescription;
  if (Object.keys(p).some((key) => ![...prescriptionFields, 'prescriber_signature', 'refer_prn', 'times'].includes(key))) throw new Error('Only prescriber fields can be edited.');
  for (const field of prescriptionFields) {
    if (typeof p[field] !== 'string' || p[field].length > (field === 'instructions' ? 2000 : 200)) throw new Error('Invalid prescriber field or text length.');
  }
  if (typeof p.refer_prn !== 'boolean') throw new Error('Refer PRN must be ticked or unticked.');
  if (!Array.isArray(p.times) || p.times.length !== 6 || p.times.some((time) => typeof time !== 'string' || (time !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)))) throw new Error('Enter up to six valid administration times.');
  const times = p.times.filter(Boolean);
  if (new Set(times).size !== times.length) throw new Error('Administration times must be unique.');
  if (!p.name.trim()) throw new Error('Enter a regular medicine name.');
  if (p.start_date && !validDate(p.start_date)) throw new Error('Enter a valid start date.');
  if (p.end_date && !validDate(p.end_date)) throw new Error('Enter a valid stop date.');
  if (p.end_date && (!p.start_date || p.end_date < p.start_date)) throw new Error('Stop date must be on or after the start date.');
  for (const field of ['prescriber_signature'] as const) {
    const signature = p[field];
    if (signature === null) continue;
    validateStrokes(signature?.strokes);
    if (!p.dose.trim() || !p.route.trim() || !p.frequency.trim() || !p.start_date) throw new Error('Complete medicine, dose, route, frequency and start date before signing.');
  }
}

// A signature authorises the values that were visible when it was drawn.
export function amendPrescription<K extends PrescriptionField | 'refer_prn' | 'times'>(p: Prescription, field: K, value: Prescription[K]): Prescription {
  if (p[field] === value) return p;
  return { ...p, [field]: value, prescriber_signature: null };
}

export function mergeMedication(medication: Medication, p?: Prescription): Medication {
  if (!p) return medication;
  return { ...medication, name: p.name, dose: p.dose, route: p.route, schedule: p.frequency, prescribedDate: p.start_date, times: p.times.filter(Boolean), instructions: p.instructions, maxDailyDose: p.max_dose };
}

export function validateStrokes(strokes: unknown): asserts strokes is number[][][] {
  if (!Array.isArray(strokes) || strokes.length < 1 || strokes.length > 100) throw new Error('Draw a signature in the box.');
  let points = 0;
  for (const stroke of strokes) {
    if (!Array.isArray(stroke) || stroke.length < 2) throw new Error('Draw a signature in the box.');
    points += stroke.length;
    for (const point of stroke) {
      if (!Array.isArray(point) || point.length !== 2 || !point.every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1)) throw new Error('Invalid signature drawing.');
    }
    if (!stroke.some((point) => point[0] !== stroke[0][0] || point[1] !== stroke[0][1])) throw new Error('Draw a signature in the box.');
  }
  if (points > 12000) throw new Error('Signature is too large. Clear the box and try again.');
}

export function prescriptionChanged(before: Prescription, next: Prescription) {
  return prescriptionFields.some((field) => next[field] !== before[field]) || next.refer_prn !== before.refer_prn || JSON.stringify(next.times) !== JSON.stringify(before.times);
}

export function administrationOrderReady(p: Prescription) {
  return Boolean(p.name.trim() && p.dose.trim() && p.route.trim() && p.frequency.trim() && validDate(p.start_date));
}

export function validateAdministrationSignature(strokes: unknown, initials?: unknown) {
  if (initials !== undefined) {
    if (typeof initials !== 'string' || !/^[\p{L}]{1,6}$/u.test(initials.trim())) throw new Error('Enter 1–6 letters for your initials.');
    if (!Array.isArray(strokes) || strokes.length !== 0) throw new Error('Choose either drawn or typed initials.');
    return { strokes: [] as number[][][], initials: initials.trim().toLocaleUpperCase('en-AU') };
  }
```

**What the code does:** Read the remaining source functions and the second half of GpMedicationTable. Dates must be real YYYY-MM-DD dates; times are unique 24-hour values; end date cannot precede start. PRN uses refer_prn and max_dose text. The chart retains administrations associated with prior schedule cells rather than reassigning them to new times. Blank regular/prn slots use the exact server-supported IDs.

**Integration contract:** The server accepts fixture medicine IDs or permitted regular-slot-N/prn-slot-N identifiers, with slot range and occupancy checks. Administration records point at orderVersion and cellKey.

**Why this design:** Historical events need stable identity even when an order’s schedule changes. Schedules are structured enough for display/validation but do not implement medical dose calculation.

**What breaks if miswired:** This repo has no drug interaction engine, dosage recommendation service or automatic clinical alert logic. max_dose is text; do not describe it as an enforced dose calculator. End dates are not a delete operation.

**General pattern:** Stable event identity; domain validation versus decision support.

**Expected result:** Regular and PRN charts retain source layout; GP edits prescribing fields while history remains read-only.

**Verify before continuing:** Complete Test-GpWorkflow, test duplicate/invalid times and date ordering, and review an old administration after a schedule edit. Use Integration-Reference.md steps (8)–(11) for further line-by-line reasoning.

## Appendix

State labels must describe actual acknowledgement. Prescribing PATCH has no request-ID idempotency; Week 6’s communication endpoint introduces a separate retry pattern for comparison. Shared carer code is retained solely because the same chart renders administration history. The GP course does not teach performing a carer round.

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
