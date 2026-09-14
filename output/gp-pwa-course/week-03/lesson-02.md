# GP User Module — Implementation Lab

**Week 3 of 8 · Patient profiles, chart navigation and UI state boundaries**

**Objective:** Build the patient detail journey and understand which data comes from fixtures, route parameters, React state and the chart API.

## Setup / Prerequisites

Complete Week 2. Estimated 4–6 hours. Use James Miller in Banksia House for consistent examples.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/app/people/[clientId]/page.tsx`, `frontend/app/medication-charts/page.tsx`, `frontend/lib/prescriber-chart.ts`, `frontend/hooks/use-prescriber-chart.ts`.

## Laboratory Instructions

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

## Appendix

UI map: / → overview; /people?q=… → directory; /people/[clientId] → profile; /medication-charts?client=… → editable GP chart; /reports?client=… → instruction list; /messages?client=… → care communication. These are application routes, not six separate APIs.
