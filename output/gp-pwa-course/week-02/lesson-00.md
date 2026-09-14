# GP User Module — Implementation Lab

**Week 2 of 8 · GP home, overview cards and the patient directory**

**Objective:** Reproduce the complete home experience and connect its cards, patient selector and search to the correct GP routes.

## Setup / Prerequisites

Complete Week 1. Estimated 4–6 hours. Keep the original screen visible as your reference; all colours, spacing and component classes remain source-derived.

**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.

**Files for this week:** `frontend/components/app-shell.tsx`, `frontend/app/page.tsx`, `frontend/app/people/page.tsx`, `frontend/data/demo/index.ts`, `frontend/data/demo/types.ts`.

## Laboratory Instructions

### (0) Expose Overview for GP users

The original route exists, but the GP menu excludes it. Apply the small course extension so a GP can discover the home page through the same sidebar.

**Source:** `extensions/week-02/frontend/components/app-shell.tsx`, lines 27–36. Verbatim chunk; assemble with the other chunks in the accompanying complete file.

```tsx

const navItems = [
  { label: 'Overview', href: '/', icon: LayoutDashboard, roles: ['carer', 'rn', 'management', 'gp'] },
  { label: 'Medication round', href: '/medication-round', icon: ClipboardCheck, roles: ['carer', 'rn'] },
  { label: 'People', href: '/people', icon: Users, roles: ['carer', 'rn', 'management', 'gp', 'pharmacist'] },
  { label: 'Medication charts', href: '/medication-charts', icon: FileText, roles: ['carer', 'rn', 'gp', 'pharmacist'] },
  { label: 'Medication audit', href: '/medication-audit', icon: ShieldCheck, roles: ['carer', 'rn', 'management'] },
  { label: 'Clinical reports', href: '/reports', icon: Activity, roles: ['rn', 'management', 'gp', 'pharmacist'] },
  { label: 'Messages & incidents', href: '/messages', icon: MessageCircle, roles: ['carer', 'rn', 'management', 'gp', 'pharmacist'], count: undefined },
] satisfies Array<{ label: string; href: string; icon: typeof LayoutDashboard; roles: UserRole[]; count?: number }>;
```

**What the code does:** Edit the existing navItems declaration to match this chunk. The complete Week 2 shell file is included under extensions/week-02. The only presentation changes are adding gp to Overview and removing the hardcoded message count. Keep other roles and routes intact because shared components use them. The Bell remains a shortcut to Messages, not a push subscription.

**Integration contract:** The new menu entry targets /. No server permission changes accompany this UI addition.

**Why this design:** Navigation should expose an existing GP-relevant page without implying that a GP can sign administration records or run a medication round.

**What breaks if miswired:** Granting GP access to every menu item would expose actions outside this role’s intended scope. A badge with the number 3 would misleadingly look like a live unread count.

**General pattern:** Capability-aware presentation; honest notification affordance.

**Expected result:** GP sees Overview, People, Medication charts, Clinical reports and Messages & incidents.

**Verify before continuing:** Select another role then GP. Click Overview. Confirm the active item and home heading agree. Medication round and Medication audit should remain absent from the GP menu.

## Appendix

Week 2 extensions: components/app-shell.tsx and app/page.tsx only. Preserve the rest of the source. A ready-made comparison checkpoint is created with New-CourseWorkspace.ps1 -Week 2 and a new destination. It is a full reference snapshot, not evidence that you implemented the lesson yourself.
