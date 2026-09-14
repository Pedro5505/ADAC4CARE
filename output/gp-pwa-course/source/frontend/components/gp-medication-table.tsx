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
      const value = event ?? previous;
      return <PrnCells key={key} date={value?.date} time={value?.time} qty={value?.qty} signature={signatureCell(key, `PRN group ${group + 1}, row ${line + 1}, ${month}`, month === today.slice(0, 7) && maySignDate(today), event, previous?.initial)} />;
    })}
  </>;

  return <tbody className="gp-medicine-block" id={id}>
    {Array.from({ length: 6 }, (_, line) => <tr key={line}>
      {line === 0 ? <><td rowSpan={2} colSpan={2} className="chart-medicine-cell"><label className="refer-prn">Refer PRN <input aria-label={`Refer PRN — ${id}`} type="checkbox" checked={draft.refer_prn} disabled={!editable || saving} onChange={(event) => { change('refer_prn', event.target.checked); void saveFields(); }} /></label>{input('name', 'Regular Medicine')}</td><td rowSpan={2}>{input('dose', 'Dose')}</td></> : null}
      {line === 2 ? <>
        <td rowSpan={2} className="chart-signature-cell"><button type="button" disabled={!editable || saving} aria-label={`Prescriber signature — ${draft.name || id}`} onClick={() => {
          try {
            validatePrescription({ ...draftRef.current, prescriber_signature: { strokes: [[[0, 0], [1, 1]]], signedAt: '', signedBy: '' } });
            setSigning(true); setError('');
          } catch (e) { setError(e instanceof Error ? e.message : 'Complete the prescription first.'); }
        }}><span>Prescriber<br />Signature</span>{draft.prescriber_signature ? <SignatureImage signature={draft.prescriber_signature} /> : <small>{editable ? 'Click to sign' : 'Not signed'}</small>}</button></td>
        <td rowSpan={2}>{input('start_date', 'Start Date', 'date')}</td><td rowSpan={2}>{input('route', 'Route')}</td>
      </> : null}
      {line === 4 ? <><td rowSpan={2} className="chart-row-state"><span role="status">{saving ? 'Saving…' : notice}</span>{draft.prescriber_signature ? <small>Signed {new Date(draft.prescriber_signature.signedAt).toLocaleString('en-AU')}</small> : draft.name ? <small>Awaiting prescriber signature</small> : null}{error ? <><span role="alert" className="chart-error-text">{error}</span><button type="button" disabled={saving || !editable} onClick={() => void saveFields()}>Retry save</button> · <button type="button" onClick={() => window.location.reload()}>Reload page</button></> : null}</td><td rowSpan={2}>{input('end_date', 'Stop Date', 'date')}</td><td rowSpan={2}>{input('frequency', 'Frequency')}</td></> : null}
      {cells(line)}
    </tr>)}
    {signing && editable ? <tr className="signature-dialog-row"><td colSpan={kind === 'prn' ? 20 : 4 + days.length}><PrescriberSignatureDialog open onClose={() => setSigning(false)} medicine={draft.name} onSave={async (strokes) => {
      const next = { ...draftRef.current, prescriber_signature: { strokes, signedAt: '', signedBy: '' } };
      await persist(next);
    }} /></td></tr> : null}
  </tbody>;
}

function PrnCells({ date, time, qty, signature }: { date?: string; time?: string; qty?: string; signature: ReactNode }) {
  return <><td className="prn-record-cell">{date ? `${date.slice(8)}/${date.slice(5, 7)}` : ''}</td><td className="prn-record-cell">{time}</td><td className="prn-record-cell" title={qty}>{qty}</td>{signature}</>;
}

