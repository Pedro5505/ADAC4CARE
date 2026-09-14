# GP User Module — Implementation Lab

**Week 3 of 8 · Patient profiles, chart navigation and UI state boundaries**

**Objective:** Build the patient detail journey and understand which data comes from fixtures, route parameters, React state and the chart API.

## Setup / Prerequisites

Complete Week 2. Estimated 4–6 hours. Use James Miller in Banksia House for consistent examples.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/app/people/[clientId]/page.tsx`, `frontend/app/medication-charts/page.tsx`, `frontend/lib/prescriber-chart.ts`, `frontend/hooks/use-prescriber-chart.ts`.

## Laboratory Instructions

### (1) Assemble all profile panels and contextual links

Rebuild the complete detail screen: identity, allergies, medicines, instructions, administration guidance and clinical contacts.

**Source:** `source/frontend/app/people/[clientId]/page.tsx`, lines 27–51. Verbatim chunk; assemble with the other chunks in the accompanying complete file.

```tsx

  return (
    <AppShell>
      <div className="back-row"><Link href="/people"><ArrowLeft size={15} /> Back to people</Link></div>
      <section className="client-profile-hero">
        <div className="profile-avatar-xl" style={{ backgroundColor: `${client.photoColor}18`, color: client.photoColor }}>{client.initials}</div>
        <div className="client-profile-title"><p className="eyebrow"><MapPin size={14} /> {home.name} · {client.room}</p><h1>{client.name}</h1><p>Preferred name {client.preferredName} · {client.pronouns} · DOB {client.dateOfBirth}</p></div>
        <div className="profile-actions"><Link className={buttonVariants({ variant: 'outline' })} href={`/messages?client=${client.id}`}><MessageCircle /> Messages</Link><Link className={buttonVariants()} href={`/medication-charts?client=${client.id}`}><Pill /> Medication chart</Link></div>
      </section>

      <section className="profile-grid">
        <div className="profile-main-column">
          <article className={`profile-panel allergy-profile ${client.allergies.length ? 'has-allergy' : ''}`}><div className="profile-panel-heading">{client.allergies.length ? <AlertTriangle /> : <ShieldCheck />}<div><h2>Allergies and adverse reactions</h2><p>{client.allergies.length ? client.allergies.join(' · ') : 'No known medication allergies recorded'}</p></div><Badge variant={client.allergies.length ? 'destructive' : 'secondary'}>{client.allergies.length ? 'Drug alert' : 'Reviewed'}</Badge></div></article>
          <article className="profile-panel"><div className="profile-panel-heading"><Pill /><div><h2>Current medication orders</h2><p>{client.medications.filter((item) => item.status === 'active').length} active orders</p></div></div><div className="profile-med-list">{client.medications.map((medication) => <Link href={`/medication-charts?client=${client.id}&med=${medication.id}`} key={medication.id}><span className={`med-type-dot ${medication.type}`} /><span><strong>{medication.name} · {medication.dose}</strong><small>{medication.schedule} · {medication.route}</small></span><Badge variant="outline">{medication.type.toUpperCase()}</Badge></Link>)}</div></article>
          <article className="profile-panel"><div className="profile-panel-heading"><FileText /><div><h2>Recent clinical instructions</h2><p>RN and GP reports only</p></div></div><div className="clinical-report-list compact">{clinicalReports.map((report) => <Link href={`/reports?client=${client.id}`} key={report.id}><span><strong>{report.title}</strong><small>{report.authorRole} · {report.author} · {report.date}</small></span><Badge variant={report.acknowledged ? 'secondary' : 'outline'}>{report.acknowledged ? 'Acknowledged' : 'Review'}</Badge></Link>)}</div></article>
        </div>
        <aside className="profile-side-column">
          <article className="profile-panel"><h2>Safe administration</h2><dl className="detail-list"><div><dt>Method</dt><dd>{client.medicationMethod}</dd></div><div><dt>Delivery</dt><dd>{client.medicationDelivery}</dd></div><div><dt>Fluids / method</dt><dd>{client.medicationAdministration}</dd></div><div><dt>Support notes</dt><dd>{client.supportNotes}</dd></div></dl></article>
          <article className="profile-panel"><h2>Clinical contacts</h2><dl className="detail-list"><div><dt><Stethoscope size={14} /> Primary GP</dt><dd>{client.gp}</dd></div><div><dt><Pill size={14} /> Pharmacy</dt><dd>{client.pharmacy}</dd></div><div><dt><Calendar size={14} /> NDIS number</dt><dd>{client.ndisNumber}</dd></div></dl></article>
          <article className="profile-panel"><h2>Support context</h2><div className="diagnosis-list">{client.diagnoses.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}</div></article>
        </aside>
      </section>
    </AppShell>
  );
}
```

**What the code does:** Append this JSX to the preceding route logic. Preserve the profile-grid, profile-main-column and profile-side-column classes. The allergy component changes both icon and text, so the alert does not depend on colour alone. Medication rows are links into the chart. Reports and messages carry the same client ID in query strings. The GP and pharmacy contact fields are display text, not communication endpoints.

**Integration contract:** Fixture Client supplies medication summaries, reports and safety context. The profile’s server component is not subscribed to the Week 6 browser hook.

**Why this design:** A contextual link should save the user from searching for the same patient again. A summary view should explicitly identify whether it is a fixture snapshot or a current persisted chart.

**What breaks if miswired:** New Week 6 records appear in Reports/People/Overview, but the original profile summary remains a fixture snapshot in this course. Use its Reports link to read the persisted list. Likewise, the chart is authoritative for saved dose edits; the static profile medicine summary is not automatically refreshed.

**General pattern:** Master/detail navigation; explicit read-model freshness.

**Expected result:** The full source profile renders and its Messages, Medication chart and clinical report links preserve client context.

**Verify before continuing:** Check one allergy alert, all three contact/support panels and a medicine deep link. Tab through the actions and compare the mobile stacking order with the source CSS.

## Appendix

UI map: / → overview; /people?q=… → directory; /people/[clientId] → profile; /medication-charts?client=… → editable GP chart; /reports?client=… → instruction list; /messages?client=… → care communication. These are application routes, not six separate APIs.
