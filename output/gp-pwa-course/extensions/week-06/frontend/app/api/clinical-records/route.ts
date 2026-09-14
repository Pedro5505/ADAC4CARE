import { groupHomes } from '@/data/demo';
import { chartAccess } from '@/lib/chart-access';
import { chartDatabase, gpEmails } from '@/lib/chart-db';
import { chartJson as json } from '@/lib/chart-server';
import { validCommunication, type Communication } from '@/lib/clinical-records';

export const dynamic = 'force-dynamic';
const access = (r: Request) => chartAccess(r.headers, gpEmails(), import.meta.env.DEV);
const homeFor = (r: Request) => groupHomes.find(h => h.id === new URL(r.url).searchParams.get('home'));

export async function GET(request: Request) {
  if (!access(request).authenticated) return json({ error: 'Sign in to read records.' }, 401);
  const home = homeFor(request);
  if (!home) return json({ error: 'Home not found.' }, 404);
  try {
    const { results } = await chartDatabase().prepare('SELECT id, client_id, kind, record_json FROM gp_communications WHERE home_id = ? ORDER BY created_at DESC, id DESC').bind(home.id).all<{ id: string; client_id: string; kind: 'report' | 'message'; record_json: string }>();
    const records: Communication[] = results.map(r => ({ id: r.id, clientId: r.client_id, kind: r.kind, record: JSON.parse(r.record_json) }));
    return json({ records, canCreate: access(request).canPrescribe });
  } catch { return json({ error: 'Records are unavailable. Check the course migration and retry.' }, 503); }
}

export async function POST(request: Request) {
  const user = access(request);
  if (!user.canWrite) return json({ error: 'GP permission is required.' }, 403);
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Origin mismatch.' }, 403);
  const home = homeFor(request);
  if (!home) return json({ error: 'Home not found.' }, 404);
  const raw = await request.text();
  if (raw.length > 12000) return json({ error: 'Record too large.' }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  if (!validCommunication(body)) return json({ error: 'Complete the title, details and required report action using supported values.' }, 400);
  if (!home.clients.some(c => c.id === body.clientId)) return json({ error: 'Client not found in this home.' }, 404);
  const input = body;
  const canonical = JSON.stringify([input.clientId, input.kind, input.category, input.title, input.body, input.action]);
  const date = new Date().toISOString();
  const common = { id: input.id, title: input.title.trim(), author: user.actor, date };
  const record = input.kind === 'report'
    ? { ...common, category: input.category, authorRole: 'GP', summary: input.body, action: input.action, acknowledged: false }
    : { ...common, type: input.category, role: 'GP', body: input.body + (input.action ? '\nAction: ' + input.action : ''), priority: input.category === 'incident' ? 'important' : 'routine', pinned: false };
  try {
    const db = chartDatabase();
    const result = await db.prepare('INSERT OR IGNORE INTO gp_communications (id, home_id, client_id, kind, request_json, record_json, actor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(input.id, home.id, input.clientId, input.kind, canonical, JSON.stringify(record), user.actor, date).run();
    const saved = await db.prepare('SELECT home_id, actor, request_json, record_json FROM gp_communications WHERE id = ?').bind(input.id).first<{ home_id: string; actor: string; request_json: string; record_json: string }>();
    if (!saved || saved.home_id !== home.id || saved.actor !== user.actor || saved.request_json !== canonical) return json({ error: 'This request ID was already used with different content. Start a new record.' }, 409);
    return json({ item: { id: input.id, clientId: input.clientId, kind: input.kind, record: JSON.parse(saved.record_json) } }, result.meta.changes ? 201 : 200);
  } catch { return json({ error: 'Save could not be confirmed. Retry the unchanged form.' }, 503); }
}
