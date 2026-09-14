'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AlertTriangle, Check, ClipboardPen, LockKeyhole, MessageCircle, Pin, Plus } from 'lucide-react';

import { AppShell } from '@/components/app-shell';
import { useRole } from '@/components/role-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { getHome, roleLabels } from '@/data/demo';

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const { homeId, role } = useRole();
  const home = getHome(homeId);
  const [clientId, setClientId] = useState(searchParams.get('client') ?? 'all');
  const [type, setType] = useState<'all' | 'incident' | 'handover' | 'management'>('all');
  const [composeOpen, setComposeOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const messages = home.clients.flatMap((client) => client.messages.map((message) => ({ ...message, clientName: client.name, clientId: client.id }))).filter((message) => (clientId === 'all' || message.clientId === clientId) && (type === 'all' || message.type === type)).sort((a, b) => b.date.localeCompare(a.date));
  const canPin = role === 'management' || role === 'rn';

  return (
    <AppShell>
      <section className="section-heading"><div><p className="eyebrow"><MessageCircle size={14} /> Care communication</p><h1>Messages, incidents & handover</h1><p>Medication incidents, administration notes and clear information for the next carer.</p></div><Button onClick={() => setComposeOpen(true)}><Plus /> Add note or incident</Button></section>

      <article className="pinned-management-banner"><div className="pin-icon"><Pin /></div><div><span>PINNED BY MANAGEMENT · {home.name}</span><strong>Current instruction for all carers</strong><p>{home.pinnedNote}</p></div></article>

      <section className="message-controls"><label><span>Client</span><select onChange={(event) => setClientId(event.target.value)} value={clientId}><option value="all">All clients</option>{home.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><div className="message-tabs">{(['all','incident','handover','management'] as const).map((item) => <button aria-pressed={type === item} key={item} onClick={() => setType(item)} type="button">{item === 'all' ? 'All messages' : item}</button>)}</div></section>

      {notice ? <output className="success-notice"><Check size={16} /> {notice}<button aria-label="Dismiss" onClick={() => setNotice('')} type="button">×</button></output> : null}

      <section className="message-feed">
        {messages.map((message) => <article className={`message-card priority-${message.priority}`} key={message.id}><div className={`message-type-icon ${message.type}`}>{message.type === 'incident' ? <AlertTriangle /> : message.type === 'management' ? <Pin /> : <ClipboardPen />}</div><div><div className="message-card-meta"><Badge variant={message.type === 'incident' ? 'destructive' : message.type === 'management' ? 'default' : 'secondary'}>{message.type}</Badge><span>{message.clientName}</span><span>{message.date}</span>{message.pinned ? <span className="pinned-label"><Pin size={11} /> Pinned</span> : null}</div><h2>{message.title}</h2><p>{message.body}</p><footer><span><strong>{message.author}</strong>{message.role}</span><div><Button onClick={() => setNotice(`Reply thread opened for “${message.title}”.`)} size="sm" variant="ghost">Reply</Button>{canPin && !message.pinned ? <Button onClick={() => setNotice(`“${message.title}” pinned for this demo.`)} size="sm" variant="outline"><Pin /> Pin</Button> : null}</div></footer></div></article>)}
      </section>

      <aside className="role-permission-note"><LockKeyhole size={16} /><span><strong>{roleLabels[role]} access</strong>{canPin ? 'You can create, reply to and pin care-team communication.' : role === 'carer' ? 'You can add medication incidents and handover notes for the next shift.' : 'You can add and reply to medication-related communication for authorised clients.'}</span></aside>

      <Dialog onOpenChange={setComposeOpen} open={composeOpen}><DialogContent className="report-dialog"><DialogHeader><DialogTitle>Add medication communication</DialogTitle><DialogDescription>Use an incident for an error, omission, refusal or unexpected response. Use handover for next-shift context.</DialogDescription></DialogHeader><div className="prescription-form-grid"><label htmlFor="message-client"><span>Client</span><select id="message-client">{home.clients.map((client) => <option key={client.id}>{client.name}</option>)}</select></label><label htmlFor="message-type"><span>Message type</span><select id="message-type"><option>Handover note</option><option>Medication incident</option>{canPin ? <option>Management instruction</option> : null}</select></label><label className="form-span" htmlFor="message-title"><span>Title</span><Input id="message-title" placeholder="Short, specific heading" /></label><label className="form-span" htmlFor="message-details"><span>Details</span><textarea id="message-details" placeholder="What happened, what was administered, observations and who was notified" /></label><label className="form-span" htmlFor="message-action"><span>Action for next carer</span><Input id="message-action" placeholder="Monitoring, follow-up or escalation required" /></label></div><div className="dialog-actions"><Button onClick={() => setComposeOpen(false)} variant="ghost">Cancel</Button><Button onClick={() => { setComposeOpen(false); setNotice('Communication saved as a demo record.'); }}>Add to care record</Button></div></DialogContent></Dialog>
    </AppShell>
  );
}
