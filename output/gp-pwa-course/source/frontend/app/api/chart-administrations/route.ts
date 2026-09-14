import { chartDatabase, gpEmails, carerEmails } from '@/lib/chart-db';
import { chartAccess } from '@/lib/chart-access';
import { chartContext, chartJson as json } from '@/lib/chart-server';
import { initialPrescription, validDate, administrationOrderReady, validateAdministrationSignature, type Prescription, type AdministrationRecord } from '@/lib/prescriber-chart';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = chartAccess(request.headers, gpEmails(), import.meta.env.DEV, carerEmails());
  if (!user.canSign) return json({ error: 'Only an authorised support worker / carer can sign administration cells.' }, 403);
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Invalid request origin.' }, 403);
  const ctx = chartContext(new URL(request.url));
  if (!ctx) return json({ error: 'Client not found.' }, 404);
  let body;
  let signing;
  try {
    const raw = await request.text();
    if (raw.length > 500000) return json({ error: 'Signature is too large.' }, 413);
    body = JSON.parse(raw);
    if (!body || Object.keys(body).some((key) => !['medicationId', 'cellKey', 'orderVersion', 'strokes', 'initials', 'confirmed'].includes(key))) throw new Error('Carers may only sign the selected administration cell.');
    if (typeof body.medicationId !== 'string' || typeof body.cellKey !== 'string' || !Number.isInteger(body.orderVersion) || body.orderVersion < 0) throw new Error('Invalid administration cell.');
    if (body.confirmed !== true) throw new Error('Confirm administration and safety checks before signing.');
    signing = validateAdministrationSignature(body.strokes, body.initials);
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Invalid administration.' }, 400); }
  try {
    const db = chartDatabase();
    const medication = ctx.client.medications.find((item) => item.id === body.medicationId);
    const type = medication?.type ?? (body.medicationId.startsWith('prn-slot-') ? 'prn' : 'routine');
    const previous = await db.prepare('SELECT version, prescription FROM prescription_revisions WHERE home_id = ? AND client_id = ? AND medication_id = ? ORDER BY version DESC LIMIT 1')
      .bind(ctx.home.id, ctx.client.id, body.medicationId).first<{ version: number; prescription: string }>();
    if (!previous && !medication) return json({ error: 'Select a populated medication order.' }, 404);
    if (medication?.status === 'ceased') return json({ error: 'This medication order has ceased.' }, 409);
    const prescription: Prescription = { ...initialPrescription(medication), ...(previous ? JSON.parse(previous.prescription) : {}) };
    const orderVersion = previous?.version ?? 0;
    if (orderVersion !== body.orderVersion) return json({ error: 'The prescription changed. Refresh and check the current order before signing.' }, 409);
    if (!administrationOrderReady(prescription)) return json({ error: 'The medicine, dose, route, frequency and start date must be present before administration is recorded.' }, 409);
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
    const part = (name: string) => parts.find((item) => item.type === name)!.value;
    const today = `${part('year')}-${part('month')}-${part('day')}`;
    let date: string, time: string;
    if (type === 'routine') {
      const match = /^routine:(\d{4}-\d{2}-\d{2}):([0-2]\d:[0-5]\d)$/.exec(body.cellKey);
      if (!match || !validDate(match[1]) || !prescription.times.includes(match[2])) return json({ error: 'Choose a cell with a GP-prescribed administration time.' }, 400);
      [, date, time] = match;
      if (medication?.administrations.some((row) => row.date === date && row.time === time && row.initial)) return json({ error: 'This cell already contains an administration record.' }, 409);
    } else {
      const match = /^prn:(\d{4}-\d{2}):(\d{1,2})$/.exec(body.cellKey);
      if (!match || match[1] !== today.slice(0, 7) || Number(match[2]) > 23 || String(Number(match[2])) !== match[2]) return json({ error: 'Choose an empty PRN initial cell in the current month.' }, 400);
      const seedCount = medication?.administrations.filter((row) => row.date.startsWith(match[1])).length ?? 0;
      if (Number(match[2]) < seedCount) return json({ error: 'This cell already contains an administration record.' }, 409);
      date = today; time = `${part('hour')}:${part('minute')}`;
    }
    if (date > today || date < prescription.start_date || (prescription.end_date && date > prescription.end_date)) return json({ error: 'The selected date is outside the current prescription period or is in the future.' }, 400);
    const savedAt = now.toISOString();
    const record: AdministrationRecord = {
      medicationId: body.medicationId, cellKey: body.cellKey, orderVersion,
      date, time, qty: medication?.quantity || prescription.dose,
      signature: { ...signing, signedAt: savedAt, signedBy: user.actor },
    };
    const result = await db.prepare(`INSERT INTO administration_signatures (home_id, client_id, medication_id, cell_key, order_version, date, time, qty, signature, actor, saved_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE COALESCE((SELECT MAX(version) FROM prescription_revisions WHERE home_id = ? AND client_id = ? AND medication_id = ?), 0) = ?
      ON CONFLICT (home_id, client_id, medication_id, cell_key) DO NOTHING`)
      .bind(ctx.home.id, ctx.client.id, record.medicationId, record.cellKey, record.orderVersion, date, time, record.qty, JSON.stringify(record.signature), user.actor, savedAt, ctx.home.id, ctx.client.id, record.medicationId, orderVersion).run();
    if (!result.meta.changes) {
      const existing = await db.prepare('SELECT signature, date, time, qty, order_version FROM administration_signatures WHERE home_id = ? AND client_id = ? AND medication_id = ? AND cell_key = ?')
        .bind(ctx.home.id, ctx.client.id, record.medicationId, record.cellKey).first<{ signature: string; date: string; time: string; qty: string; order_version: number }>();
      if (existing) {
        const signature = JSON.parse(existing.signature);
        if (signature.signedBy === user.actor && signature.initials === signing.initials && JSON.stringify(signature.strokes) === JSON.stringify(signing.strokes)) return json({ ...record, date: existing.date, time: existing.time, qty: existing.qty, orderVersion: existing.order_version, signature });
      }
      return json({ error: 'This cell was signed or the prescription changed in another session. Refresh the chart.' }, 409);
    }
    return json(record, 201);
  } catch { return json({ error: 'The signature was not saved. Please retry.' }, 503); }
}
