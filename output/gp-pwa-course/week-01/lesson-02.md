# GP User Module — Implementation Lab

**Week 1 of 8 · Boot the complete interface and rebuild the shared shell**

**Objective:** Run the actual repository stack and reconstruct the shared GP page frame without losing the source styling.

## Setup / Prerequisites

PowerShell, Node 22.13 or newer (author used 22.23), npm 10, Python 3.12 recommended for the Django side. Internet is needed for a fresh npm/pip install. Use fictional fixture records. Estimated 5–7 hours in two sessions.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/package.json`, `frontend/vite.config.ts`, `frontend/app/layout.tsx`, `frontend/app/globals.css`, `frontend/components/role-provider.tsx`, `frontend/components/app-shell.tsx`.

## Laboratory Instructions

### (2) Rebuild layout and role context

Recreate the root document, provider and shared role state. These are prerequisites for every GP page, so learn them before touching individual cards.

**Source:** `source/frontend/app/layout.tsx`, lines 1–26. Complete file.

```tsx
import type { Metadata } from 'next';
import { RoleProvider } from '@/components/role-provider';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'ADAC4CARE | Medication management',
  description: 'Safer, calmer medication management for disability and community care.',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'ADAC4CARE | Medication management',
    description: 'Safer medication management for every shift.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'ADAC4CARE medication management' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ADAC4CARE | Medication management',
    description: 'Safer medication management for every shift.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-AU"><body><RoleProvider>{children}</RoleProvider></body></html>;
}
```

**Source:** `source/frontend/components/role-provider.tsx`, lines 1–45. Complete file.

```tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { UserRole } from '@/data/demo/types';

type RoleContextValue = {
  role: UserRole;
  setRole: (role: UserRole) => void;
  homeId: string;
  setHomeId: (homeId: string) => void;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('rn');
  const [homeId, setHomeIdState] = useState('banksia-house');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedRole = window.localStorage.getItem('adac4care-role') as UserRole | null;
      const savedHome = window.localStorage.getItem('adac4care-home');
      if (savedRole && ['carer', 'rn', 'management', 'gp', 'pharmacist'].includes(savedRole)) setRoleState(savedRole);
      if (savedHome) setHomeIdState(savedHome);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const setRole = (nextRole: UserRole) => {
    setRoleState(nextRole);
    window.localStorage.setItem('adac4care-role', nextRole);
  };
  const setHomeId = (nextHome: string) => {
    setHomeIdState(nextHome);
    window.localStorage.setItem('adac4care-home', nextHome);
  };

  return <RoleContext.Provider value={{ role, setRole, homeId, setHomeId }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within RoleProvider');
  return context;
}
```

**What the code does:** In your learner copy, back up these two files outside app/components, recreate them from these complete blocks, then reload. layout.tsx exports metadata and wraps children in RoleProvider. The provider owns role/home preferences and writes only those preferences to localStorage. useRole throws outside its provider, making a missing ancestor immediately visible.

**Integration contract:** Context exposes role, setRole, homeId and setHomeId to client components. These values control presentation and selection. They are not a server credential.

**Why this design:** A shared provider keeps the header, sidebar and route content in agreement without passing four props through every component. Deferring preference reads avoids accessing window during server rendering.

**What breaks if miswired:** Placing useRole above its provider throws. Importing a browser-only API at module scope breaks server rendering. Treating the saved role as authorisation would let a user grant themselves GP access.

**General pattern:** Provider/context state ownership; presentation role versus server authority.

**Expected result:** Changing the home updates all shell controls. Reload preserves the selected home and role.

**Verify before continuing:** Inspect localStorage: only adac4care-role and adac4care-home should be added by this provider. Confirm no prescription JSON is written there.

## Appendix

Toolchain: React 19.2.6, Vinext 1.0.0-beta.5, Vite 8.0.13, TypeScript 5.9.3, Tailwind 4.2.1. D1 is the active GP persistence store; Drizzle supplies schema/migrations. Django 5.2.6 and DRF 3.16.1 are separate. No clone URL is supplied because frontend/.git has no remote. Use the included source snapshot or the local repo path above. Stop dev servers with Ctrl+C; keep the learner folders and databases for next week.
