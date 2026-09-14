// New lab-only verification client; application handlers are unchanged.
import assert from 'node:assert/strict';

const origin = new URL(process.argv[2] ?? 'http://localhost:3000');
if (!['localhost', '127.0.0.1'].includes(origin.hostname)) {
  throw new Error('This exercise only runs against a local lab server.');
}
const endpoint = new URL('/api/prescriber-chart?home=banksia-house&client=james-miller', origin);
const medicationId = 'regular-slot-8';
const call = async (method = 'GET', body, extra = {}) => {
  const response = await fetch(endpoint, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Chart-Role': 'gp', Origin: origin.origin, ...extra },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); }
  catch { data = { error: raw }; } // The development runtime can reject before a JSON route executes.
  return { status: response.status, data };
};
const initial = await call();
assert.equal(initial.status, 200, JSON.stringify(initial.data));
assert.equal(initial.data.canPrescribe, true);
assert.ok(!initial.data.records.some(r => r.medicationId === medicationId),
  'Slot 8 already has history. Use a fresh isolated lab folder; do not overwrite an existing exercise.');
const prescription = {
  name: 'Test medicine', dose: '10 mg', route: 'Oral', frequency: 'Daily',
  start_date: '2026-09-01', end_date: '', refer_prn: false,
  times: ['08:00', '', '', '', '', ''], instructions: 'Fictional software test only.',
  max_dose: '', prescriber_signature: null,
};
const body = { medicationId, version: 0, prescription };
assert.equal((await call('PATCH', body, { 'X-Chart-Role': 'carer' })).status, 403);
assert.equal((await call('PATCH', body, { Origin: 'https://other.example.test' })).status, 403);
assert.equal((await call('PATCH', { ...body, actor: 'spoof' })).status, 400);
let response = await call('PATCH', body);
assert.equal(response.status, 200, JSON.stringify(response.data));
assert.equal(response.data.version, 1);
assert.equal((await call('PATCH', body)).status, 409);
const strokes = [[[0.1, 0.1], [0.6, 0.7]]];
response = await call('PATCH', {
  medicationId, version: 1,
  prescription: { ...response.data.prescription, prescriber_signature: { strokes, signedAt: '', signedBy: '' } },
});
assert.equal(response.status, 200, JSON.stringify(response.data));
assert.equal(response.data.version, 2);
assert.equal(response.data.prescription.prescriber_signature.signedBy, 'Local GP evaluation');
assert.ok(response.data.prescription.prescriber_signature.signedAt);
const signed = response.data.prescription;
assert.equal((await call('PATCH', { medicationId, version: 2, prescription: { ...signed, dose: '20 mg' } })).status, 400);
response = await call('PATCH', {
  medicationId, version: 2,
  prescription: { ...signed, dose: '20 mg', prescriber_signature: null },
});
assert.equal(response.status, 200, JSON.stringify(response.data));
assert.equal(response.data.version, 3);
assert.equal(response.data.prescription.prescriber_signature, null);
const readback = (await call()).data.records.find(r => r.medicationId === medicationId);
assert.deepEqual(readback, response.data);
console.log('PASS: local HTTP read, role/origin guards, field validation, create, stale-write conflict, signature attribution, amendment invalidation and persistent readback.');
console.log('Expected database: regular-slot-8 versions 1, 2, 3; latest dose 20 mg; latest signature null.');
console.log(`Inspect ${origin.origin}/medication-charts?client=james-miller as General practitioner.`);
