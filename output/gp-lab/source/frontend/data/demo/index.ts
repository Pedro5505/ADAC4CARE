import banksia from './banksia-house.json';
import grevillea from './grevillea-house.json';
import jacaranda from './jacaranda-house.json';
import waratah from './waratah-house.json';
import type { GroupHome } from './types';

export const groupHomes = [banksia, grevillea, jacaranda, waratah] as GroupHome[];

export function getHome(homeId?: string | null) {
  return groupHomes.find((home) => home.id === homeId) ?? groupHomes[0];
}

export function getClient(clientId?: string | null) {
  for (const home of groupHomes) {
    const client = home.clients.find((item) => item.id === clientId);
    if (client) return { client, home };
  }
  return { client: groupHomes[0].clients[0], home: groupHomes[0] };
}

export const roleLabels = {
  carer: 'Support worker / carer',
  rn: 'Registered nurse',
  management: 'Group home management',
  gp: 'General practitioner',
  pharmacist: 'Pharmacist',
} as const;
