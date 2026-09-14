# GP User Module — Implementation Lab

**Week 3 of 8 · Patient profiles, chart navigation and UI state boundaries**

**Objective:** Build the patient detail journey and understand which data comes from fixtures, route parameters, React state and the chart API.

## Setup / Prerequisites

Complete Week 2. Estimated 4–6 hours. Use James Miller in Banksia House for consistent examples.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/app/people/[clientId]/page.tsx`, `frontend/app/medication-charts/page.tsx`, `frontend/lib/prescriber-chart.ts`, `frontend/hooks/use-prescriber-chart.ts`.

## Laboratory Instructions

### (0) Resolve a profile route and its metadata

Connect a directory link to a detailed patient page. Start with route resolution before adding the profile panels.

**Source:** `source/frontend/app/people/[clientId]/page.tsx`, lines 1–26. Verbatim chunk; assemble with the other chunks in the accompanying complete file.

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Calendar, FileText, MapPin, MessageCircle, Pill, ShieldCheck, Stethoscope } from 'lucide-react';

import { AppShell } from '@/components/app-shell';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { getClient } from '@/data/demo';

type Props = { params: Promise<{ clientId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clientId } = await params;
  const { client, home } = getClient(clientId);
  return {
    title: `${client.name} | ADAC4CARE`,
    description: `Medication profile for ${client.name} at ${home.name}.`,
    openGraph: { title: `${client.name} | ADAC4CARE`, description: `Medication profile for ${client.name} at ${home.name}.`, images: [] },
    twitter: { card: 'summary', title: `${client.name} | ADAC4CARE`, description: `Medication profile for ${client.name} at ${home.name}.`, images: [] },
  };
}

export default async function ClientProfilePage({ params }: Props) {
  const { clientId } = await params;
  const { client, home } = getClient(clientId);
  const clinicalReports = client.reports.filter((report) => report.authorRole === 'RN' || report.authorRole === 'GP');
```

**What the code does:** Create the literal directory app/people/[clientId]. In PowerShell use -LiteralPath when inspecting paths with square brackets. Vinext passes params as a Promise here, so the server page awaits it. The metadata function uses the same lookup as the page. getClient currently falls back to the first fixture for an unknown identifier; that is existing demo behaviour, not a valid production not-found policy.

**Integration contract:** The URL path supplies clientId. getClient returns {client, home}. This is a server-rendered fixture read and makes no Django request.

**Why this design:** The profile needs home context as well as client details because a bookmarked URL can be opened without first visiting People.

**What breaks if miswired:** Assuming every unknown ID is a legitimate patient would display the fallback patient under an invalid URL. A future API implementation should return a real 404 and enforce tenant membership, rather than preserve this fallback.

**General pattern:** Resource routing; server-side data resolution.

**Expected result:** A valid profile path renders the selected client name and metadata.

**Verify before continuing:** Open /people/james-miller directly, then try a deliberately invalid ID. Record the current fallback limitation so you do not mistake it for protected clinical routing.

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

### (2) Recreate chart route orchestration

Build the page controller that turns home, role and client into the correct chart. Keep this orchestration separate from individual editable cells.

**Source:** `source/frontend/app/medication-charts/page.tsx`, lines 1–65. Verbatim chunk; assemble with the other chunks in the accompanying complete file.

```tsx
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
```

**What the code does:** Use the complete companion app/medication-charts/page.tsx to finish this page after studying the opening chunk. Follow its Content component, usePrescriberChart invocation and keyed wrapper. The source assembles fixture medicines and persisted regular-slot/prn-slot records before passing sections to GpMedicationTable. GP and carer share the visual chart but receive different capabilities. window.print is the actual print action.

**Integration contract:** Inputs to the hook are home ID, client ID and role. Its output includes records, administrations, loaded/error state, actions and capabilities. The component key changes with patient/home/role context.

**Why this design:** Keyed remounting clears old drafts when the selected clinical context changes. Shared chart presentation lets a GP read the same administration history without acquiring the ability to sign it.

**What breaks if miswired:** Omitting context from the key can leave a previous client’s draft in a newly selected client’s page. Inferring GP permission from a button’s visibility bypasses server capability checks.

**General pattern:** Container/presentation split; keyed component lifetime; capability-driven UI.

**Expected result:** GP sees the source regular and PRN chart sections, populated fixture orders, blank prescribing slots and read-only administration cells.

