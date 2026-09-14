# GP User Module — Implementation Lab

**Week 2 of 8 · GP home, overview cards and the patient directory**

**Objective:** Reproduce the complete home experience and connect its cards, patient selector and search to the correct GP routes.

## Setup / Prerequisites

Complete Week 1. Estimated 4–6 hours. Keep the original screen visible as your reference; all colours, spacing and component classes remain source-derived.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/components/app-shell.tsx`, `frontend/app/page.tsx`, `frontend/app/people/page.tsx`, `frontend/data/demo/index.ts`, `frontend/data/demo/types.ts`.

## Laboratory Instructions

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

## Appendix

Week 2 extensions: components/app-shell.tsx and app/page.tsx only. Preserve the rest of the source. A ready-made comparison checkpoint is created with New-CourseWorkspace.ps1 -Week 2 and a new destination. It is a full reference snapshot, not evidence that you implemented the lesson yourself.
