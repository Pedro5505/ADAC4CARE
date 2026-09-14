'use client';

import { useState } from 'react';
import { PrescriberSignatureDialog, SignatureImage } from '@/components/prescriber-signature';
import type { AdministrationInput, AdministrationRecord, Prescription } from '@/lib/prescriber-chart';

export function AdministrationSignatureCell({ medicationId, cellKey, version, prescription, record, initial, canSign, description, onSign }: {
  medicationId: string; cellKey: string; version: number; prescription: Prescription; record?: AdministrationRecord;
  initial?: string; canSign: boolean; description: string; onSign: (input: AdministrationInput) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const locked = Boolean(record || initial);
  return <td className="chart-administration-cell">
    {locked ? <div className="cell-signature-content" title={record ? `Signed ${new Date(record.signature.signedAt).toLocaleString('en-AU')}` : 'Existing administration record'}>{record ? <SignatureImage signature={record.signature} label={`Administration signature, ${description}`} /> : initial}</div>
      : <button type="button" className="cell-sign-button" disabled={!canSign} aria-label={`${canSign ? 'Add initials to' : 'Unavailable administration cell:'} ${description}`} title={canSign ? 'Add initials or signature' : 'Signing requires carer access, a populated order and a prescribed time within the medication dates.'} onClick={() => setOpen(true)}>{canSign ? <span aria-hidden="true">+</span> : null}</button>}
    {open ? <PrescriberSignatureDialog open autoSave={false} medicine={`${prescription.name} · ${description}`} onClose={() => setOpen(false)} details={<dl className="administration-sign-context"><div><dt>Dose</dt><dd>{prescription.dose}</dd></div><div><dt>Route</dt><dd>{prescription.route}</dd></div><div><dt>Frequency</dt><dd>{prescription.frequency}</dd></div>{prescription.instructions ? <div><dt>Instructions</dt><dd>{prescription.instructions}</dd></div> : null}{prescription.max_dose ? <div><dt>Maximum / 24 hours</dt><dd>{prescription.max_dose}</dd></div> : null}</dl>} onSave={async (strokes, initials) => { await onSign({ medicationId, cellKey, orderVersion: version, strokes, ...(initials !== undefined ? { initials } : {}), confirmed: true }); }} /> : null}
  </td>;
}
