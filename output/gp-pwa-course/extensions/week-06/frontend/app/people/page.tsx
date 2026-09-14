'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, FileText, MapPin, Search, ShieldCheck, Users } from 'lucide-react';

import { AppShell } from '@/components/app-shell';
import { useClinicalHome } from '@/hooks/use-clinical-home';
import { useRole } from '@/components/role-provider';
import { buttonVariants } from '@/components/ui/button';
import { getHome } from '@/data/demo';

export default function PeoplePage() {
  const searchParams = useSearchParams();
  const { homeId } = useRole();
  const { home, error: recordsError } = useClinicalHome(homeId);
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const queryParam = searchParams.get('q') ?? '';

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(queryParam), 0);
    return () => window.clearTimeout(timer);
  }, [queryParam]);

  const clients = useMemo(() => home.clients.filter((client) => `${client.name} ${client.preferredName} ${client.diagnoses.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [home, query]);

  return (
    <AppShell>
      {recordsError ? <p role="alert">{recordsError} Showing available records.</p> : null}
      <section className="section-heading">
        <div><p className="eyebrow"><Users size={14} /> Client directory</p><h1>People at {home.name}</h1><p>Detailed medication profiles for the people this team supports.</p></div>
        <label className="page-search"><Search size={17} /><input aria-label="Search this home" onChange={(event) => setQuery(event.target.value)} placeholder="Search name or support need" value={query} /></label>
      </section>

      <div className="home-context-banner"><MapPin size={17} /><span><strong>{home.address}</strong><small>Manager {home.manager} · RN lead {home.rnLead} · {home.phone}</small></span></div>

      <section className="people-grid">
        {clients.map((client) => (
          <article className="person-card" key={client.id}>
            <div className="person-card-top"><div className="profile-avatar-large" style={{ backgroundColor: `${client.photoColor}18`, color: client.photoColor }}>{client.initials}</div><span className="room-pill">{client.room}</span></div>
            <div className="person-card-title"><h2>{client.name}</h2><p>Prefers {client.preferredName} · {client.pronouns}</p></div>
            <div className={`allergy-strip ${client.allergies.length ? 'has-allergy' : ''}`}>{client.allergies.length ? <AlertTriangle size={15} /> : <ShieldCheck size={15} />}<span><strong>{client.allergies.length ? 'Allergy alert' : 'Nil known allergies'}</strong>{client.allergies.length ? client.allergies.join(', ') : 'Confirmed on current chart'}</span></div>
            <div className="person-card-facts"><span><small>Active medicines</small><strong>{client.medications.filter((item) => item.status === 'active').length}</strong></span><span><small>PRN orders</small><strong>{client.medications.filter((item) => item.type === 'prn').length}</strong></span><span><small>Clinical notes</small><strong>{client.reports.length}</strong></span></div>
            <p className="support-note"><strong>Support note</strong>{client.supportNotes}</p>
            <div className="person-card-actions"><Link className={buttonVariants({ variant: 'outline' })} href={`/people/${client.id}`}><FileText /> View profile</Link><Link className={buttonVariants()} href={`/medication-charts?client=${client.id}`}>Open chart <ArrowRight /></Link></div>
          </article>
        ))}
      </section>
      {clients.length === 0 ? <div className="empty-state"><Search size={28} /><strong>No clients match “{query}”</strong><span>Try another name or clear the search.</span></div> : null}
    </AppShell>
  );
}
