export type UserRole = 'RN' | 'CARER' | 'COORDINATOR' | 'ADMIN';

export const can = (role: UserRole, permission: 'administer' | 'approve' | 'audit' | 'manage') => {
  const rules: Record<UserRole, string[]> = {
    RN: ['administer', 'approve', 'audit'],
    CARER: ['administer'],
    COORDINATOR: ['administer', 'audit'],
    ADMIN: ['administer', 'approve', 'audit', 'manage'],
  };
  return rules[role].includes(permission);
};
