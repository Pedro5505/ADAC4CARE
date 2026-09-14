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
