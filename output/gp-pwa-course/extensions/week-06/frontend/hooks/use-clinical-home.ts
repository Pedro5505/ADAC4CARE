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
