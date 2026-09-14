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
