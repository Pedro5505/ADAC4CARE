import { chartDatabase, gpEmails, carerEmails } from '@/lib/chart-db';
import { chartAccess } from '@/lib/chart-access';
import { initialPrescription, prescriptionChanged, validatePrescription, type Prescription } from '@/lib/prescriber-chart';
import { chartContext as context, chartJson as json } from '@/lib/chart-server';

export const dynamic = 'force-dynamic';
const access = (request: Request) => chartAccess(request.headers, gpEmails(), import.meta.env.DEV, carerEmails());

export async function GET(request: Request) {
  const user = access(request);
  if (!user.authenticated) return json({ error: 'Sign in to view this medication chart.' }, 401);
  const ctx = context(new URL(request.url));
  if (!ctx) return json({ error: 'Client not found.' }, 404);
  try {
    const { results } = await chartDatabase().prepare(`SELECT medication_id, version, prescription FROM prescription_revisions
      WHERE home_id = ? AND client_id = ? AND (medication_id, version) IN
      (SELECT medication_id, MAX(version) FROM prescription_revisions WHERE home_id = ? AND client_id = ? GROUP BY medication_id)`)
      .bind(ctx.home.id, ctx.client.id, ctx.home.id, ctx.client.id).all<{ medication_id: string; version: number; prescription: string }>();
    const administrationResult = await chartDatabase().prepare('SELECT medication_id, cell_key, order_version, date, time, qty, signature FROM administration_signatures WHERE home_id = ? AND client_id = ?')
      .bind(ctx.home.id, ctx.client.id).all<{ medication_id: string; cell_key: string; order_version: number; date: string; time: string; qty: string; signature: string }>();
    return json({ canPrescribe: user.canPrescribe, canAdminister: user.canAdminister,
      records: results.map((r) => ({ medicationId: r.medication_id, version: r.version, prescription: { ...initialPrescription(ctx.client.medications.find((m) => m.id === r.medication_id)), ...JSON.parse(r.prescription) } })),
      administrations: administrationResult.results.map((r) => ({ medicationId: r.medication_id, cellKey: r.cell_key, orderVersion: r.order_version, date: r.date, time: r.time, qty: r.qty, signature: JSON.parse(r.signature) })),
    });
  } catch {
    return json({ error: 'The chart could not be loaded. Please retry.' }, 503);
  }
}

export async function PATCH(request: Request) {
  const user = access(request);
  if (!user.canWrite) return json({ error: 'Only an authorised GP can edit the prescriber section.' }, 403);
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return json({ error: 'Invalid request origin.' }, 403);
  const ctx = context(new URL(request.url));
  if (!ctx) return json({ error: 'Client not found.' }, 404);
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 500_000) return json({ error: 'Signature is too large.' }, 413);
    body = JSON.parse(raw);
    if (!body || Object.keys(body).some((key) => !['medicationId', 'version', 'prescription'].includes(key))) throw new Error('Only prescriber fields can be edited.');
    if (typeof body.medicationId !== 'string' || !Number.isInteger(body.version) || body.version < 0) throw new Error('Invalid chart row.');
    validatePrescription(body.prescription);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Invalid prescription.' }, 400);
  }
  const medication = ctx.client.medications.find((item) => item.id === body.medicationId);
  const newSlot = /^(regular|prn)-slot-[1-8]$/.test(body.medicationId);
  if (!medication && !newSlot) return json({ error: 'Medicine row not found.' }, 404);
  if (newSlot) {
    const type = body.medicationId.startsWith('prn-') ? 'prn' : 'routine';
    const occupied = ctx.client.medications.filter((item) => item.type === type).length;
    if (Number(body.medicationId.slice(-1)) <= occupied) return json({ error: 'This chart row already belongs to an existing medicine.' }, 400);
  }
  try {
    const db = chartDatabase();
    const previous = await db.prepare('SELECT version, prescription FROM prescription_revisions WHERE home_id = ? AND client_id = ? AND medication_id = ? ORDER BY version DESC LIMIT 1')
      .bind(ctx.home.id, ctx.client.id, body.medicationId).first<{ version: number; prescription: string }>();
    if ((previous?.version ?? 0) !== body.version) return json({ error: 'This row changed in another session. Reload the chart before editing again.' }, 409);
    const before: Prescription = { ...initialPrescription(medication), ...(previous ? JSON.parse(previous.prescription) : {}) };
    const next = body.prescription as Prescription;
    const changed = prescriptionChanged(before, next);
    const now = new Date().toISOString();
    for (const field of ['prescriber_signature'] as const) {
      if (next[field]) {
        const sameDrawing = JSON.stringify(next[field]?.strokes) === JSON.stringify(before[field]?.strokes);
        // An old drawing may never be carried onto changed prescription details.
        if (changed && sameDrawing) return json({ error: 'Prescription details changed. Please sign again.' }, 400);
        next[field] = !changed && sameDrawing ? before[field] : { strokes: next[field]!.strokes, signedAt: now, signedBy: user.actor };
      }
    }
    const result = await db.prepare(`INSERT INTO prescription_revisions (home_id, client_id, medication_id, version, prescription, actor, saved_at)
      SELECT ?, ?, ?, ?, ?, ?, ? WHERE COALESCE((SELECT MAX(version) FROM prescription_revisions WHERE home_id = ? AND client_id = ? AND medication_id = ?), 0) = ?`)
      .bind(ctx.home.id, ctx.client.id, body.medicationId, body.version + 1, JSON.stringify(next), user.actor, now, ctx.home.id, ctx.client.id, body.medicationId, body.version).run();
    if (!result.meta.changes) return json({ error: 'This row changed in another session. Reload the chart before editing again.' }, 409);
    return json({ medicationId: body.medicationId, version: body.version + 1, prescription: next });
  } catch {
    return json({ error: 'Your changes were not saved. Please retry.' }, 503);
  }
}
