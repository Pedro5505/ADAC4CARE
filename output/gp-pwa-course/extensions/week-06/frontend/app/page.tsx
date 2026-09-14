'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Activity, Check, CircleAlert, ClipboardCheck, MessageCircle, ShieldCheck, Users } from 'lucide-react';

import { AppShell } from '@/components/app-shell';
import { useClinicalHome } from '@/hooks/use-clinical-home';
import { useRole } from '@/components/role-provider';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getHome, roleLabels } from '@/data/demo';
import { cn } from '@/lib/utils';

export default function OverviewPage() {
  const { homeId, role } = useRole();
  const { home, error: recordsError } = useClinicalHome(homeId);
  const [clientId, setClientId] = useState(home.clients[0].id);
  const client = home.clients.find((item) => item.id === clientId) ?? home.clients[0];
  const medications = client.medications.filter((item) => item.status === 'active');
  const completed = medications.reduce((total, medication) => total + medication.administrations.filter((item) => item.date === '2026-09-01' && item.status === 'administered').length, 0);
  const expected = medications.filter((item) => item.type === 'routine').reduce((total, medication) => total + medication.times.length, 0);
  const completion = expected ? Math.min(100, Math.round((completed / expected) * 100)) : 0;

  const latestInstruction = home.clients.flatMap((item) => item.reports.map((report) => ({ ...report, client: item.name, clientId: item.id }))).sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <AppShell>
      {recordsError ? <p role="alert">{recordsError} Showing available records.</p> : null}
      <section className="welcome-row overview-heading">
        <div><p className="eyebrow"><ShieldCheck size={14} /> {roleLabels[role]} workspace</p><h1>{home.name}</h1><p>{home.address} · Shift {home.shift}</p></div>
        <label className="client-focus-select"><span>Overview client</span><select onChange={(event) => setClientId(event.target.value)} value={client.id}>{home.clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </section>

      {role !== 'gp' ? <section className="panel" style={{ padding: 18, marginBottom: 18 }}><h2>Medication audit and signed records</h2><p>Open the medication audit checklist or review signed client round records.</p><Link className={buttonVariants({ variant: 'outline' })} href="/medication-audit">Medication audit checklist</Link> <Link className={buttonVariants({ variant: 'outline' })} href="/medication-audit?mode=round">Signed medication rounds</Link></section> : null}

      <section aria-label="Current home summary" className="summary-grid">
        <Link className="summary-card lavender summary-link" href={`/medication-charts?client=${client.id}`}><div className="summary-icon"><ClipboardCheck /></div><div><strong>{medications.length}</strong><span>Active medication orders</span></div><Badge className="summary-badge">{client.preferredName}’s chart</Badge></Link>
        <Link className="summary-card sage summary-link" href={`/medication-charts?client=${client.id}`}><div className="summary-icon"><Check /></div><div><strong>{completed}</strong><span>Administrations (demo 1 Sep)</span></div><div className="mini-progress"><span>{completion}%</span><Progress value={completion} /></div></Link>
        <Link className="summary-card neutral summary-link" href="/people"><div className="summary-icon"><Users /></div><div><strong>{home.clients.length}</strong><span>People in this home</span></div><span className="summary-note">Open detailed profiles</span></Link>
        <Link className="summary-card warning summary-link" href="/reports"><div className="summary-icon"><Activity /></div><div><strong>{home.clients.reduce((sum, item) => sum + item.reports.filter((report) => !report.acknowledged).length, 0)}</strong><span>Clinical instructions to review</span></div><span className="summary-note warning-copy">RN and GP reports only</span></Link>
      </section>

      <section className="workspace-grid">
        <article className="panel dose-panel">
          <div className="panel-header"><div><h2>{client.preferredName}’s medication overview</h2><p>{client.room} · Allergies: {client.allergies.length ? client.allergies.join(', ') : 'Nil known'}</p></div><Link className={cn(buttonVariants({ variant: 'outline' }), 'view-chart-button')} href={`/medication-charts?client=${client.id}`}>View full chart</Link></div>
          <div className="profile-safety-strip"><span><strong>Method</strong>{client.medicationMethod}</span><span><strong>Delivery</strong>{client.medicationDelivery}</span><span><strong>Administration</strong>{client.medicationAdministration}</span></div>
          <div className="dose-list">
            {medications.map((medication) => (
              <article className="dose-row overview-dose-row" key={medication.id}>
                <div className="person-avatar" style={{ backgroundColor: `${client.photoColor}18`, color: client.photoColor }}>{client.initials}</div>
                <div className="person-details"><strong>{medication.name}</strong><span>{medication.type === 'prn' ? 'PRN / when required' : 'Routine medication'}</span></div>
                <div className="medication-details"><strong>{medication.dose} · {medication.route}</strong><span>{medication.instructions}</span></div>
                <div className="dose-time"><strong>{medication.times.length ? medication.times.join(', ') : 'PRN'}</strong><span className={medication.type === 'prn' ? 'bg-[#FFF4E8] text-[#8A5A27]' : 'bg-[#EEF4E3] text-[#5D763F]'}>{medication.type}</span></div>
                <Link className={cn(buttonVariants({ variant: 'outline' }), 'administer-button')} href={`/medication-charts?client=${client.id}&med=${medication.id}${role === 'gp' ? '' : '&mode=administer'}`}>{role === 'gp' ? 'Review chart' : 'Administer'}</Link>
              </article>
            ))}
          </div>
        </article>

        <aside className="right-rail">
          <article className="panel attention-card pinned-note-card"><div className="panel-heading-inline"><h2>Pinned instructions</h2><span>Management / clinical</span></div><div className="alert-item management-note"><div className="alert-icon"><MessageCircle size={18} /></div><div><strong>For all carers</strong><p>{home.pinnedNote}</p><Link href="/messages">Open pinned messages →</Link></div></div></article>
          <article className="panel shift-card"><div className="panel-heading-inline"><h2>Latest clinical instruction</h2><span className="on-duty"><i /> Current</span></div><div className="clinical-update"><CircleAlert size={18} /><div><strong>{latestInstruction?.title}</strong><p>{latestInstruction?.client} · {latestInstruction?.authorRole} · {latestInstruction?.date}</p><span>{latestInstruction?.action}</span></div></div><Link className={cn(buttonVariants({ variant: 'secondary' }), 'handover-button')} href="/reports">Review clinical reports</Link></article>
        </aside>
      </section>
    </AppShell>
  );
}
