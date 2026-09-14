# GP User Module — Implementation Lab

**Week 5 of 8 · Editable prescriptions, schedules, signatures and history**

**Objective:** Rebuild the source GP chart interaction with truthful save feedback, versioned writes and preserved administration history.

## Setup / Prerequisites

Complete Week 4. Estimated 6–8 hours; split into two sessions. Keep original GpMedicationTable and PrescriberSignature files as complete references.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/hooks/use-prescriber-chart.ts`, `frontend/components/gp-medication-table.tsx`, `frontend/components/prescriber-signature.tsx`, `frontend/lib/prescriber-chart.ts`.

## Laboratory Instructions

### (3) Reconstruct PRN sections and immutable history

Finish the regular/PRN tables, six scheduling slots and history rendering. Distinguish validation from clinical decision support.

**Source:** `source/frontend/lib/prescriber-chart.ts`, lines 36–100. Verbatim chunk; assemble with the other chunks in the accompanying complete file.

```typescript
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function validatePrescription(value: unknown): asserts value is Prescription {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid prescription.');
  const p = value as Prescription;
  if (Object.keys(p).some((key) => ![...prescriptionFields, 'prescriber_signature', 'refer_prn', 'times'].includes(key))) throw new Error('Only prescriber fields can be edited.');
  for (const field of prescriptionFields) {
    if (typeof p[field] !== 'string' || p[field].length > (field === 'instructions' ? 2000 : 200)) throw new Error('Invalid prescriber field or text length.');
  }
  if (typeof p.refer_prn !== 'boolean') throw new Error('Refer PRN must be ticked or unticked.');
  if (!Array.isArray(p.times) || p.times.length !== 6 || p.times.some((time) => typeof time !== 'string' || (time !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)))) throw new Error('Enter up to six valid administration times.');
  const times = p.times.filter(Boolean);
  if (new Set(times).size !== times.length) throw new Error('Administration times must be unique.');
  if (!p.name.trim()) throw new Error('Enter a regular medicine name.');
  if (p.start_date && !validDate(p.start_date)) throw new Error('Enter a valid start date.');
  if (p.end_date && !validDate(p.end_date)) throw new Error('Enter a valid stop date.');
  if (p.end_date && (!p.start_date || p.end_date < p.start_date)) throw new Error('Stop date must be on or after the start date.');
  for (const field of ['prescriber_signature'] as const) {
    const signature = p[field];
    if (signature === null) continue;
    validateStrokes(signature?.strokes);
    if (!p.dose.trim() || !p.route.trim() || !p.frequency.trim() || !p.start_date) throw new Error('Complete medicine, dose, route, frequency and start date before signing.');
  }
}

// A signature authorises the values that were visible when it was drawn.
export function amendPrescription<K extends PrescriptionField | 'refer_prn' | 'times'>(p: Prescription, field: K, value: Prescription[K]): Prescription {
  if (p[field] === value) return p;
  return { ...p, [field]: value, prescriber_signature: null };
}

export function mergeMedication(medication: Medication, p?: Prescription): Medication {
  if (!p) return medication;
  return { ...medication, name: p.name, dose: p.dose, route: p.route, schedule: p.frequency, prescribedDate: p.start_date, times: p.times.filter(Boolean), instructions: p.instructions, maxDailyDose: p.max_dose };
}

export function validateStrokes(strokes: unknown): asserts strokes is number[][][] {
  if (!Array.isArray(strokes) || strokes.length < 1 || strokes.length > 100) throw new Error('Draw a signature in the box.');
  let points = 0;
  for (const stroke of strokes) {
    if (!Array.isArray(stroke) || stroke.length < 2) throw new Error('Draw a signature in the box.');
    points += stroke.length;
    for (const point of stroke) {
      if (!Array.isArray(point) || point.length !== 2 || !point.every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1)) throw new Error('Invalid signature drawing.');
    }
    if (!stroke.some((point) => point[0] !== stroke[0][0] || point[1] !== stroke[0][1])) throw new Error('Draw a signature in the box.');
  }
  if (points > 12000) throw new Error('Signature is too large. Clear the box and try again.');
}

export function prescriptionChanged(before: Prescription, next: Prescription) {
  return prescriptionFields.some((field) => next[field] !== before[field]) || next.refer_prn !== before.refer_prn || JSON.stringify(next.times) !== JSON.stringify(before.times);
}

export function administrationOrderReady(p: Prescription) {
  return Boolean(p.name.trim() && p.dose.trim() && p.route.trim() && p.frequency.trim() && validDate(p.start_date));
}

export function validateAdministrationSignature(strokes: unknown, initials?: unknown) {
  if (initials !== undefined) {
    if (typeof initials !== 'string' || !/^[\p{L}]{1,6}$/u.test(initials.trim())) throw new Error('Enter 1–6 letters for your initials.');
    if (!Array.isArray(strokes) || strokes.length !== 0) throw new Error('Choose either drawn or typed initials.');
    return { strokes: [] as number[][][], initials: initials.trim().toLocaleUpperCase('en-AU') };
  }
```

**What the code does:** Read the remaining source functions and the second half of GpMedicationTable. Dates must be real YYYY-MM-DD dates; times are unique 24-hour values; end date cannot precede start. PRN uses refer_prn and max_dose text. The chart retains administrations associated with prior schedule cells rather than reassigning them to new times. Blank regular/prn slots use the exact server-supported IDs.

**Integration contract:** The server accepts fixture medicine IDs or permitted regular-slot-N/prn-slot-N identifiers, with slot range and occupancy checks. Administration records point at orderVersion and cellKey.

**Why this design:** Historical events need stable identity even when an order’s schedule changes. Schedules are structured enough for display/validation but do not implement medical dose calculation.

**What breaks if miswired:** This repo has no drug interaction engine, dosage recommendation service or automatic clinical alert logic. max_dose is text; do not describe it as an enforced dose calculator. End dates are not a delete operation.

**General pattern:** Stable event identity; domain validation versus decision support.

**Expected result:** Regular and PRN charts retain source layout; GP edits prescribing fields while history remains read-only.

**Verify before continuing:** Complete Test-GpWorkflow, test duplicate/invalid times and date ordering, and review an old administration after a schedule edit. Use Integration-Reference.md steps (8)–(11) for further line-by-line reasoning.

## Appendix

State labels must describe actual acknowledgement. Prescribing PATCH has no request-ID idempotency; Week 6’s communication endpoint introduces a separate retry pattern for comparison. Shared carer code is retained solely because the same chart renders administration history. The GP course does not teach performing a carer round.
