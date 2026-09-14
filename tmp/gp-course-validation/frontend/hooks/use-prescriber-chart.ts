'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdministrationInput, AdministrationRecord, ChartRecord, ChartResponse, Prescription } from '@/lib/prescriber-chart';
import type { UserRole } from '@/data/demo/types';

export function usePrescriberChart(home: string, client: string, role: UserRole) {
  const [records, setRecords] = useState<Record<string, ChartRecord>>({});
  const [loaded, setLoaded] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [canSign, setCanSign] = useState(false);
  const [administrations, setAdministrations] = useState<AdministrationRecord[]>([]);
  const [error, setError] = useState('');
  const recordsRef = useRef(records);
  const saving = useRef(false);
  const endpoint = `/api/prescriber-chart?home=${encodeURIComponent(home)}&client=${encodeURIComponent(client)}`;
  const reload = useCallback(async () => {
    if (saving.current) return;
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const data = await response.json() as ChartResponse & { error?: string };
      if (!response.ok) throw new Error(data.error);
      // Do not overwrite a newer save with a read that started before it.
      if (saving.current) return;
      const result = data as ChartResponse;
      setRecords((previous) => {
        const next = { ...previous };
        for (const record of result.records) if ((next[record.medicationId]?.version ?? 0) <= record.version) next[record.medicationId] = record;
        recordsRef.current = next;
        return next;
      });
      setAllowed(result.canPrescribe);
      setCanSign(result.canAdminister);
      setAdministrations((previous) => {
        const merged = new Map(previous.map((record) => [`${record.medicationId}:${record.cellKey}`, record]));
        for (const record of result.administrations) merged.set(`${record.medicationId}:${record.cellKey}`, record);
        return [...merged.values()];
      });
      setLoaded(true);
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load saved prescriptions.'); }
  }, [endpoint]);
  useEffect(() => {
    void reload();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void reload(); }, 15000);
    window.addEventListener('focus', reload);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', reload); };
  }, [reload]);

  const save = async (medicationId: string, prescription: Prescription, expectedVersion: number) => {
    if (!loaded || !allowed || role !== 'gp') throw new Error('Only an authorised GP can edit this section.');
    if (saving.current) throw new Error('Please wait for the current save to finish.');
    saving.current = true;
    try {
      const response = await fetch(endpoint, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Chart-Role': role },
        body: JSON.stringify({ medicationId, prescription, version: expectedVersion }),
      });
      const result = await response.json() as ChartRecord & { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Changes were not saved.');
      const record = result as ChartRecord;
      recordsRef.current = { ...recordsRef.current, [medicationId]: record };
      setRecords(recordsRef.current);
      return record;
    } finally { saving.current = false; }
  };
  const signAdministration = async (input: AdministrationInput) => {
    if (!loaded || !canSign || role !== 'carer') throw new Error('Only an authorised carer can sign this cell.');
    const response = await fetch(endpoint.replace('/prescriber-chart?', '/chart-administrations?'), {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Chart-Role': role }, body: JSON.stringify(input),
    });
    const result = await response.json() as AdministrationRecord & { error?: string };
    if (!response.ok) throw new Error(result.error ?? 'Signature was not saved.');
    setAdministrations((previous) => [...previous.filter((r) => r.medicationId !== result.medicationId || r.cellKey !== result.cellKey), result]);
  };
  return { records, administrations, loaded, error, reload, save, signAdministration, canPrescribe: loaded && allowed && role === 'gp', canAdminister: loaded && canSign && role === 'carer' };
}
