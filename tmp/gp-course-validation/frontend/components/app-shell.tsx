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
  { label: 'Overview', href: '/', icon: LayoutDashboard, roles: ['carer', 'rn', 'management', 'gp'] },
  { label: 'Medication round', href: '/medication-round', icon: ClipboardCheck, roles: ['carer', 'rn'] },
  { label: 'People', href: '/people', icon: Users, roles: ['carer', 'rn', 'management', 'gp', 'pharmacist'] },
  { label: 'Medication charts', href: '/medication-charts', icon: FileText, roles: ['carer', 'rn', 'gp', 'pharmacist'] },
  { label: 'Medication audit', href: '/medication-audit', icon: ShieldCheck, roles: ['carer', 'rn', 'management'] },
  { label: 'Clinical reports', href: '/reports', icon: Activity, roles: ['rn', 'management', 'gp', 'pharmacist'] },
  { label: 'Messages & incidents', href: '/messages', icon: MessageCircle, roles: ['carer', 'rn', 'management', 'gp', 'pharmacist'], count: undefined },
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

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor || !window.matchMedia('(pointer: fine)').matches) return;
    const move = (event: PointerEvent) => {
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      cursor.dataset.visible = 'true';
    };
    const over = (event: PointerEvent) => {
      cursor.dataset.active = event.target instanceof Element && event.target.closest('button, a, input, label, select') ? 'true' : 'false';
    };
    const leave = () => { cursor.dataset.visible = 'false'; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerover', over);
    document.documentElement.addEventListener('mouseleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerover', over);
      document.documentElement.removeEventListener('mouseleave', leave);
    };
  }, []);

  return <div aria-hidden="true" className="custom-cursor" ref={cursorRef}><span /></div>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, setRole, homeId, setHomeId } = useRole();
  const [mobileOpen, setMobileOpen] = useState(false);
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
