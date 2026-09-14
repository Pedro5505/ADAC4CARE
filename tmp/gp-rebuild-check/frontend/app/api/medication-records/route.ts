import { recordsDb } from '@/lib/records-db';
import { validateRecord } from '@/lib/medication-record';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status=200) => Response.json(body, {status, headers:{'Cache-Control':'no-store'}});
function identity(request: Request) {
  const id = request.headers.get('oai-authenticated-user-id');
  const email = request.headers.get('oai-authenticated-user-email');
  return id && email ? {id,email} : null;
}
export async function GET(request: Request) {
  const user = identity(request);
  if (!user) return json({error:'Sign in to access medication records.'},401);
  try {
    const result = await recordsDb().prepare('SELECT id, author_email, created_at, payload FROM medication_records ORDER BY created_at DESC LIMIT 200').all<{id:string;author_email:string;created_at:string;payload:string}>();
    return json({user, records:result.results.map(r => ({...JSON.parse(r.payload), signedAt:r.created_at, authorEmail:r.author_email}))});
  } catch { return json({error:'Records could not be loaded. Please retry.'},503); }
}
export async function POST(request: Request) {
  const user = identity(request);
  if (!user) return json({error:'Sign in before saving.'},401);
  if (request.headers.get('origin') !== new URL(request.url).origin || !request.headers.get('content-type')?.startsWith('application/json')) return json({error:'Invalid request origin.'},403);
  if (Number(request.headers.get('content-length') || 0) > 300000) return json({error:'Record too large.'},413);
  let record;
  try {
    const body = await request.text();
    if (body.length > 300000) return json({error:'Record too large.'},413);
    record = validateRecord(JSON.parse(body));
  } catch (error) { return json({error:error instanceof Error ? error.message : 'Invalid record.'},400); }
  try {
    const payload = JSON.stringify(record);
    const db = recordsDb();
    await db.prepare('INSERT INTO medication_records (id,author_id,author_email,created_at,payload) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(record.id,user.id,user.email,new Date().toISOString(),payload).run();
    const saved = await db.prepare('SELECT author_id,created_at,payload FROM medication_records WHERE id = ?').bind(record.id).first<{author_id:string;created_at:string;payload:string}>();
    if (!saved || saved.author_id !== user.id || saved.payload !== payload) return json({error:'This reference is already signed. Start a new record.'},409);
    return json({id:record.id,signedAt:saved.created_at},201);
  } catch { return json({error:'The record was not confirmed saved. Keep this page open and retry; your signature is retained.'},503); }
}
