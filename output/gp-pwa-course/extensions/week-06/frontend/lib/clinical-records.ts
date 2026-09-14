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
