'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AlertTriangle, Check, ClipboardSignature, FileDown, LockKeyhole, Pill, Printer, ShieldCheck, Stethoscope } from 'lucide-react';

import { AppShell } from '@/components/app-shell';
import { useRole } from '@/components/role-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getHome, roleLabels } from '@/data/demo';
import type { Medication } from '@/data/demo/types';
import { GpMedicationTable } from '@/components/gp-medication-table';
import { SignatureImage } from '@/components/prescriber-signature';
import { usePrescriberChart } from '@/hooks/use-prescriber-chart';
import { mergeMedication } from '@/lib/prescriber-chart';

type PendingSignature = { medication: Medication; date: string; time: string; qty: string };

export default function MedicationChartsPage() {
  const { homeId, role } = useRole();
  const params = useSearchParams();
  return <MedicationChartsContent key={`${homeId}:${role}:${params.get('client') ?? ''}`} />;
}

function MedicationChartsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { homeId, role } = useRole();
  const home = getHome(homeId);
  const requestedClient = searchParams.get('client');
  const requestedMedication = searchParams.get('med');
  const clientId = home.clients.some((item) => item.id === requestedClient) ? requestedClient! : home.clients[0].id;
  const [section, setSection] = useState<'routine' | 'prn'>('routine');
  const [pending, setPending] = useState<PendingSignature | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [savedNotice, setSavedNotice] = useState('');
  const client = home.clients.find((item) => item.id === clientId) ?? home.clients[0];
  const chart = usePrescriberChart(home.id, client.id, role);
  const newOrders: Medication[] = Object.values(chart.records).filter((record) => /^(regular|prn)-slot-/.test(record.medicationId)).map(({ medicationId, prescription: p }) => ({
    id: medicationId, name: p.name, genericName: '', type: medicationId.startsWith('prn-') ? 'prn' : 'routine', dose: p.dose, route: p.route,
    form: '', quantity: '—', schedule: p.frequency, times: p.times.filter(Boolean), indication: '', instructions: p.instructions, maxDailyDose: p.max_dose,
    prescriber: 'GP prescription', prescriberNumber: '—', prescribedDate: p.start_date, reviewDate: '', status: 'active', administrations: [],
  }));
  const medications = [...client.medications.map((item) => mergeMedication(item, chart.records[item.id]?.prescription)), ...newOrders].filter((item) => item.type === section && item.status === 'active');
  const canAdminister = role === 'carer' || role === 'rn';
  const canPrescribe = role === 'gp';
  const canVerify = role === 'pharmacist';

  const activeMedicationId = requestedMedication ?? medications[0]?.id;

  const signAdministration = () => {
    if (!canAdminister || !pending || !confirmed) return;
    const initials = role === 'rn' ? 'EK' : 'MR';
    setSigned((current) => ({ ...current, [`${pending.medication.id}-${pending.date}-${pending.time}`]: initials }));
    setSavedNotice(`${pending.medication.name} recorded by ${initials} at ${pending.time}.`);
    setPending(null);
    setConfirmed(false);
  };

  return (
    <AppShell>
      <section className="section-heading chart-heading">
        <div><p className="eyebrow"><ClipboardSignature size={14} /> Digital medication chart</p><h1>Administration record</h1><p>Routine and PRN orders, prescriber authorisation and individual staff signing.</p></div>
        <div className="chart-toolbar"><Button onClick={() => window.print()} variant="outline"><Printer /> Print</Button>{!canPrescribe ? <Button onClick={() => setSavedNotice('A secure chart export has been prepared for the audit record.')} variant="outline"><FileDown /> Export</Button> : null}</div>
      </section>

      <section className="chart-control-bar">
        <label><span>Client</span><select onChange={(event) => router.push(`/medication-charts?client=${encodeURIComponent(event.target.value)}`)} value={client.id}>{home.clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <div className="chart-client-summary"><div className="person-avatar" style={{ backgroundColor: `${client.photoColor}18`, color: client.photoColor }}>{client.initials}</div><span><strong>{client.name}</strong><small>DOB {client.dateOfBirth} · {client.room}</small></span></div>
        <div className={`chart-allergy ${client.allergies.length ? 'has-allergy' : ''}`}>{client.allergies.length ? <AlertTriangle /> : <ShieldCheck />}<span><small>Allergies / ADR</small><strong>{client.allergies.length ? client.allergies.join(', ') : 'Nil known'}</strong></span></div>
      </section>

      <section className="chart-instructions-grid">
        <article><small>Medication method</small><strong>{client.medicationMethod}</strong></article><article><small>Delivery</small><strong>{client.medicationDelivery}</strong></article><article><small>Administration</small><strong>{client.medicationAdministration}</strong></article><article><small>Primary GP</small><strong>{client.gp}</strong></article><article><small>Pharmacy</small><strong>{client.pharmacy}</strong></article>
      </section>

      <div className="chart-section-tabs" role="tablist" aria-label="Medication order type"><button aria-selected={section === 'routine'} onClick={() => setSection('routine')} role="tab" type="button">Routine medication <span>{client.medications.filter((item) => item.type === 'routine').length}</span></button><button aria-selected={section === 'prn'} onClick={() => setSection('prn')} role="tab" type="button">PRN / when required <span>{client.medications.filter((item) => item.type === 'prn').length}</span></button></div>

      {savedNotice ? <output className="success-notice"><Check size={16} /> {savedNotice}<button aria-label="Dismiss" onClick={() => setSavedNotice('')} type="button">×</button></output> : null}
      {!canPrescribe && chart.error ? <div className="chart-load-error" role="alert">Saved prescriptions could not be refreshed. {chart.error}<Button variant="outline" onClick={() => void chart.reload()}>Retry</Button></div> : null}

      {role === 'gp' || role === 'carer' ? <GpMedicationTable key={section} client={client} records={chart.records} editable={chart.canPrescribe} loaded={chart.loaded} error={chart.error} reload={chart.reload} save={chart.save} kind={section} canAdminister={chart.canAdminister} administrations={chart.administrations} onSign={chart.signAdministration} role={role} /> : <section className="medication-order-stack">
        {medications.map((medication) => {
          const dueRows = medication.type === 'routine' ? medication.times.map((time) => ({ date: '2026-09-02', time, qty: medication.quantity.match(/^\d+/)?.[0] ?? '1', initial: '', status: 'due' })) : [{ date: '2026-09-02', time: '—', qty: '—', initial: '', status: 'available' }];
          const rows = [...medication.administrations.map((item) => ({ ...item, status: item.status })), ...dueRows];
          const active = medication.id === activeMedicationId;
          return (
            <article className={`medication-order-card ${active ? 'active-order' : ''}`} id={medication.id} key={medication.id}>
              <header className="medication-order-header">
                <div className={`order-type-icon ${medication.type}`}><Pill /></div>
                <div className="order-name"><div><h2>{medication.name}</h2><Badge variant={medication.type === 'prn' ? 'outline' : 'secondary'}>{medication.type === 'prn' ? 'PRN' : 'ROUTINE'}</Badge></div><p>{medication.genericName}</p></div>
                <dl className="order-primary-details"><div><dt>Dose</dt><dd>{medication.dose}</dd></div><div><dt>Route</dt><dd>{medication.route}</dd></div><div><dt>Quantity</dt><dd>{medication.quantity}</dd></div><div><dt>Schedule</dt><dd>{medication.schedule}</dd></div></dl>
              </header>
              <div className="order-instruction"><strong>Administration instruction</strong><span>{medication.instructions}</span>{medication.maxDailyDose ? <Badge variant="destructive">Maximum: {medication.maxDailyDose}</Badge> : null}</div>
              <div className="prescriber-strip"><Stethoscope size={17} /><span><small>Prescriber</small><strong>{medication.prescriber}</strong></span><span><small>Prescriber number</small><strong>{medication.prescriberNumber}</strong></span><span><small>Start date</small><strong>{medication.prescribedDate}</strong></span><span><small>Stop date</small><strong>{chart.records[medication.id]?.prescription.end_date || '—'}</strong></span><div className="digital-signature">{chart.records[medication.id]?.prescription.prescriber_signature ? <SignatureImage signature={chart.records[medication.id].prescription.prescriber_signature!} /> : <small>Signature not recorded</small>}</div></div>
              <div className="administration-table-wrap">
                <div className="administration-table-heading"><div><h3>Administration signing record</h3><p>Date, time, quantity and staff initial are recorded as an immutable event.</p></div>{canVerify ? <Button onClick={() => setSavedNotice(`${medication.name} supply details verified against the pharmacy record.`)} variant="outline"><ShieldCheck /> Verify supply</Button> : null}</div>
                <Table className="administration-table">
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Qty</TableHead><TableHead>Initial</TableHead><TableHead>Status / action</TableHead></TableRow></TableHeader>
                  <TableBody>{rows.map((row, index) => {
                    const key = `${medication.id}-${row.date}-${row.time}`;
                    const initial = signed[key] ?? row.initial;
                    return <TableRow key={`${key}-${index}`}><TableCell>{row.date}</TableCell><TableCell>{row.time}</TableCell><TableCell>{row.qty}</TableCell><TableCell><span className={initial ? 'staff-initial' : 'empty-initial'}>{initial || '—'}</span></TableCell><TableCell>{initial ? <Badge variant="secondary"><Check /> Administered</Badge> : canAdminister && row.status !== 'available' ? <Button onClick={() => setPending({ medication, date: row.date, time: row.time, qty: row.qty })} size="sm">Complete checks & sign</Button> : <Badge variant="outline">{row.status === 'available' ? 'Available PRN order' : canAdminister ? 'Not administered' : 'Read only'}</Badge>}</TableCell></TableRow>;
                  })}</TableBody>
                </Table>
              </div>
            </article>
          );
        })}
      </section>}

      <aside className="role-permission-note"><LockKeyhole size={16} /><span><strong>{roleLabels[role]} access</strong>{canAdminister ? 'You can sign administration cells. Prescriber fields, Refer PRN and prescribed times are read only.' : canPrescribe ? 'Edit prescription details, Refer PRN and administration times. Administration signatures are read only.' : canVerify ? 'You can verify supplied medicines and review orders. Prescribing and administration signing are read only.' : 'This chart is read only for your current role.'}</span></aside>

      <Dialog onOpenChange={(open) => { if (!open) { setPending(null); setConfirmed(false); } }} open={Boolean(pending)}>
        <DialogContent className="medication-dialog">
          <DialogHeader><DialogTitle>Complete the 8 Rights and sign</DialogTitle><DialogDescription>{pending?.medication.name} · {pending?.medication.dose} · {pending?.time}</DialogDescription></DialogHeader>
          {pending ? <><div className="rights-grid">{[['Right person', client.name],['Right medication', pending.medication.name],['Right dose', pending.medication.dose],['Right route', pending.medication.route],['Right time', pending.time],['Right reason', pending.medication.indication],['Right documentation', 'Sign this chart row'],['Right response', 'Observe and record concerns']].map(([label, value]) => <div className="right-check" key={label}><Check size={14} /><span><small>{label}</small><strong>{value}</strong></span></div>)}</div><label aria-label="Confirm all medication rights" className="confirm-check" htmlFor="confirm-medication-rights"><Checkbox checked={confirmed} id="confirm-medication-rights" onCheckedChange={(value) => setConfirmed(value === true)} /><span><strong>I completed every check at the point of administration</strong><small>Signing creates an immutable administration record.</small></span></label><div className="dialog-actions"><Button onClick={() => setPending(null)} variant="ghost">Cancel</Button><Button disabled={!confirmed} onClick={signAdministration}><ClipboardSignature /> Sign administration</Button></div></> : null}
        </DialogContent>
      </Dialog>


    </AppShell>
  );
}
