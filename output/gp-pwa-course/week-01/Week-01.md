# GP User Module — Implementation Lab

**Week 1 of 8 · Boot the complete interface and rebuild the shared shell**

**Objective:** Run the actual repository stack and reconstruct the shared GP page frame without losing the source styling.

## Setup / Prerequisites

PowerShell, Node 22.13 or newer (author used 22.23), npm 10, Python 3.12 recommended for the Django side. Internet is needed for a fresh npm/pip install. Use fictional fixture records. Estimated 5–7 hours in two sessions.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/package.json`, `frontend/vite.config.ts`, `frontend/app/layout.tsx`, `frontend/app/globals.css`, `frontend/components/role-provider.tsx`, `frontend/components/app-shell.tsx`.

## Laboratory Instructions

### (0) Create a separate course workspace and install the frontend

First make a runnable reference copy. This preserves the original application and gives you an exact visual target while you rebuild one file at a time in your learner copy.

```powershell
Set-Location 'C:\Users\pedim\OneDrive\Desktop\Side_projects\ADAC4CARE'
& '.\output\gp-pwa-course\New-CourseWorkspace.ps1' -Week 1 -Destination "$PWD\work\gp-pwa-learn"
Set-Location '.\work\gp-pwa-learn\frontend'
node --version
npm --version
npm ci
node node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --local --config wrangler.lab.json
npm run dev -- --host localhost --port 3200
```

**What the code does:** Keep this terminal running. Open http://localhost:3200. The snapshot contains the complete app, including shared role dependencies; its initial selected role is RN. Choose GP in the demo role selector. Do not create a new generic Next.js app: this repo runs Vinext on Vite with the Cloudflare plugin. The script refuses an existing destination. npm ci uses the included lockfile. The local migration command creates tables in this copy’s .wrangler/state tree.

**Integration contract:** The browser talks to the same-origin /api routes on port 3200. The DB binding is named DB in both the Vite config and wrangler.lab.json. This command does not use the remote database.

**Why this design:** One origin lets the browser use relative URLs and the server use a private database binding. A named binding is not a public API URL.

**What breaks if miswired:** Running migrations in the original frontend directory populates the wrong local database. A missing table produces a 503 from the chart route. If native helpers report spawn EPERM, run from a normal authorised terminal; do not rewrite the application to work around process permissions.

**General pattern:** Isolated working copy; same-origin backend-for-frontend.

**Expected result:** People and medication charts render in GP mode. Chart GET returns 200 with records, administrations and capability booleans.

**Verify before continuing:** In browser Network, inspect /api/prescriber-chart?home=banksia-house&client=james-miller. Record status, content type and body. Stop here if it is 503. Save a screenshot as your visual reference.

### (1) Boot the separate Django service and identify the boundary

Install the repository’s Python service so you can compare its contracts with the active chart API. This service is present in the repo but is not connected to the GP chart screen.

```powershell
Set-Location 'C:\Users\pedim\OneDrive\Desktop\Side_projects\ADAC4CARE\work\gp-pwa-learn\backend'
py -3.12 -m venv .venv
& '.\.venv\Scripts\python.exe' -m pip install -r requirements/dev.txt
$env:DJANGO_SETTINGS_MODULE = 'config.settings.dev'
$env:DJANGO_DEBUG = 'true'
$env:DATABASE_URL = "sqlite:///$((Join-Path $PWD 'gp-course.sqlite3') -replace '\\','/')"
& '.\.venv\Scripts\python.exe' manage.py migrate
& '.\.venv\Scripts\python.exe' manage.py runserver localhost:8100
```

**What the code does:** Use a second terminal. If Python 3.12 is not installed, install it first or deliberately select your compatible installed Python version. The author previously tested the separate service using the repo’s Python environment. Environment variables here precede settings import, which matters because security settings are computed during import. A fresh copied .env.example supplies placeholders, not credentials.

**Integration contract:** GET http://localhost:8100/api/medication-orders/ requires a Django authenticated session. An unauthenticated 403 is expected. Frontend NEXT_PUBLIC_API_URL is a legacy client setting and does not redirect relative chart fetches to this server.

**Why this design:** Proving both services boot is different from proving a bridge exists. The D1 chart uses string fixture IDs and versioned JSON; Django uses UUIDs and relational medication orders.

**What breaks if miswired:** Changing the frontend base URL alone cannot map IDs, DTO fields, sessions, CSRF or revision semantics. This repo has no completed GP login/MFA bridge to teach as an existing feature.

**General pattern:** Explicit service boundary; adapter required between different domain contracts.

**Expected result:** Django starts and migrations apply. An unauthenticated request is rejected; the frontend chart continues to use port 3200.

**Verify before continuing:** Inspect lib/api-client.ts and search its imports. Compare the Network request URL with NEXT_PUBLIC_API_URL. Write down why no JWT should be added just because another tutorial used one.

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

### (3) Assemble sidebar, header, menu and responsive frame

Rebuild the shell around the original CSS. Keeping the actual class names and primitives is what reproduces the main source interface.

**Source:** `source/frontend/components/app-shell.tsx`, lines 1–47. Verbatim chunk; assemble with the other chunks in the accompanying complete file.

```tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SyntheticEvent, useEffect, useRef, useState } from 'react';
import {
  Activity,
  Bell,
  Building2,
  ClipboardCheck,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { groupHomes, roleLabels } from '@/data/demo';
import type { UserRole } from '@/data/demo/types';
import { useRole } from '@/components/role-provider';

const navItems = [
  { label: 'Overview', href: '/', icon: LayoutDashboard, roles: ['carer', 'rn', 'management'] },
  { label: 'Medication round', href: '/medication-round', icon: ClipboardCheck, roles: ['carer', 'rn'] },
  { label: 'People', href: '/people', icon: Users, roles: ['carer', 'rn', 'management', 'gp', 'pharmacist'] },
  { label: 'Medication charts', href: '/medication-charts', icon: FileText, roles: ['carer', 'rn', 'gp', 'pharmacist'] },
  { label: 'Medication audit', href: '/medication-audit', icon: ShieldCheck, roles: ['carer', 'rn', 'management'] },
  { label: 'Clinical reports', href: '/reports', icon: Activity, roles: ['rn', 'management', 'gp', 'pharmacist'] },
  { label: 'Messages & incidents', href: '/messages', icon: MessageCircle, roles: ['carer', 'rn', 'management', 'gp', 'pharmacist'], count: 3 },
] satisfies Array<{ label: string; href: string; icon: typeof LayoutDashboard; roles: UserRole[]; count?: number }>;

const personas: Record<UserRole, { name: string; initials: string; label: string }> = {
  carer: { name: 'Mason Reed', initials: 'MR', label: 'Support worker' },
  rn: { name: 'Emma Kelly', initials: 'EK', label: 'Registered nurse' },
  management: { name: 'Ava Thompson', initials: 'AT', label: 'Home manager' },
  gp: { name: 'Dr Priya Nair', initials: 'PN', label: 'General practitioner' },
  pharmacist: { name: 'Nadia Russo', initials: 'NR', label: 'Pharmacist' },
};

function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
```

**Source:** `source/frontend/components/app-shell.tsx`, lines 78–151. Verbatim chunk; assemble with the other chunks in the accompanying complete file.

```tsx
  const [search, setSearch] = useState('');
  const home = groupHomes.find((item) => item.id === homeId) ?? groupHomes[0];
  const persona = personas[role];
  const visibleNav = navItems.filter((item) => item.roles.includes(role));

  const submitSearch = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/people?q=${encodeURIComponent(query)}` : '/people');
  };

  const changeRole = (nextRole: UserRole) => {
    setRole(nextRole);
    const currentArea = navItems.find((item) => item.href === '/' ? pathname === '/' : pathname.startsWith(item.href));
    if (currentArea && !currentArea.roles.includes(nextRole)) {
      router.push(nextRole === 'gp' || nextRole === 'pharmacist' ? '/people' : '/');
    }
  };

  return (
    <div className="app-shell">
      <CustomCursor />
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-mark">
          <div className="brand-icon"><HeartPulse size={21} /></div>
          <div><strong>ADAC4CARE</strong><span>Medication management</span></div>
        </div>

        <label className="home-select-shell">
          <span className="home-switcher-icon"><Building2 size={17} /></span>
          <span className="home-select-copy"><small>Current home</small><select aria-label="Current group home" onChange={(event) => setHomeId(event.target.value)} value={home.id}>{groupHomes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></span>
        </label>

        <nav aria-label="Primary navigation">
          <p className="nav-label">Workspace · {roleLabels[role]}</p>
          {visibleNav.map(({ label, href, icon: Icon, count }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link className={`nav-item ${active ? 'active' : ''}`} href={href} key={href} onClick={() => setMobileOpen(false)}>
                <Icon size={18} strokeWidth={1.9} /><span>{label}</span>{count ? <span className="nav-count">{count}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="safety-card"><span><ShieldCheck size={17} /> Clinical access active</span><p>Your role controls prescribing, review, signing and reporting actions.</p></div>
          <label className="role-switcher">
            <Avatar size="lg"><AvatarFallback className="bg-white text-[#5A7440]">{persona.initials}</AvatarFallback></Avatar>
            <span><small>Demo access level</small><select aria-label="Demo access level" onChange={(event) => changeRole(event.target.value as UserRole)} value={role}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></span>
          </label>
          <div className="persona-caption"><strong>{persona.name}</strong><span>{persona.label}</span></div>
        </div>
      </aside>

      {mobileOpen ? <button aria-label="Close navigation" className="nav-scrim" onClick={() => setMobileOpen(false)} type="button" /> : null}

      <main className="main-content">
        <header className="topbar">
          <Button aria-label="Open navigation" className="mobile-menu" onClick={() => setMobileOpen(true)} size="icon" variant="ghost"><Menu /></Button>
          <form className="search-box" onSubmit={submitSearch}>
            <Search size={17} /><input aria-label="Search clients" onChange={(event) => setSearch(event.target.value)} placeholder="Search clients across this home" value={search} /><kbd>↵</kbd>
          </form>
          <div className="topbar-context"><span>{home.name}</span><small>{home.suburb}</small></div>
          <div className="topbar-actions">
            <Button aria-label="Open messages and notifications" className="notification-button" onClick={() => router.push('/messages')} size="icon" variant="ghost"><Bell /><span /></Button>
            <Link className="clinical-directory-link" href="/people"><Stethoscope size={16} /> Care directory</Link>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
```

**What the code does:** Recreate components/app-shell.tsx using its complete companion file; the omitted CustomCursor chunk is in that file. Keep app/globals.css intact initially, then study its sidebar, topbar, summary-grid, workspace-grid and media-query sections. Keep the imported UI primitives. The navigation array is a declarative menu; pathname controls active styling, while role controls inclusion. The mobile button toggles a drawer and scrim. Search trims text, URL-encodes it and routes to People.

**Integration contract:** The shell turns a search form into /people?q=encodedText. The receiving page owns filtering. Link hrefs are the contract between menu entries and filesystem routes.

**Why this design:** A declarative array centralises labels, icons and visibility. Shared shell reuse prevents each page from drifting into a different interface.

**What breaks if miswired:** Changing class names without changing CSS loses layout. Removing all non-GP source files can break shared imports. Hiding a menu entry does not protect its API. Overview is absent from the original GP menu; Week 2 deliberately adds it.

**General pattern:** Shared application shell; declarative role-based navigation; URL-carried state.

**Expected result:** The green sidebar, home selector, header search, role menu, GP persona and page area match the supplied source. At narrow width the sidebar becomes a drawer.

**Verify before continuing:** Use keyboard Tab to reach menu/search controls. Search James, then use Back. Resize to 390px and 1024px. Record the visible GP menu before applying Week 2.

## Appendix

Toolchain: React 19.2.6, Vinext 1.0.0-beta.5, Vite 8.0.13, TypeScript 5.9.3, Tailwind 4.2.1. D1 is the active GP persistence store; Drizzle supplies schema/migrations. Django 5.2.6 and DRF 3.16.1 are separate. No clone URL is supplied because frontend/.git has no remote. Use the included source snapshot or the local repo path above. Stop dev servers with Ctrl+C; keep the learner folders and databases for next week.

### Endpoint quick reference

| Method / route | Purpose | Access and response |
|---|---|---|
| GET /api/prescriber-chart?home=…&client=… | Latest chart and administrations | Authenticated; 200 capability envelope; 401/404/503 |
| PATCH /api/prescriber-chart?home=…&client=… | Append prescription revision | GP write + same origin; 200 record; 400/403/404/409/413/503 |
| POST /api/chart-administrations?home=…&client=… | Shared staff signature path | Carer only; GP reads history through chart GET |
| GET /api/clinical-records?home=… | Week 6 report/message list | Authenticated; 200 records/canCreate; 401/404/503 |
| POST /api/clinical-records?home=… | Week 6 GP instruction/note | GP + same origin; 201 create/200 retry; 400/403/404/409/413/503 |
| GET /api/medication-orders/ on Django | Separate relational API | Django session required; not called by chart UI |

### Storage and configuration

| Item | Meaning |
|---|---|
| prescription_revisions | home/client/medication/version key; prescription JSON, actor and saved_at |
| administration_signatures | home/client/medication/cell key; order version and signed event |
| gp_communications (Week 6) | UUID, home/client, kind, original request, returned record, actor, creation time |
| DB | Private D1 runtime binding; migrations and dev server must share local state location |
| ADAC_GP_EMAILS | Server GP allowlist for hosted identity; local development deliberately bypasses it |
| ADAC_CARER_EMAILS | Shared carer allowlist; does not grant GP administration actions |
| NEXT_PUBLIC_API_URL | Legacy Django client URL; not used by relative chart fetches |
| NEXT_PUBLIC_SITE_URL | Root metadata base; local example is port 3000 and may be set to port 3200 for this course |
| DJANGO_SETTINGS_MODULE / DJANGO_DEBUG / DATABASE_URL | Separate Python service settings; set before launching Django |

**Source provenance:** Snapshot of the actual repository inspected 10 September 2026; frontend commit c53e0eaccf0d9771a9babfada1fab6de8b1f35f3. Full original files are under source; new teaching code is under extensions/week-02, week-06 and week-07. source-manifest.json records hashes. Integration-Reference.md preserves the detailed first lab for deeper chart/Django explanations.
