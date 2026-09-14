# GP User Module — Implementation Lab

**Week 2 of 8 · GP home, overview cards and the patient directory**

**Objective:** Reproduce the complete home experience and connect its cards, patient selector and search to the correct GP routes.

## Setup / Prerequisites

Complete Week 1. Estimated 4–6 hours. Keep the original screen visible as your reference; all colours, spacing and component classes remain source-derived.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/components/app-shell.tsx`, `frontend/app/page.tsx`, `frontend/app/people/page.tsx`, `frontend/data/demo/index.ts`, `frontend/data/demo/types.ts`.

## Laboratory Instructions

### (0) Expose Overview for GP users

The original route exists, but the GP menu excludes it. Apply the small course extension so a GP can discover the home page through the same sidebar.

**Source:** `extensions/week-02/frontend/components/app-shell.tsx`, lines 27–36. Verbatim chunk; assemble with the other chunks in the accompanying complete file.

```tsx

const navItems = [
  { label: 'Overview', href: '/', icon: LayoutDashboard, roles: ['carer', 'rn', 'management', 'gp'] },
  { label: 'Medication round', href: '/medication-round', icon: ClipboardCheck, roles: ['carer', 'rn'] },
  { label: 'People', href: '/people', icon: Users, roles: ['carer', 'rn', 'management', 'gp', 'pharmacist'] },
  { label: 'Medication charts', href: '/medication-charts', icon: FileText, roles: ['carer', 'rn', 'gp', 'pharmacist'] },
  { label: 'Medication audit', href: '/medication-audit', icon: ShieldCheck, roles: ['carer', 'rn', 'management'] },
  { label: 'Clinical reports', href: '/reports', icon: Activity, roles: ['rn', 'management', 'gp', 'pharmacist'] },
  { label: 'Messages & incidents', href: '/messages', icon: MessageCircle, roles: ['carer', 'rn', 'management', 'gp', 'pharmacist'], count: undefined },
] satisfies Array<{ label: string; href: string; icon: typeof LayoutDashboard; roles: UserRole[]; count?: number }>;
```

**What the code does:** Edit the existing navItems declaration to match this chunk. The complete Week 2 shell file is included under extensions/week-02. The only presentation changes are adding gp to Overview and removing the hardcoded message count. Keep other roles and routes intact because shared components use them. The Bell remains a shortcut to Messages, not a push subscription.

**Integration contract:** The new menu entry targets /. No server permission changes accompany this UI addition.

**Why this design:** Navigation should expose an existing GP-relevant page without implying that a GP can sign administration records or run a medication round.

**What breaks if miswired:** Granting GP access to every menu item would expose actions outside this role’s intended scope. A badge with the number 3 would misleadingly look like a live unread count.

**General pattern:** Capability-aware presentation; honest notification affordance.

**Expected result:** GP sees Overview, People, Medication charts, Clinical reports and Messages & incidents.

**Verify before continuing:** Select another role then GP. Click Overview. Confirm the active item and home heading agree. Medication round and Medication audit should remain absent from the GP menu.

### (1) Build the overview view model before its cards

Construct the home/client selection and derived counts before rendering them. A correct card number begins with a clear source of truth.

**Source:** `extensions/week-02/frontend/app/page.tsx`, lines 1–24. Verbatim chunk; assemble with the other chunks in the accompanying complete file.

```tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Activity, Check, CircleAlert, ClipboardCheck, MessageCircle, ShieldCheck, Users } from 'lucide-react';

import { AppShell } from '@/components/app-shell';
import { useRole } from '@/components/role-provider';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getHome, roleLabels } from '@/data/demo';
import { cn } from '@/lib/utils';

