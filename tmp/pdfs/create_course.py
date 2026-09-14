from pathlib import Path
import shutil, json, hashlib, re

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/gp-pwa-course'
OUT.mkdir(parents=True,exist_ok=True)
def put(path,text):
    p=OUT/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text.strip()+'\n',encoding='utf-8')
def original(path):return (ROOT/'frontend'/path).read_text(encoding='utf-8-sig')
def extension(week,path,text):put(f'extensions/week-{week:02}/frontend/{path}',text)
for base, folders in [('frontend',['app','components','data','db','docs','drizzle','hooks','lib','public','tests','types']),('backend',['apps','config','requirements','tests'])]:
    for folder in folders:
        for p in (ROOT/base/folder).rglob('*'):
            if p.is_file() and '__pycache__' not in p.parts:
                q=OUT/'source'/p.relative_to(ROOT);q.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,q)
for base,names in [('frontend',['package.json','package-lock.json','tsconfig.json','vite.config.ts','vite-env.d.ts','next.config.ts','components.json','.oxlintrc.json','.oxfmtrc.json','.env.example','drizzle.config.ts','.openai/hosting.json']),('backend',['manage.py','pytest.ini','.env.example'])]:
    for name in names:
        q=OUT/'source'/base/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/base/name,q)
for name in ['wrangler.lab.json','Test-GpWorkflow.mjs','VALIDATION.md']:
    shutil.copyfile(ROOT/'output/gp-lab'/name,OUT/name)
shutil.copyfile(ROOT/'output/gp-lab/GP-User-Module-Implementation-Lab.md',OUT/'Integration-Reference.md')

# Week 2: preserve source layout; expose a GP-appropriate overview.
shell=original('components/app-shell.tsx').replace("icon: LayoutDashboard, roles: ['carer', 'rn', 'management']","icon: LayoutDashboard, roles: ['carer', 'rn', 'management', 'gp']")
shell=shell.replace("count: 3", "count: undefined")
extension(2,'components/app-shell.tsx',shell)
overview=original('app/page.tsx')
overview=overview.replace('<section className="panel" style={{ padding: 18, marginBottom: 18 }}>',"{role !== 'gp' ? <section className=\"panel\" style={{ padding: 18, marginBottom: 18 }}>",1)
overview=overview.replace('Signed medication rounds</Link></section>','Signed medication rounds</Link></section> : null}',1)
overview=overview.replace('&mode=administer`}',"${role === 'gp' ? '' : '&mode=administer'}`}" ).replace('>Administer</Link>',">{role === 'gp' ? 'Review chart' : 'Administer'}</Link>")
overview=overview.replace('Administrations recorded</span>','Administrations (demo 1 Sep)</span>')
extension(2,'app/page.tsx',overview)

