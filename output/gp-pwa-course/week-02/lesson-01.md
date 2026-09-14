# GP User Module — Implementation Lab

**Week 2 of 8 · GP home, overview cards and the patient directory**

**Objective:** Reproduce the complete home experience and connect its cards, patient selector and search to the correct GP routes.

## Setup / Prerequisites

Complete Week 1. Estimated 4–6 hours. Keep the original screen visible as your reference; all colours, spacing and component classes remain source-derived.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/components/app-shell.tsx`, `frontend/app/page.tsx`, `frontend/app/people/page.tsx`, `frontend/data/demo/index.ts`, `frontend/data/demo/types.ts`.

## Laboratory Instructions

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

## Appendix

Week 2 extensions: components/app-shell.tsx and app/page.tsx only. Preserve the rest of the source. A ready-made comparison checkpoint is created with New-CourseWorkspace.ps1 -Week 2 and a new destination. It is a full reference snapshot, not evidence that you implemented the lesson yourself.
