import { groupHomes } from '@/data/demo';
export function chartContext(url: URL) {
  const home = groupHomes.find((item) => item.id === url.searchParams.get('home'));
  const client = home?.clients.find((item) => item.id === url.searchParams.get('client'));
  return home && client ? { home, client } : null;
}
export const chartJson = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
