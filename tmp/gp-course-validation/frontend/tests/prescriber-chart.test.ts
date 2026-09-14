import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chartAccess } from '../lib/chart-access.ts';
import { administrationOrderReady, amendPrescription, initialPrescription, validateAdministrationSignature, validatePrescription } from '../lib/prescriber-chart.ts';

const prescription = { ...initialPrescription(), name: 'Test medicine', dose: '10 mg', route: 'Oral', frequency: 'Daily', start_date: '2026-09-01' };
const signature = { strokes: [[[0.1, 0.1], [0.6, 0.7]]], signedAt: '2026-09-07T00:00:00Z', signedBy: 'test-gp' };

test('populated existing orders allow administration without a new GP drawing', () => {
  assert.equal(administrationOrderReady(prescription), true);
  assert.equal(administrationOrderReady(initialPrescription()), false);
  for (const field of ['name', 'dose', 'route', 'frequency', 'start_date']) {
    assert.equal(administrationOrderReady({ ...prescription, [field]: '' }), false);
  }
});

test('carers can use drawn or typed initials; invalid and mixed signatures are rejected', () => {
  assert.deepEqual(validateAdministrationSignature(signature.strokes), { strokes: signature.strokes });
  assert.deepEqual(validateAdministrationSignature([], ' mr '), { strokes: [], initials: 'MR' });
  for (const initials of ['', '123', '<img>', 'ABCDEFG', null, 12]) {
    assert.throws(() => validateAdministrationSignature([], initials), /letters/);
  }
  assert.throws(() => validateAdministrationSignature(signature.strokes, 'MR'), /either drawn or typed/);
  assert.throws(() => validateAdministrationSignature([]), /Draw a signature/);
});

test('hosted GP authority comes from authenticated identity, not the role selector', () => {
  assert.equal(chartAccess(new Headers({ 'x-chart-role': 'gp' }), 'gp@example.test', false).canWrite, false);
  const headers = new Headers({ 'x-chart-role': 'gp', 'oai-authenticated-user-id': 'viewer', 'oai-authenticated-user-email': 'carer@example.test' });
  assert.equal(chartAccess(headers, 'gp@example.test', false).canWrite, false);
  headers.set('oai-authenticated-user-email', 'gp@example.test');
  assert.equal(chartAccess(headers, 'gp@example.test', false).canWrite, true);
  for (const role of ['carer', 'rn', 'management', 'pharmacist']) {
    headers.set('x-chart-role', role);
    assert.equal(chartAccess(headers, 'gp@example.test', false).canWrite, false);
  }
});

test('an unconfigured hosted prescriber allowlist denies writing', () => {
  const headers = new Headers({ 'x-chart-role': 'gp', 'oai-authenticated-user-id': 'viewer', 'oai-authenticated-user-email': 'gp@example.test' });
  assert.equal(chartAccess(headers, '', false).canWrite, false);
});

test('only seven prescriber fields are accepted; staff data and impersonated authors are rejected', () => {
  assert.doesNotThrow(() => validatePrescription(prescription));
  for (const field of ['administrations', 'rn_signature', 'carer_signature', 'prescriber', 'created_by']) {
    assert.throws(() => validatePrescription({ ...prescription, [field]: 'injected' }), /Only prescriber fields/);
  }
});

test('only the provisioned carer identity in carer mode can sign administration cells', () => {
  const headers = new Headers({ 'x-chart-role': 'carer', 'oai-authenticated-user-id': 'staff', 'oai-authenticated-user-email': 'staff@example.test' });
  assert.equal(chartAccess(headers, '', false, '').canSign, false);
  assert.equal(chartAccess(headers, '', false, 'staff@example.test').canSign, true);
  for (const role of ['gp', 'rn', 'management', 'pharmacist']) {
    headers.set('x-chart-role', role);
    assert.equal(chartAccess(headers, 'staff@example.test', false, 'staff@example.test').canSign, false);
  }
});

test('GP may change Refer PRN and six prescribed time cells; duplicate or invalid times are rejected', () => {
  assert.doesNotThrow(() => validatePrescription({ ...prescription, refer_prn: true, times: ['08:00', '12:00', '20:00', '', '', ''] }));
  assert.throws(() => validatePrescription({ ...prescription, times: ['08:00', '08:00', '', '', '', ''] }), /unique/);
  assert.throws(() => validatePrescription({ ...prescription, times: ['25:00', '', '', '', '', ''] }), /valid administration times/);
  assert.throws(() => validatePrescription({ ...prescription, refer_prn: 'yes' }), /ticked/);
  assert.equal(amendPrescription({ ...prescription, prescriber_signature: signature }, 'refer_prn', true).prescriber_signature, null);
  assert.equal(amendPrescription({ ...prescription, prescriber_signature: signature }, 'times', ['08:00', '', '', '', '', '']).prescriber_signature, null);
});

test('dates must exist and stopping before starting is rejected', () => {
  assert.throws(() => validatePrescription({ ...prescription, start_date: '2026-02-30' }), /valid start date/);
  assert.throws(() => validatePrescription({ ...prescription, end_date: '2026-08-31' }), /Stop date must/);
  assert.doesNotThrow(() => validatePrescription({ ...prescription, end_date: '2026-09-01' }));
});

test('a signature requires a complete prescription and a bounded drawing', () => {
  assert.doesNotThrow(() => validatePrescription({ ...prescription, prescriber_signature: signature }));
  assert.throws(() => validatePrescription({ ...prescription, dose: '', prescriber_signature: signature }), /Complete medicine/);
  assert.throws(() => validatePrescription({ ...prescription, prescriber_signature: { ...signature, strokes: [] } }), /Draw a signature/);
  assert.throws(() => validatePrescription({ ...prescription, prescriber_signature: { ...signature, strokes: [[[0, 0], [2, 1]]] } }), /Invalid signature/);
  assert.throws(() => validatePrescription({ ...prescription, prescriber_signature: '<svg onload=alert(1) />' }), /Draw a signature/);
});

test('every prescription amendment invalidates the previous signature', () => {
  const signed = { ...prescription, prescriber_signature: signature };
  for (const [field, value] of [['name', 'Other medicine'], ['dose', '20 mg'], ['route', 'Topical'], ['frequency', 'Twice daily'], ['start_date', '2026-09-02'], ['end_date', '2026-09-30']] as const) {
    assert.equal(amendPrescription(signed, field, value).prescriber_signature, null);
  }
  assert.equal(amendPrescription(signed, 'dose', signed.dose).prescriber_signature, signature);
});
