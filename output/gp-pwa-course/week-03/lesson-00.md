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

## Appendix

UI map: / → overview; /people?q=… → directory; /people/[clientId] → profile; /medication-charts?client=… → editable GP chart; /reports?client=… → instruction list; /messages?client=… → care communication. These are application routes, not six separate APIs.
