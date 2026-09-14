# GP User Module — Implementation Lab

**Week 2 of 8 · GP home, overview cards and the patient directory**

**Objective:** Reproduce the complete home experience and connect its cards, patient selector and search to the correct GP routes.

## Setup / Prerequisites

Complete Week 1. Estimated 4–6 hours. Keep the original screen visible as your reference; all colours, spacing and component classes remain source-derived.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/components/app-shell.tsx`, `frontend/app/page.tsx`, `frontend/app/people/page.tsx`, `frontend/data/demo/index.ts`, `frontend/data/demo/types.ts`.

## Laboratory Instructions

### (3) Build People search, cards, empty state and chart links

Recreate the complete patient list instead of reducing the experience to a prescription form. Search must work from both the header and the directory itself.

**Source:** `source/frontend/app/people/page.tsx`, lines 1–51. Complete file.

```tsx
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, FileText, MapPin, Search, ShieldCheck, Users } from 'lucide-react';

import { AppShell } from '@/components/app-shell';
import { useRole } from '@/components/role-provider';
import { buttonVariants } from '@/components/ui/button';
import { getHome } from '@/data/demo';

export default function PeoplePage() {
  const searchParams = useSearchParams();
  const { homeId } = useRole();
  const home = getHome(homeId);
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const queryParam = searchParams.get('q') ?? '';

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(queryParam), 0);
    return () => window.clearTimeout(timer);
  }, [queryParam]);

  const clients = useMemo(() => home.clients.filter((client) => `${client.name} ${client.preferredName} ${client.diagnoses.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [home, query]);

  return (
    <AppShell>
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
```

**What the code does:** Recreate this complete page. The initial q comes from the URL. The effect synchronises subsequent URL changes; local input changes query state. Filtering combines full name, preferred name and diagnoses, normalised to lowercase. Each card includes room, preferred name, allergy alert, medication/PRN/note counts, support note and two actions. Stable client.id keys preserve component identity.

**Integration contract:** Header search writes q; People reads q. Profile route /people/[clientId] and chart query client use the same fixture identifier.

**Why this design:** Keeping the route parameter separate from the display name allows readable names to change without breaking bookmarks. useMemo is an optimisation around a pure filter, not a persistence mechanism.

**What breaks if miswired:** Initialising state from q without responding to later q changes leaves stale results when header search is used on the same route. Filtering only names would lose the source support-needs search.

**General pattern:** URL-to-state synchronisation; collection filtering; empty-state feedback.

**Expected result:** James finds James Miller. A nonsense string produces the source empty state. Clearing search restores the current home’s cards.

**Verify before continuing:** Search from the header while already on People. Change home with search still present and explain an empty result. Open both actions on one card and confirm the client remains James.

## Appendix

Week 2 extensions: components/app-shell.tsx and app/page.tsx only. Preserve the rest of the source. A ready-made comparison checkpoint is created with New-CourseWorkspace.ps1 -Week 2 and a new destination. It is a full reference snapshot, not evidence that you implemented the lesson yourself.
