# GP User Module — Implementation Lab

**Week 3 of 8 · Patient profiles, chart navigation and UI state boundaries**

**Objective:** Build the patient detail journey and understand which data comes from fixtures, route parameters, React state and the chart API.

## Setup / Prerequisites

Complete Week 2. Estimated 4–6 hours. Use James Miller in Banksia House for consistent examples.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/app/people/[clientId]/page.tsx`, `frontend/app/medication-charts/page.tsx`, `frontend/lib/prescriber-chart.ts`, `frontend/hooks/use-prescriber-chart.ts`.

## Laboratory Instructions

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