# Week 6: small append-only communication resource; no email or external delivery.
extension(6,'drizzle/0002_course_communications.sql','''
CREATE TABLE IF NOT EXISTS gp_communications (
  id TEXT PRIMARY KEY NOT NULL,
  home_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('report', 'message')),
  request_json TEXT NOT NULL,
  record_json TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS gp_communications_home ON gp_communications(home_id, created_at);
''')
extension(6,'lib/clinical-records.ts','''
import type { CareMessage, ClinicalReport } from '@/data/demo/types';

export type NewCommunication = {
  id: string; clientId: string; kind: 'report' | 'message';
  category: string; title: string; body: string; action: string;
};
export type Communication = {
  id: string; clientId: string; kind: 'report' | 'message';
  record: ClinicalReport | CareMessage;
};
export function validCommunication(value: unknown): value is NewCommunication {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const fields = ['id', 'clientId', 'kind', 'category', 'title', 'body', 'action'];
  if (Object.keys(v).length !== fields.length || Object.keys(v).some(k => !fields.includes(k))) return false;
  if (!fields.every(k => typeof v[k] === 'string')) return false;
  if (!/^[0-9a-f-]{36}$/i.test(v.id as string)) return false;
  if (!(v.title as string).trim() || !(v.body as string).trim()) return false;
  if ((v.title as string).length > 200 || (v.body as string).length > 4000 || (v.action as string).length > 2000) return false;
  if (v.kind === 'report') return ['GP instruction', 'Dose change'].includes(v.category as string) && Boolean((v.action as string).trim());
  return v.kind === 'message' && ['handover', 'incident'].includes(v.category as string);
}
''')
extension(6,'app/api/clinical-records/route.ts','''
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
    : { ...common, type: input.category, role: 'GP', body: input.body + (input.action ? '\\nAction: ' + input.action : ''), priority: input.category === 'incident' ? 'important' : 'routine', pinned: false };
  try {
    const db = chartDatabase();
    const result = await db.prepare('INSERT OR IGNORE INTO gp_communications (id, home_id, client_id, kind, request_json, record_json, actor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(input.id, home.id, input.clientId, input.kind, canonical, JSON.stringify(record), user.actor, date).run();
    const saved = await db.prepare('SELECT home_id, actor, request_json, record_json FROM gp_communications WHERE id = ?').bind(input.id).first<{ home_id: string; actor: string; request_json: string; record_json: string }>();
    if (!saved || saved.home_id !== home.id || saved.actor !== user.actor || saved.request_json !== canonical) return json({ error: 'This request ID was already used with different content. Start a new record.' }, 409);
    return json({ item: { id: input.id, clientId: input.clientId, kind: input.kind, record: JSON.parse(saved.record_json) } }, result.meta.changes ? 201 : 200);
  } catch { return json({ error: 'Save could not be confirmed. Retry the unchanged form.' }, 503); }
}
''')
extension(6,'hooks/use-clinical-home.ts','''
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getHome } from '@/data/demo';
import type { CareMessage, ClinicalReport } from '@/data/demo/types';
import type { Communication, NewCommunication } from '@/lib/clinical-records';

export function useClinicalHome(homeId: string) {
  const [snapshot, setSnapshot] = useState<{ homeId: string; records: Communication[] }>({ homeId, records: [] });
  const [error, setError] = useState('');
  const [canCreate, setCanCreate] = useState(false);
  const sequence = useRef(0);
  const endpoint = '/api/clinical-records?home=' + encodeURIComponent(homeId);
  const reload = useCallback(async () => {
    const ticket = ++sequence.current;
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const result = await response.json() as { records: Communication[]; canCreate: boolean; error?: string };
      if (!response.ok) throw new Error(result.error || 'Records could not be loaded.');
      if (ticket !== sequence.current) return;
      setSnapshot({ homeId, records: result.records }); setCanCreate(result.canCreate); setError('');
    } catch (reason) {
      if (ticket === sequence.current) { setError(reason instanceof Error ? reason.message : 'Request failed.'); setCanCreate(false); }
    }
  }, [endpoint, homeId]);
  useEffect(() => {
    setCanCreate(false); void reload();
    const refresh = () => { if (!document.hidden) void reload(); };
    window.addEventListener('focus', refresh); window.addEventListener('gp-records-changed', refresh);
    const timer = window.setInterval(refresh, 15000);
    return () => { ++sequence.current; window.clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('gp-records-changed', refresh); };
  }, [reload]);
  const save = async (input: NewCommunication) => {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-chart-role': 'gp' }, body: JSON.stringify(input) });
    const result = await response.json() as { item: Communication; error?: string };
    if (!response.ok) throw new Error(result.error || 'Save failed.');
    ++sequence.current;
    setSnapshot(current => ({ homeId, records: [result.item, ...(current.homeId === homeId ? current.records : []).filter(r => r.id !== input.id)] }));
    window.dispatchEvent(new Event('gp-records-changed'));
  };
  const records = snapshot.homeId === homeId ? snapshot.records : [];
  const base = getHome(homeId);
  const home = { ...base, clients: base.clients.map(client => ({ ...client,
    reports: [...client.reports, ...records.filter(r => r.clientId === client.id && r.kind === 'report').map(r => r.record as ClinicalReport)],
    messages: [...client.messages, ...records.filter(r => r.clientId === client.id && r.kind === 'message').map(r => r.record as CareMessage)],
  })) };
  return { home, error, canCreate, save, reload };
}
''')
extension(6,'components/gp-communication-form.tsx','''
'use client';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { GroupHome } from '@/data/demo/types';
import type { NewCommunication } from '@/lib/clinical-records';

export function GpCommunicationForm({ home, kind, reply, save, onSaved, onCancel }: {
  home: GroupHome; kind: 'report' | 'message'; reply?: { clientId: string; title: string };
  save: (input: NewCommunication) => Promise<void>; onSaved: () => void; onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  const saving = useRef(false);
  return <form onSubmit={async event => {
    event.preventDefault(); if (saving.current) return;
    const data = new FormData(event.currentTarget);
    const values = { clientId: String(data.get('client')), kind, category: String(data.get('category')), title: String(data.get('title')), body: String(data.get('body')), action: String(data.get('action')) };
    const fingerprint = JSON.stringify(values);
    if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: crypto.randomUUID() };
    saving.current = true; setBusy(true); setError('');
    try { await save({ ...values, id: request.current.id }); onSaved(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Save failed.'); }
    finally { saving.current = false; setBusy(false); }
  }}>
    <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
      <div className="prescription-form-grid">
        <label htmlFor="gp-client"><span>Client</span><select id="gp-client" name="client" defaultValue={reply?.clientId ?? home.clients[0].id}>{home.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label htmlFor="gp-category"><span>{kind === 'report' ? 'Report type' : 'Message type'}</span><select id="gp-category" name="category">{kind === 'report' ? <><option>GP instruction</option><option>Dose change</option></> : <><option value="handover">Handover note</option><option value="incident">Medication incident</option></>}</select></label>
        <label className="form-span" htmlFor="gp-title"><span>Title</span><Input id="gp-title" name="title" maxLength={200} required defaultValue={reply ? ('Re: ' + reply.title).slice(0, 200) : ''} /></label>
        <label className="form-span" htmlFor="gp-body"><span>{kind === 'report' ? 'Clinical summary' : 'Details'}</span><textarea id="gp-body" name="body" maxLength={4000} required /></label>
        <label className="form-span" htmlFor="gp-action"><span>Required action</span><textarea id="gp-action" name="action" maxLength={2000} required={kind === 'report'} /></label>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      <div className="dialog-actions"><Button type="button" onClick={onCancel} variant="ghost">Cancel</Button><Button type="submit">{busy ? 'Saving…' : kind === 'report' ? 'Add GP instruction' : 'Add to care record'}</Button></div>
    </fieldset>
  </form>;
}
''')
# Reuse the existing presentation and replace only GP command handling.
for path,kind in [('app/reports/page.tsx','report'),('app/messages/page.tsx','message')]:
    t=original(path)
    t=t.replace("import { getHome, roleLabels } from '@/data/demo';", "import { roleLabels } from '@/data/demo';\nimport { useClinicalHome } from '@/hooks/use-clinical-home';\nimport { GpCommunicationForm } from '@/components/gp-communication-form';")
    t=t.replace('const home = getHome(homeId);','const { home, error: loadError, canCreate: serverCanCreate, save } = useClinicalHome(homeId);')
    t=t.replace('<AppShell>','<AppShell>\n      {loadError ? <p role="alert">{loadError} Showing available records.</p> : null}',1)
    t=t.replace('const canCreate = role === \'rn\' || role === \'gp\';',"const canCreate = role === 'rn' || (role === 'gp' && serverCanCreate);")
    if kind=='message':
        t=t.replace("const [notice, setNotice] = useState('');", "const [notice, setNotice] = useState('');\n  const [reply, setReply] = useState<{ clientId: string; title: string } | undefined>();")
        t=t.replace('<Button onClick={() => setComposeOpen(true)}><Plus />',"<Button disabled={role === 'gp' && !serverCanCreate} onClick={() => { setReply(undefined); setComposeOpen(true); }}><Plus />")
        t=t.replace('onClick={() => setNotice(`Reply thread opened for “${message.title}”.`)}',"disabled={role === 'gp' && !serverCanCreate} onClick={() => { if (role === 'gp') { setReply({ clientId: message.clientId, title: message.title }); setComposeOpen(true); } else setNotice('Reply is a demo action for this role.'); }}")
    start=t.index('<div className="prescription-form-grid">',t.index('<Dialog onOpenChange='))
    end=t.index('</DialogContent>',start)
    old=t[start:end]
    if kind == 'report': old=old.replace("{role === 'gp' ? <><option>GP instruction</option><option>Dose change</option></> : <option>RN review</option>}", '<option>RN review</option>')
    props=' reply={reply}' if kind=='message' else ''
    t=t[:start]+f'''{{role === 'gp' ? <GpCommunicationForm key={{homeId + String(composeOpen)}} home={{home}} kind="{kind}"{props} save={{save}} onCancel={{() => setComposeOpen(false)}} onSaved={{() => {{ setComposeOpen(false); setNotice('Saved to the course database.'); }}}} /> : <>{old}</>}}'''+t[end:]
    t=t.replace('This record is visible to authorised staff and retained in the audit history.','GP records are saved in the course database with the authenticated actor. This form does not draw a prescription signature.')
    extension(6,path,t)