export default function OverviewPage() {
  const { homeId, role } = useRole();
  const home = getHome(homeId);
  const [clientId, setClientId] = useState(home.clients[0].id);
  const client = home.clients.find((item) => item.id === clientId) ?? home.clients[0];
  const medications = client.medications.filter((item) => item.status === 'active');
  const completed = medications.reduce((total, medication) => total + medication.administrations.filter((item) => item.date === '2026-09-01' && item.status === 'administered').length, 0);
  const expected = medications.filter((item) => item.type === 'routine').reduce((total, medication) => total + medication.times.length, 0);
  const completion = expected ? Math.min(100, Math.round((completed / expected) * 100)) : 0;

```

**Source:** `source/frontend/data/demo/index.ts`, lines 1–27. Complete file.

```typescript
import banksia from './banksia-house.json';
import grevillea from './grevillea-house.json';
import jacaranda from './jacaranda-house.json';
import waratah from './waratah-house.json';
import type { GroupHome } from './types';

export const groupHomes = [banksia, grevillea, jacaranda, waratah] as GroupHome[];

export function getHome(homeId?: string | null) {
  return groupHomes.find((home) => home.id === homeId) ?? groupHomes[0];
}

export function getClient(clientId?: string | null) {
  for (const home of groupHomes) {
    const client = home.clients.find((item) => item.id === clientId);
    if (client) return { client, home };
  }
  return { client: groupHomes[0].clients[0], home: groupHomes[0] };
}

export const roleLabels = {
  carer: 'Support worker / carer',
  rn: 'Registered nurse',
  management: 'Group home management',
  gp: 'General practitioner',
  pharmacist: 'Pharmacist',
} as const;
```

**What the code does:** Recreate the overview from the complete Week 2 file in three chunks: imports/calculations, summary cards, then lower panels. homeId selects a fixture home; clientId selects a client or falls back to the first client. Active medication counts and administration completion are derived from fixtures. The administration date is fixed at 2026-09-01 in the original source, so the extension labels it as a demo date. latestInstruction is sorted across clients.

**Integration contract:** At this checkpoint there is no dashboard endpoint. The cards consume GroupHome/Client fixture objects. A chart PATCH does not mutate those fixture objects.

**Why this design:** Derived state avoids separately storing totals that can disagree with their underlying list. However, a derived total is only as current as the data it derives from.

**What breaks if miswired:** Calling these numbers live would be incorrect. Persisted chart revisions are merged on the chart page, not automatically across dashboard/profile summaries. Adding a database hook later requires one consistent merge policy.

**General pattern:** Derived view model; source-of-truth analysis.

**Expected result:** Changing Overview client changes active orders and the dose list. Changing home selects a valid client in the new home.

**Verify before continuing:** Manually count the selected client’s active fixture medicines and compare the card. Explain why a new chart slot does not yet increment this fixture summary.

### (2) Render the full overview using the existing design

Build the summary grid, medication list and right rail, including their navigation actions. Adapt the action wording to the GP role while preserving layout.

**Source:** `extensions/week-02/frontend/app/page.tsx`, lines 25–67. Verbatim chunk; assemble with the other chunks in the accompanying complete file.

```tsx
  const latestInstruction = home.clients.flatMap((item) => item.reports.map((report) => ({ ...report, client: item.name, clientId: item.id }))).sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <AppShell>
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
```

**What the code does:** Place this remaining chunk after the view model. Summary cards link to charts, People and Reports. The lower layout contains safety details, medicine names/doses/times, pinned instructions and latest clinical instruction. The Week 2 condition hides the audit panel for GP. The medicine action says Review chart and omits mode=administer for GP. It keeps the original button class so the shape and spacing remain the same.

**Integration contract:** Each chart link carries the stable client ID; medicine links also carry med. Client names are display labels, not resource identifiers.

**Why this design:** Using the same target route from a card, profile and sidebar gives the user several paths into one chart implementation.

**What breaks if miswired:** Linking with a name instead of an ID breaks lookup. Showing Administer on a GP dashboard promises a workflow this role cannot complete. CSS breakpoints must remain with the copied markup.

**General pattern:** Progressive disclosure through linked summary/detail screens.

**Expected result:** All four summary cards, the full medication panel and both right-rail panels are visible; GP actions lead to review screens.

**Verify before continuing:** Click every card and every lower-panel link, then return with Back. At 390px inspect the single-column order. Compare labels and spacing with the source reference.

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

### Endpoint quick reference

| Method / route | Purpose | Access and response |
|---|---|---|
| GET /api/prescriber-chart?home=…&client=… | Latest chart and administrations | Authenticated; 200 capability envelope; 401/404/503 |
| PATCH /api/prescriber-chart?home=…&client=… | Append prescription revision | GP write + same origin; 200 record; 400/403/404/409/413/503 |
| POST /api/chart-administrations?home=…&client=… | Shared staff signature path | Carer only; GP reads history through chart GET |
| GET /api/clinical-records?home=… | Week 6 report/message list | Authenticated; 200 records/canCreate; 401/404/503 |
| POST /api/clinical-records?home=… | Week 6 GP instruction/note | GP + same origin; 201 create/200 retry; 400/403/404/409/413/503 |
| GET /api/medication-orders/ on Django | Separate relational API | Django session required; not called by chart UI |

### Storage and configuration

| Item | Meaning |
|---|---|
| prescription_revisions | home/client/medication/version key; prescription JSON, actor and saved_at |
| administration_signatures | home/client/medication/cell key; order version and signed event |
| gp_communications (Week 6) | UUID, home/client, kind, original request, returned record, actor, creation time |
| DB | Private D1 runtime binding; migrations and dev server must share local state location |
| ADAC_GP_EMAILS | Server GP allowlist for hosted identity; local development deliberately bypasses it |
| ADAC_CARER_EMAILS | Shared carer allowlist; does not grant GP administration actions |
| NEXT_PUBLIC_API_URL | Legacy Django client URL; not used by relative chart fetches |
| NEXT_PUBLIC_SITE_URL | Root metadata base; local example is port 3000 and may be set to port 3200 for this course |
| DJANGO_SETTINGS_MODULE / DJANGO_DEBUG / DATABASE_URL | Separate Python service settings; set before launching Django |

**Source provenance:** Snapshot of the actual repository inspected 10 September 2026; frontend commit c53e0eaccf0d9771a9babfada1fab6de8b1f35f3. Full original files are under source; new teaching code is under extensions/week-02, week-06 and week-07. source-manifest.json records hashes. Integration-Reference.md preserves the detailed first lab for deeper chart/Django explanations.
