# GP User Module — Implementation Lab

**Week 6 of 8 · Clinical reports, care messages and persistent GP actions**

**Objective:** Keep the source report/message screens while replacing GP demo-success actions with an append-only database workflow.

## Setup / Prerequisites

Complete Week 5. Estimated 6–8 hours. These files are explicitly new course extensions, not features falsely attributed to the original repo.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/drizzle/0002_course_communications.sql`, `frontend/lib/clinical-records.ts`, `frontend/app/api/clinical-records/route.ts`, `frontend/hooks/use-clinical-home.ts`, `frontend/components/gp-communication-form.tsx`, `frontend/app/reports/page.tsx`, `frontend/app/messages/page.tsx`, `frontend/app/page.tsx`, `frontend/app/people/page.tsx`.

## Laboratory Instructions

### (3) Connect the source dialogs to real GP saves

Retain the existing cards, filter bars, timeline and modal styling while replacing the GP form command. Care replies become persisted follow-up notes rather than a fake opened-thread notice.

**Source:** `extensions/week-06/frontend/components/gp-communication-form.tsx`, lines 1–39. Complete file.

```tsx
'use client';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { GroupHome } from '@/data/demo/types';
import type { NewCommunication } from '@/lib/clinical-records';

export function GpCommunicationForm({ home, kind, reply, save, onSaved, onCancel }: {
  home: GroupHome; kind: 'report' | 'message'; reply?: { clientId: string; title: string };
  save: (input: NewCommunication) => Promise<void>; onSaved: () => void; onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  const saving = useRef(false);
  return <form onSubmit={async event => {
    event.preventDefault(); if (saving.current) return;
    const data = new FormData(event.currentTarget);
    const values = { clientId: String(data.get('client')), kind, category: String(data.get('category')), title: String(data.get('title')), body: String(data.get('body')), action: String(data.get('action')) };
    const fingerprint = JSON.stringify(values);
    if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: crypto.randomUUID() };
    saving.current = true; setBusy(true); setError('');
    try { await save({ ...values, id: request.current.id }); onSaved(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Save failed.'); }
    finally { saving.current = false; setBusy(false); }
  }}>
    <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
      <div className="prescription-form-grid">
        <label htmlFor="gp-client"><span>Client</span><select id="gp-client" name="client" defaultValue={reply?.clientId ?? home.clients[0].id}>{home.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label htmlFor="gp-category"><span>{kind === 'report' ? 'Report type' : 'Message type'}</span><select id="gp-category" name="category">{kind === 'report' ? <><option>GP instruction</option><option>Dose change</option></> : <><option value="handover">Handover note</option><option value="incident">Medication incident</option></>}</select></label>
        <label className="form-span" htmlFor="gp-title"><span>Title</span><Input id="gp-title" name="title" maxLength={200} required defaultValue={reply ? ('Re: ' + reply.title).slice(0, 200) : ''} /></label>
        <label className="form-span" htmlFor="gp-body"><span>{kind === 'report' ? 'Clinical summary' : 'Details'}</span><textarea id="gp-body" name="body" maxLength={4000} required /></label>
        <label className="form-span" htmlFor="gp-action"><span>Required action</span><textarea id="gp-action" name="action" maxLength={2000} required={kind === 'report'} /></label>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      <div className="dialog-actions"><Button type="button" onClick={onCancel} variant="ghost">Cancel</Button><Button type="submit">{busy ? 'Saving…' : kind === 'report' ? 'Add GP instruction' : 'Add to care record'}</Button></div>
    </fieldset>
  </form>;
}
```

**What the code does:** Create the form component, then replace Reports and Messages with their complete Week 6 files. FormData reads stable client IDs, not display names. Busy disables fields and a ref blocks immediate double submit. An unchanged failed submission reuses its UUID; edited content gets a new one. onSaved closes the dialog only after save resolves. Reports use Add GP instruction instead of implying a drawn signature. Reply pre-fills client/title and creates a follow-up note; it is not a nested thread model.

**Integration contract:** save accepts NewCommunication and resolves after a server acknowledgement. Errors stay in the dialog with the input preserved. GP create controls require the returned canCreate capability; the server checks again.

**Why this design:** Separating a reusable form from its transport hook makes UI intent, request handling and server policy independently understandable.

**What breaks if miswired:** A toast displayed before await save would reproduce the original demo-only behaviour. Closing the form on error would discard retry context. Other roles retain their original demo commands because this course extends GP only. No email, push delivery, unread tracking, pin persistence or external notification is implemented.

**General pattern:** Controlled command lifecycle; pessimistic confirmation; reusable form/presentation boundary.

**Expected result:** GP can add reports, handover notes, incidents and follow-up replies that survive reload. Filters and source cards remain intact.

**Verify before continuing:** Submit a valid report, an incident and a Reply. Reload each list. Simulate a failed request, confirm the dialog stays open and retry unchanged. Do not interpret a follow-up title as a fully modelled discussion thread.

## Appendix

Apply extensions/week-06 files after Week 2; the Week 6 Overview file already includes Week 2 changes. New endpoint: GET/POST /api/clinical-records?home=… . New table: gp_communications(id, home_id, client_id, kind, request_json, record_json, actor, created_at). No delete/edit, pagination, subscriptions or organisation-scoped permission model is added. A dose-change report documents an instruction; it does not itself modify a prescription. Make the actual order change through Medication charts.