for path,text in [('app/page.tsx',overview),('app/people/page.tsx',original('app/people/page.tsx'))]:
    text="import { useClinicalHome } from '@/hooks/use-clinical-home';\n".join(text.split('\n',1)) if False else text
    text=text.replace("import { useRole }", "import { useClinicalHome } from '@/hooks/use-clinical-home';\nimport { useRole }",1)
    text=text.replace('const home = getHome(homeId);','const { home, error: recordsError } = useClinicalHome(homeId);')
    text=text.replace('<AppShell>','<AppShell>\n      {recordsError ? <p role="alert">{recordsError} Showing available records.</p> : null}',1)
    extension(6,path,text)

# Week 7: conservative PWA; generic offline response only.
extension(7,'public/manifest.webmanifest',json.dumps({
    'id':'/','name':'ADAC4CARE Medication Management','short_name':'ADAC4CARE',
    'description':'GP medication management course workspace','start_url':'/','scope':'/',
    'display':'standalone','background_color':'#F7F5FB','theme_color':'#B19CD7',
    'icons':[{'src':f'/icons/icon-{n}.png','sizes':f'{n}x{n}','type':'image/png','purpose':'any'} for n in [192,512]]},indent=2))
extension(7,'public/offline.html','''
<!doctype html><html lang="en-AU"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#B19CD7"><title>ADAC4CARE — Offline</title>
<style>body{background:#F7F5FB;color:#26372c;font:18px system-ui;margin:0;padding:8vh 7vw}main{max-width:38rem;background:white;border-radius:24px;padding:32px;border-top:8px solid #c2d79c}a{color:#435d30}</style>
<main><h1>You are offline</h1><p>Connect to the internet to load patient information and confirm saved changes.</p><p>This course app does not store clinical pages offline or queue prescriptions. A save without confirmation must be checked when the connection returns.</p><a href="/">Try the GP home page again</a></main></html>
''')
extension(7,'public/sw.js','''
/* Course extension: cache only these generic public resources. */
const CACHE = 'adac-gp-public-v1';
const PUBLIC = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLIC)));
  // Do not skipWaiting: an open chart keeps its current worker until closed.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('adac-gp-public-') && k !== CACHE).map(k => caches.delete(k)))));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html').then(response => response || new Response('Offline. Reconnect to continue.', { status: 503 }))));
  } else if (PUBLIC.includes(url.pathname) && !url.search) {
    event.respondWith(caches.match(request).then(response => response || fetch(request)));
  }
});
''')
extension(7,'components/pwa-status.tsx','''
'use client';
import { useEffect, useState } from 'react';

export function PwaStatus() {
  const [offline, setOffline] = useState(false);
  const [status, setStatus] = useState('');
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update(); window.addEventListener('online', update); window.addEventListener('offline', update);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then(registration => {
          if (registration.waiting) setStatus('An app update is ready. Finish your work, then close all app windows and reopen.');
        })
        .catch(() => setStatus('Offline support is unavailable. You can continue using the online app.'));
    }
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  if (!offline && !status) return null;
  return <aside role="status" className="course-pwa-status">{offline ? 'Offline: patient data may be stale. Saves are not queued. Reconnect and confirm each change.' : status}</aside>;
}
''')
layout=original('app/layout.tsx').replace("import './globals.css';", "import './globals.css';\nimport { PwaStatus } from '@/components/pwa-status';")
layout=layout.replace('<RoleProvider>{children}</RoleProvider>', '<RoleProvider><PwaStatus />{children}</RoleProvider>')
extension(7,'app/layout.tsx',layout)
extension(7,'app/globals.css',original('app/globals.css')+'\n.course-pwa-status { position: sticky; top: 0; z-index: 100; padding: 12px 24px; background: #fff4e8; color: #643c14; text-align: center; font-size: 14px; }\n@media print { .course-pwa-status { display: none; } }\n')
from PIL import Image, ImageDraw
for n in [192,512]:
    im=Image.new('RGB',(n,n),'#F7F5FB');d=ImageDraw.Draw(im)
    d.rounded_rectangle((n*.08,n*.08,n*.92,n*.92),radius=n*.2,fill='#c2d79c')
    d.line([(n*.19,n*.51),(n*.36,n*.51),(n*.44,n*.30),(n*.57,n*.73),(n*.66,n*.51),(n*.81,n*.51)],fill='#34492a',width=round(n*.055),joint='curve')
    p=OUT/f'extensions/week-07/frontend/public/icons/icon-{n}.png';p.parent.mkdir(parents=True,exist_ok=True);im.save(p)