**Verify before continuing:** Change client, home and role in turn. Confirm the chart header and medicines match each selection. Use Print preview and cancel without saving a patient document.

### (3) Map the four kinds of state before writing API code

Give each value an owner. This prevents a saved prescription, an unsaved draft and a role preference from being treated as interchangeable.

**Source:** `source/frontend/lib/prescriber-chart.ts`, lines 1–33. Verbatim chunk; assemble with the other chunks in the accompanying complete file.

```typescript
import type { Medication } from '../data/demo/types';

export type Signature = { strokes: number[][][]; initials?: string; signedAt: string; signedBy: string };
export type Prescription = {
  name: string;
  dose: string;
  route: string;
  frequency: string;
  start_date: string;
  end_date: string;
  refer_prn: boolean;
  times: string[];
  instructions: string;
  max_dose: string;
  prescriber_signature: Signature | null;
};
export type ChartRecord = { medicationId: string; version: number; prescription: Prescription };
export type AdministrationRecord = { medicationId: string; cellKey: string; orderVersion: number; date: string; time: string; qty: string; signature: Signature };
export type AdministrationInput = { medicationId: string; cellKey: string; orderVersion: number; strokes: number[][][]; initials?: string; confirmed: boolean };
export type ChartResponse = { records: ChartRecord[]; administrations: AdministrationRecord[]; canPrescribe: boolean; canAdminister: boolean };
export const prescriptionFields = ['name', 'dose', 'route', 'frequency', 'start_date', 'end_date', 'instructions', 'max_dose'] as const;
export type PrescriptionField = (typeof prescriptionFields)[number];
export type SignatureField = 'prescriber_signature';

export function initialPrescription(medication?: Medication): Prescription {
  return {
    name: medication?.name ?? '', dose: medication?.dose ?? '', route: medication?.route ?? '',
    frequency: medication?.schedule ?? '', start_date: medication?.prescribedDate ?? '', end_date: '',
    refer_prn: medication?.type === 'prn', times: Array.from({ length: 6 }, (_, index) => medication?.times[index] ?? ''),
    instructions: medication?.instructions ?? '', max_dose: medication?.maxDailyDose ?? '',
    prescriber_signature: null,
  };
}
```

**Source:** `source/frontend/hooks/use-prescriber-chart.ts`, lines 7–18. Verbatim chunk; assemble with the other chunks in the accompanying complete file.

```typescript
export function usePrescriberChart(home: string, client: string, role: UserRole) {
  const [records, setRecords] = useState<Record<string, ChartRecord>>({});
  const [loaded, setLoaded] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [canSign, setCanSign] = useState(false);
  const [administrations, setAdministrations] = useState<AdministrationRecord[]>([]);
  const [error, setError] = useState('');
  const recordsRef = useRef(records);
  const saving = useRef(false);
  const endpoint = `/api/prescriber-chart?home=${encodeURIComponent(home)}&client=${encodeURIComponent(client)}`;
  const reload = useCallback(async () => {
    if (saving.current) return;
```

**What the code does:** Draw four boxes in your notes: route state (q/client), shared preference state (role/home), server state (record/version/capabilities), and row draft state. ChartRecord wraps Prescription with medicationId and version. A fixture medicine starts with initialPrescription; no stored signature is invented. Six time slots are maintained even when some are blank.

**Integration contract:** GET returns arrays of ChartRecord and AdministrationRecord. PATCH later submits the entire prescription plus the expected version. The frontend map indexes records by medicationId for quick row lookup.

**Why this design:** A DTO describes wire data; it is not automatically a database entity. Separating draft from acknowledged record allows the UI to display Unsaved/Saving/Saved honestly.

**What breaks if miswired:** Writing every keystroke into the authoritative map makes failed requests look persisted. Putting clinical objects in localStorage creates a separate unversioned cache. Flattening server capabilities into role strings loses the distinction between selected and authorised role.

**General pattern:** State ownership; DTO boundary; acknowledged server state versus editable draft.

**Expected result:** You can trace each visible value to its owner and name the event that changes it.

**Verify before continuing:** Before Week 4, answer: which state survives a reload; which survives a patient change; which can only the server assign; which must never be copied into a new prescription signature?

## Appendix

UI map: / → overview; /people?q=… → directory; /people/[clientId] → profile; /medication-charts?client=… → editable GP chart; /reports?client=… → instruction list; /messages?client=… → care communication. These are application routes, not six separate APIs.

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
