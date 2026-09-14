# GP User Module — Implementation Lab

**Week 1 of 8 · Boot the complete interface and rebuild the shared shell**

**Objective:** Run the actual repository stack and reconstruct the shared GP page frame without losing the source styling.

## Setup / Prerequisites

PowerShell, Node 22.13 or newer (author used 22.23), npm 10, Python 3.12 recommended for the Django side. Internet is needed for a fresh npm/pip install. Use fictional fixture records. Estimated 5–7 hours in two sessions.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/package.json`, `frontend/vite.config.ts`, `frontend/app/layout.tsx`, `frontend/app/globals.css`, `frontend/components/role-provider.tsx`, `frontend/components/app-shell.tsx`.

## Laboratory Instructions

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