put('New-CourseWorkspace.ps1',r'''
param([ValidateRange(1,8)][int]$Week = 1, [string]$Destination = '')
$ErrorActionPreference = 'Stop'
if (-not $Destination) { $Destination = Join-Path (Get-Location) "work\gp-pwa-week-$Week" }
$target = [IO.Path]::GetFullPath($Destination)
if (Test-Path -LiteralPath $target) { throw "Folder exists: $target. Choose a new folder to preserve your work." }
New-Item -ItemType Directory -Path $target | Out-Null
Copy-Item -LiteralPath "$PSScriptRoot\source\frontend" -Destination $target -Recurse
Copy-Item -LiteralPath "$PSScriptRoot\source\backend" -Destination $target -Recurse
foreach ($n in 2,6,7) {
  if ($n -gt $Week) { continue }
  $overlay = Join-Path $PSScriptRoot ('extensions\week-{0:D2}' -f $n)
  foreach ($file in Get-ChildItem -LiteralPath $overlay -Recurse -File) {
    $out = Join-Path $target $file.FullName.Substring($overlay.Length + 1)
    New-Item -ItemType Directory -Path (Split-Path $out) -Force | Out-Null
    Copy-Item -LiteralPath $file.FullName -Destination $out -Force
  }
}
Copy-Item -LiteralPath "$PSScriptRoot\wrangler.lab.json" -Destination "$target\frontend\wrangler.lab.json"
Copy-Item -LiteralPath "$target\frontend\.env.example" -Destination "$target\frontend\.env.local"
Copy-Item -LiteralPath "$target\backend\.env.example" -Destination "$target\backend\.env"
Write-Output "Created week $Week reference checkpoint at $target"
Write-Output 'Install dependencies and apply local D1 migrations as described in Week 1.'
''')
hashes={str(p.relative_to(OUT)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for folder in ['source','extensions'] for p in (OUT/folder).rglob('*') if p.is_file()}
put('source-manifest.json',json.dumps({'date':'2026-09-10','frontend_commit':'c53e0eaccf0d9771a9babfada1fab6de8b1f35f3','files':hashes},indent=2))
print(json.dumps({'snapshot_files':len(hashes),'course':str(OUT)}))
