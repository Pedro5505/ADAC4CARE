import { env } from 'cloudflare:workers';

type ChartEnv = { DB: D1Database; ADAC_GP_EMAILS?: string; ADAC_CARER_EMAILS?: string };
export function chartDatabase() { return (env as unknown as ChartEnv).DB; }
export function gpEmails() { return (env as unknown as ChartEnv).ADAC_GP_EMAILS ?? ''; }
export function carerEmails() { return (env as unknown as ChartEnv).ADAC_CARER_EMAILS ?? ''; }
