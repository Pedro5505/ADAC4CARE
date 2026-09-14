# GP User Module — Implementation Lab

**Week 5 of 8 · Editable prescriptions, schedules, signatures and history**

**Objective:** Rebuild the source GP chart interaction with truthful save feedback, versioned writes and preserved administration history.

## Setup / Prerequisites

Complete Week 4. Estimated 6–8 hours; split into two sessions. Keep original GpMedicationTable and PrescriberSignature files as complete references.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/hooks/use-prescriber-chart.ts`, `frontend/components/gp-medication-table.tsx`, `frontend/components/prescriber-signature.tsx`, `frontend/lib/prescriber-chart.ts`.

## Laboratory Instructions

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

## Appendix

State labels must describe actual acknowledgement. Prescribing PATCH has no request-ID idempotency; Week 6’s communication endpoint introduces a separate retry pattern for comparison. Shared carer code is retained solely because the same chart renders administration history. The GP course does not teach performing a carer round.
