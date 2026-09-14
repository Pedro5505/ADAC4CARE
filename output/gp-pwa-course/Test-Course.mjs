import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const base = process.env.COURSE_URL || 'http://localhost:3200';
const home = 'banksia-house';
const endpoint = `${base}/api/clinical-records?home=${home}`;
const input = { id: randomUUID(), clientId: 'james-miller', kind: 'report', category: 'GP instruction', title: 'Course integration check', body: 'Fictional lab record: verify persistence.', action: 'Review in the course app.' };
async function post(body, extra = {}) {
  return fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', origin: base, 'x-chart-role': 'gp', ...extra }, body: JSON.stringify(body) });
}
let response = await post(input);
assert.equal(response.status, 201, await response.clone().text());
const created = (await response.json()).item;
assert.equal(created.record.author, 'Local GP evaluation');
assert.equal((await post(input)).status, 200, 'same request retries without duplication');
assert.equal((await post({ ...input, title: 'Different content' })).status, 409);
assert.equal((await post({ ...input, id: randomUUID(), clientId: 'missing' })).status, 404);
assert.equal((await post({ ...input, id: randomUUID(), title: '' })).status, 400);
assert.equal((await post({ ...input, id: randomUUID(), author: 'Spoofed' })).status, 400);
assert.equal((await post(input, { origin: 'https://different.invalid' })).status, 403);
assert.equal((await post(input, { 'x-chart-role': 'rn' })).status, 403);
response = await fetch(endpoint);
assert.equal(response.headers.get('cache-control'), 'no-store');
const records = (await response.json()).records;
assert.equal(records.filter(record => record.id === input.id).length, 1);
const message = { ...input, id: randomUUID(), kind: 'message', category: 'handover', title: 'Course note', action: '' };
assert.equal((await post(message)).status, 201);
for (const path of ['/', '/people', '/people/james-miller', '/medication-charts?client=james-miller', '/reports', '/messages', '/manifest.webmanifest', '/offline.html', '/sw.js', '/icons/icon-192.png', '/icons/icon-512.png']) {
  const result = await fetch(base + path);
  assert.equal(result.status, 200, path);
}
const manifest = await (await fetch(base + '/manifest.webmanifest')).json();
assert.deepEqual(manifest.icons.map(icon => icon.sizes), ['192x192', '512x512']);

// Execute the actual worker in a small harness to verify cache routing.
const handlers = {};
let failNetwork = false;
let cacheLookup = [];
const offlineResponse = new Response('GENERIC OFFLINE');
const self = { location: { origin: base }, addEventListener: (name, callback) => { handlers[name] = callback; } };
const context = { self, URL, Response, caches: { match: async key => { cacheLookup.push(typeof key === 'string' ? key : key.url); return offlineResponse; } }, fetch: async () => { if (failNetwork) throw new Error('offline'); return new Response('NETWORK'); } };
vm.runInNewContext(await readFile(new URL('./extensions/week-07/frontend/public/sw.js', import.meta.url), 'utf8'), context);
for (const request of [new Request(endpoint), new Request(endpoint, { method: 'POST' }), new Request('https://elsewhere.invalid/')]) {
  let intercepted = false;
  handlers.fetch({ request, respondWith: () => { intercepted = true; } });
  assert.equal(intercepted, false, 'API, mutations and cross-origin bypass cache');
}
let fallback;
failNetwork = true;
handlers.fetch({ request: { url: base + '/people/james-miller', method: 'GET', mode: 'navigate' }, respondWith: promise => { fallback = promise; } });
assert.equal(await (await fallback).text(), 'GENERIC OFFLINE');
assert.deepEqual(cacheLookup, ['/offline.html']);
console.log('PASS: communications persistence/retry/validation, routes, manifest and worker routing.');
console.log('Browser installation, mobile layout, canvas interaction and hosted identity still require the Week 8 manual checks.');
