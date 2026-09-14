import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';

// Exercise both production route handlers and their actual SQL in isolated storage.
const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const compile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync('drizzle/0001_short_random.sql', 'utf8'));
let beforeInsert;
globalThis.chartTestDb = { prepare(sql) { return { bind(...args) { return {
  async first() { return db.prepare(sql).get(...args); },
  async all() { return { results: db.prepare(sql).all(...args) }; },
  async run() {
    if (sql.startsWith('INSERT INTO administration_signatures') && beforeInsert) { const run = beforeInsert; beforeInsert = undefined; await run(); }
    return { meta: db.prepare(sql).run(...args) };
  },
}; } }; } };
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const medicine = { id: 'routine-existing', type: 'routine', name: 'Fixture medicine', dose: '10 mg', route: 'Oral', schedule: 'Twice daily', prescribedDate: today, times: ['08:00', '12:00'], status: 'active', administrations: [] };
globalThis.chartTestContext = { home: { id: 'test-home' }, client: { id: 'test-client', medications: [medicine, { ...medicine, id: 'prn-existing', type: 'prn', schedule: 'When required' }, { ...medicine, id: 'ceased', status: 'ceased' }] } };
const dependencies = {
  '@/lib/chart-db': moduleUrl("export const chartDatabase=()=>globalThis.chartTestDb; export const gpEmails=()=> 'gp@example.test'; export const carerEmails=()=> 'carer@example.test';"),
  '@/lib/chart-server': moduleUrl("export const chartContext=()=>globalThis.chartTestContext; export const chartJson=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});"),
  '@/lib/chart-access': moduleUrl(compile('lib/chart-access.ts')),
  '@/lib/prescriber-chart': moduleUrl(compile('lib/prescriber-chart.ts')),
};
const loadRoute = async path => {
  let source = compile(path).replaceAll('import.meta.env.DEV', 'false');
  for (const [specifier, url] of Object.entries(dependencies)) source = source.replaceAll(specifier, url);
  return import(moduleUrl(source));
};
const { POST } = await loadRoute('app/api/chart-administrations/route.ts');
const { GET, PATCH } = await loadRoute('app/api/prescriber-chart/route.ts');
const { initialPrescription } = await import(dependencies['@/lib/prescriber-chart']);
const origin = 'https://chart.example.test';
const request = (method, body, role = 'carer', email = `${role}@example.test`, extra = {}) => new Request(`${origin}/api/chart`, { method, headers: { origin, 'content-type': 'application/json', 'x-chart-role': role, 'oai-authenticated-user-id': email, 'oai-authenticated-user-email': email, ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) });
const routine = { medicationId: medicine.id, cellKey: `routine:${today}:08:00`, orderVersion: 0, strokes: [], initials: 'mr', confirmed: true };
const sign = (body, role, email, headers) => POST(request('POST', body, role, email, headers));
const prescribe = (id, version, prescription) => PATCH(request('PATCH', { medicationId: id, version, prescription }, 'gp'));
for (const role of ['gp', 'rn', 'management', 'pharmacist']) assert.equal((await sign(routine, role)).status, 403);
assert.equal((await sign(routine, 'carer', 'outsider@example.test')).status, 403);
assert.equal((await sign(routine, 'carer', undefined, { origin: 'https://other.test' })).status, 403);
assert.equal((await PATCH(request('PATCH', { medicationId: medicine.id, version: 0, prescription: initialPrescription(medicine) }))).status, 403);
for (const patch of [{ confirmed: false }, { dose: '999 mg' }, { initials: '<script>' }, { cellKey: `routine:${today}:09:00` }, { cellKey: 'routine:2999-01-01:08:00' }]) assert.equal((await sign({ ...routine, ...patch })).status, 400);
assert.equal((await sign({ ...routine, medicationId: 'regular-slot-8' })).status, 404);
assert.equal((await sign({ ...routine, medicationId: 'ceased' })).status, 409);
let response = await sign(routine);
assert.equal(response.status, 201);
const saved = await response.json();
assert.equal(saved.signature.initials, 'MR');
assert.equal(saved.signature.signedBy, 'carer@example.test');
assert.equal(saved.orderVersion, 0, 'An existing populated order does not need a new GP drawing');
assert.equal((await sign(routine)).status, 200, 'Identical retries are idempotent');
assert.equal((await sign({ ...routine, initials: 'AB' })).status, 409, 'Saved initials cannot be overwritten');
const drawn = { ...routine, cellKey: `routine:${today}:12:00`, initials: undefined, strokes: [[[0.1, 0.1], [0.5, 0.8]]] };
assert.equal((await sign(drawn)).status, 201);
const prn = { ...routine, medicationId: 'prn-existing', cellKey: `prn:${today.slice(0, 7)}:0` };
assert.equal((await sign(prn)).status, 201);
assert.equal((await sign({ ...prn, cellKey: `prn:${today.slice(0, 7)}:1`, initials: 'AB' })).status, 201);
assert.equal((await sign({ ...prn, cellKey: `prn:${today.slice(0, 7)}:24` })).status, 400);
const read = await GET(request('GET', undefined, 'gp'));
assert.equal(read.status, 200);
const chart = await read.json();
assert.equal(chart.administrations.length, 4);
assert.equal(chart.administrations.find(r => r.cellKey === routine.cellKey).signature.initials, 'MR');
assert.deepEqual(chart.administrations.find(r => r.cellKey === drawn.cellKey).signature.strokes, drawn.strokes);
assert.equal(chart.administrations.find(r => r.cellKey.endsWith(':1')).signature.initials, 'AB');
assert.equal(chart.records.length, 0, 'Administration does not mutate the prescriber section');

const amended = { ...initialPrescription(medicine), times: ['10:00', '12:00', '', '', '', ''] };
assert.equal((await prescribe(medicine.id, 0, amended)).status, 200);
assert.equal((await sign({ ...routine, cellKey: `routine:${today}:10:00` })).status, 409);
assert.equal((await sign({ ...routine, cellKey: `routine:${today}:10:00`, orderVersion: 1 })).status, 201, 'A populated current revision permits recording without a drawing');
beforeInsert = async () => { assert.equal((await prescribe('prn-existing', 0, initialPrescription(globalThis.chartTestContext.client.medications[1]))).status, 200); };
assert.equal((await sign({ ...prn, cellKey: `prn:${today.slice(0, 7)}:2` })).status, 409, 'An amendment during saving rejects the stale baseline version');
assert.equal(db.prepare('SELECT COUNT(*) AS count FROM administration_signatures').get().count, 5);
db.close();
console.log('Passed production-role permissions, typed/drawn per-cell persistence, readback, prescriber protection, version-0 orders, duplicate protection, date checks and concurrent amendment rejection.');
