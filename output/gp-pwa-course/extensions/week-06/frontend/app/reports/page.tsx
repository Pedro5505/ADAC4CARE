'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Check, ClipboardPlus, FileText, Filter, LockKeyhole, Stethoscope } from 'lucide-react';

import { AppShell } from '@/components/app-shell';
import { useRole } from '@/components/role-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { roleLabels } from '@/data/demo';
import { useClinicalHome } from '@/hooks/use-clinical-home';
import { GpCommunicationForm } from '@/components/gp-communication-form';

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const { homeId, role } = useRole();
  const { home, error: loadError, canCreate: serverCanCreate, save } = useClinicalHome(homeId);
  const [clientId, setClientId] = useState(searchParams.get('client') ?? 'all');
  const [category, setCategory] = useState('all');
  const [composeOpen, setComposeOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  const canCreate = role === 'rn' || (role === 'gp' && serverCanCreate);
  const reports = home.clients.flatMap((client) => client.reports.filter((report) => report.authorRole === 'RN' || report.authorRole === 'GP').map((report) => ({ ...report, clientName: client.name, clientId: client.id }))).filter((report) => (clientId === 'all' || report.clientId === clientId) && (category === 'all' || report.category === category)).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <AppShell>
      {loadError ? <p role="alert">{loadError} Showing available records.</p> : null}
      <section className="section-heading"><div><p className="eyebrow"><FileText size={14} /> Clinical reports</p><h1>Medication instructions & reviews</h1><p>Only RN reviews, GP instructions and medication dose or administration changes appear here.</p></div>{canCreate ? <Button onClick={() => setComposeOpen(true)}><ClipboardPlus /> {role === 'gp' ? 'Add GP instruction' : 'Add RN review'}</Button> : null}</section>

      <section className="report-filter-bar"><Filter size={17} /><label><span>Client</span><select onChange={(event) => setClientId(event.target.value)} value={clientId}><option value="all">All clients</option>{home.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label><span>Report type</span><select onChange={(event) => setCategory(event.target.value)} value={category}><option value="all">All clinical reports</option><option>RN review</option><option>GP instruction</option><option>Dose change</option></select></label><span className="report-count">{reports.length} records</span></section>

      {notice ? <output className="success-notice"><Check size={16} /> {notice}<button aria-label="Dismiss" onClick={() => setNotice('')} type="button">×</button></output> : null}

      <section className="reports-timeline">
        {reports.map((report) => {
          const isAcknowledged = acknowledged[report.id] ?? report.acknowledged;
          return <article className="report-card" key={report.id}><div className={`report-author-icon ${report.authorRole.toLowerCase()}`}>{report.authorRole === 'GP' ? <Stethoscope /> : <FileText />}</div><div className="report-body"><div className="report-meta"><Badge variant={report.authorRole === 'GP' ? 'default' : 'secondary'}>{report.category}</Badge><span>{report.date}</span><span>{report.clientName}</span></div><h2>{report.title}</h2><p>{report.summary}</p><div className="required-action"><strong>Instruction / required action</strong><span>{report.action}</span></div><footer><span><strong>{report.author}</strong>{report.authorRole}</span>{role === 'rn' || role === 'management' ? <Button disabled={isAcknowledged} onClick={() => { setAcknowledged((current) => ({ ...current, [report.id]: true })); setNotice(`${report.title} acknowledged.`); }} size="sm" variant={isAcknowledged ? 'secondary' : 'outline'}>{isAcknowledged ? <><Check /> Acknowledged</> : 'Acknowledge instruction'}</Button> : <Badge variant="outline">Read only</Badge>}</footer></div></article>;
        })}
      </section>

      <aside className="role-permission-note"><LockKeyhole size={16} /><span><strong>{roleLabels[role]} access</strong>{role === 'gp' ? 'You can issue GP instructions and dose changes. Prescriptions are created from Medication charts.' : role === 'rn' ? 'You can add clinical reviews and acknowledge prescriber instructions.' : role === 'management' ? 'You can review and acknowledge instructions for operational follow-up.' : 'Clinical reports are read only for this role.'}</span></aside>

      <Dialog onOpenChange={setComposeOpen} open={composeOpen}><DialogContent className="report-dialog"><DialogHeader><DialogTitle>{role === 'gp' ? 'New GP medication instruction' : 'New RN medication review'}</DialogTitle><DialogDescription>GP records are saved in the course database with the authenticated actor. This form does not draw a prescription signature.</DialogDescription></DialogHeader>{role === 'gp' ? <GpCommunicationForm key={homeId + String(composeOpen)} home={home} kind="report" save={save} onCancel={() => setComposeOpen(false)} onSaved={() => { setComposeOpen(false); setNotice('Saved to the course database.'); }} /> : <><div className="prescription-form-grid"><label htmlFor="report-client"><span>Client</span><select id="report-client">{home.clients.map((client) => <option key={client.id}>{client.name}</option>)}</select></label><label htmlFor="report-type"><span>Report type</span><select id="report-type"><option>RN review</option></select></label><label className="form-span" htmlFor="report-title"><span>Title</span><Input id="report-title" placeholder="Clear clinical heading" /></label><label className="form-span" htmlFor="report-summary"><span>Clinical summary</span><textarea id="report-summary" placeholder="Assessment or reason for change" /></label><label className="form-span" htmlFor="report-action"><span>Required action</span><textarea id="report-action" placeholder="Exact dose, timing, administration or monitoring instruction" /></label></div><div className="dialog-actions"><Button onClick={() => setComposeOpen(false)} variant="ghost">Cancel</Button><Button onClick={() => { setComposeOpen(false); setNotice('Clinical report saved as a demo record.'); }}>Sign & add report</Button></div></>}</DialogContent></Dialog>
    </AppShell>
  );
}