export function GpMedicationTable({ client, records, editable, loaded, error, reload, save, kind = 'routine', canAdminister, administrations, onSign, role }: {
  client: Client; records: Record<string, ChartRecord>; editable: boolean; loaded: boolean; error: string; reload: () => Promise<void>; save: Save;
  kind?: 'routine' | 'prn'; canAdminister: boolean; administrations: AdministrationRecord[]; onSign: (input: AdministrationInput) => Promise<void>; role: string;
}) {
  const [month, setMonth] = useState(() => { const today = new Date(); return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`; });
  const [half, setHalf] = useState(1);
  const lastDay = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  const days = Array.from({ length: half === 1 ? 15 : lastDay - 15 }, (_, i) => (half === 1 ? 1 : 16) + i);
  const regular = client.medications.filter((medication) => medication.type === kind);
  const historySources = [...regular, ...Object.values(records).filter((r) => r.medicationId.startsWith('regular-slot-')).map((r) => ({ id: r.medicationId, name: r.prescription.name, times: r.prescription.times, administrations: [] }))];
  const historical = kind === 'routine' ? historySources.flatMap((medication) => {
    const times = records[medication.id]?.prescription.times ?? medication.times;
    return [
      ...medication.administrations.filter((row) => row.date.startsWith(month) && !times.includes(row.time)).map((row) => ({ ...row, name: medication.name, signature: null as AdministrationRecord['signature'] | null })),
      ...administrations.filter((row) => row.medicationId === medication.id && row.date.startsWith(month) && !times.includes(row.time)).map((row) => ({ ...row, name: medication.name, initial: '' })),
    ];
  }) : [];
  return <section className="gp-chart-section">
    <div className="gp-chart-controls"><label>Chart month <input aria-label="Chart month" type="month" value={month} onChange={(event) => { if (event.target.value) setMonth(event.target.value); }} /></label>{kind === 'routine' ? <div><Button variant={half === 1 ? 'default' : 'outline'} onClick={() => setHalf(1)}>1–15</Button><Button variant={half === 2 ? 'default' : 'outline'} onClick={() => setHalf(2)}>16–{lastDay}</Button></div> : null}<span>{role === 'gp' ? 'Prescriber fields save when you leave a cell.' : 'Select an empty administration cell to sign. Prescriber fields are read only.'}</span></div>
    {error ? <div role="alert" className="chart-load-error">{error} <Button variant="outline" onClick={() => void reload()}>Reload chart</Button></div> : !loaded ? <p role="status">Loading saved prescriptions…</p> : null}
    {loaded && ((role === 'gp' && !editable) || (role === 'carer' && !canAdminister)) ? <p className="chart-load-error">Your account has read-only chart access.</p> : null}
    <div className="gp-table-scroll" role="region" aria-label={`${kind === 'prn' ? 'PRN' : 'Regular'} medication chart, scroll horizontally for all cells`} tabIndex={0}>
      <table className={`gp-medication-table ${kind === 'prn' ? 'prn-medication-table' : ''}`}>
        <caption>{kind === 'prn' ? 'PRN' : 'Regular'} medicine chart · {client.name} · {month} · {role === 'gp' ? 'Administration cells are read only for the GP.' : 'Add your initials in the corresponding cell after administration. Prescriber details are read only.'}</caption>
        <colgroup><col className="gp-col-signature" /><col className="gp-col-date" /><col className="gp-col-detail" /><col className={kind === 'prn' ? 'prn-col-instruction' : 'gp-col-time'} />{kind === 'routine' ? days.map((day) => <col key={day} className="gp-col-day" />) : Array.from({ length: 16 }, (_, i) => <col key={i} className={i % 4 === 3 ? 'prn-col-initial' : 'prn-col-record'} />)}</colgroup>
        <thead><tr><th scope="colgroup" colSpan={3}>{kind === 'prn' ? 'PRN Medicine Orders' : 'Regular Medicine Orders 1 to 8'}</th><th scope="col">{kind === 'prn' ? 'Instruction' : <>Dates →<br />Time ↓</>}</th>{kind === 'routine' ? days.map((day) => <th scope="col" key={day}>{day}</th>) : Array.from({ length: 4 }, (_, group) => ['Date', 'Time', 'Qty', 'Initial'].map((label) => <th scope="col" key={`${group}-${label}`}>{label}</th>))}</tr></thead>
        {Array.from({ length: 8 }, (_, index) => {
          const medication = regular[index];
          const id = medication?.id ?? `${kind === 'prn' ? 'prn' : 'regular'}-slot-${index + 1}`;
          return <MedicineRows key={id} id={id} medication={medication} record={records[id]} editable={editable && !error} save={save} month={month} days={days} kind={kind} canAdminister={canAdminister && !error} administrations={administrations} onSign={onSign} clientName={client.name} />;
        })}
      </table>
    </div>
    {historical.length ? <details className="chart-history"><summary>Previous administration records at other times ({historical.length})</summary><table><thead><tr><th>Medicine</th><th>Date</th><th>Time</th><th>Qty</th><th>Initial / signature</th></tr></thead><tbody>{historical.map((row, i) => <tr key={i}><td>{row.name}</td><td>{row.date}</td><td>{row.time}</td><td>{row.qty}</td><td>{row.signature ? <SignatureImage signature={row.signature} label="Previous administration signature" /> : row.initial}</td></tr>)}</tbody></table></details> : null}
  </section>;
}
