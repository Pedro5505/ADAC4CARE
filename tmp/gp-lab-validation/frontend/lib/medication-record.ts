export const auditQuestions = [
  'Is medication storage secure and appropriate?',
  'Does medication match the current medication chart?',
  'Have medication labels and expiry dates been checked?',
  'Are medication quantities/stock checked and correct?',
  'Are MAR/medication signing records complete?',
  'Are PRN medication records complete (where applicable)?',
  'Are any discrepancies or issues identified?',
] as const;
export type Point = [number, number];
export type MedicationRecord = {
  id: string; kind: 'round' | 'audit'; client: string; clientId: string;
  occurredAt: string; round: string; staffName: string; notes: string;
  medications: { name: string; dose: string; route: string; outcome: string; reason: string }[];
  answers: string[]; signature: Point[][]; confirmed: boolean;
};
export function validateRecord(value: unknown): MedicationRecord {
  if (!value || typeof value !== 'object') throw new Error('A record is required.');
  const r = value as MedicationRecord;
  const str = (s: unknown, max = 200) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;
  if (!str(r.id, 36) || !/^[0-9a-f-]{36}$/i.test(r.id)) throw new Error('Invalid record reference.');
  if (!['round', 'audit'].includes(r.kind)) throw new Error('Select a record type.');
  if (!str(r.client) || !str(r.clientId) || !str(r.staffName)) throw new Error('Client name, client identifier and staff full name are required.');
  if (!str(r.occurredAt, 40) || !Number.isFinite(Date.parse(r.occurredAt)) || Date.parse(r.occurredAt) > Date.now() + 60000) throw new Error('Enter a valid date and time, not in the future.');
  if (!str(r.round, 100)) throw new Error('A round or audit reference is required.');
  if (typeof r.notes !== 'string' || r.notes.length > 4000 || r.confirmed !== true) throw new Error('Confirm the record before signing.');
  if (!Array.isArray(r.signature) || r.signature.length < 1 || r.signature.length > 100) throw new Error('Draw your signature.');
  let points = 0;
  for (const stroke of r.signature) {
    if (!Array.isArray(stroke) || !stroke.length) throw new Error('Invalid signature.');
    for (const p of stroke) {
      if (!Array.isArray(p) || p.length !== 2 || !p.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1)) throw new Error('Invalid signature.');
      points++;
    }
  }
  if (points < 5 || points > 12000) throw new Error('Draw a complete signature (or clear and try again).');
  const all = r.signature.flat();
  if (Math.max(...all.map(p => p[0])) - Math.min(...all.map(p => p[0])) < .02) throw new Error('Draw a complete signature.');
  if (r.kind === 'round') {
    if (!Array.isArray(r.medications) || !r.medications.length || r.medications.length > 40) throw new Error('Record at least one medication.');
    for (const m of r.medications) {
      if (!m || !str(m.name) || !str(m.dose) || !str(m.route, 100) || !['Administered', 'Refused', 'Withheld', 'Not available', 'Other / not given'].includes(m.outcome)) throw new Error('Complete every medication and its outcome.');
      if (typeof m.reason !== 'string' || m.reason.length > 1000 || (m.outcome !== 'Administered' && !m.reason.trim())) throw new Error('Record the reason and actions for each medication not given.');
    }
    r.answers = [];
  } else {
    if (!Array.isArray(r.answers) || r.answers.length !== auditQuestions.length || !r.answers.every(a => ['Yes', 'No', 'N/A'].includes(a))) throw new Error('Answer every audit question.');
    if (r.answers[6] === 'N/A') throw new Error('Confirm whether issues were identified.');
    if ((r.answers.slice(0,6).includes('No') || r.answers[6] === 'Yes') && !r.notes.trim()) throw new Error('Describe the issues and actions taken.');
    r.medications = [];
  }
  return { id:r.id, kind:r.kind, client:r.client.trim(), clientId:r.clientId.trim(), occurredAt:new Date(r.occurredAt).toISOString(), round:r.round.trim(), staffName:r.staffName.trim(), notes:r.notes.trim(), medications:r.medications, answers:r.answers, signature:r.signature, confirmed:true };
}
