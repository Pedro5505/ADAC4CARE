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

export function validDate(value: string) {
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
  validateStrokes(strokes);
  return { strokes };
}
