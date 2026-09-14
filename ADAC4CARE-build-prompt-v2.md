# ADAC4CARE — Website Build Prompt (v2: Full Stack + Repo Structure)

## Project Overview

Build **ADAC4CARE** — a digital medication management platform for Supported Independent Living (SIL) homes. Primary users are **Registered Nurses (RNs), support workers, and carers**, replacing an outdated, error-prone paper-based medication charting system with a reliable, web-based electronic medication administration (EMM) workflow.

**Functional reference:** Model core functionality on **EMMA by Compact Systems Australia** — an Electronic Medication Management system built for NDIS disability and community care providers. Match the category of features, not the branding.

**Visual reference:** Model the aesthetic on **Craft.do** — minimalist, generous white space, soft rounded elements, calm and uncluttered, content-first design suited to a clinical/professional tool.

**Delivery form factor:** Responsive web app, architected so it can become a **PWA** later (installable, offline caching, push notifications) without a rewrite — supports shared shift tablets/PCs in group homes with variable connectivity.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | **Next.js** (App Router, TypeScript) | Server-side rendering for fast loads on shift tablets; PWA-ready |
| Backend | **Django** + Django REST Framework | Built-in admin, ORM, migrations, auth scaffolding — reduces custom code for compliance-critical features |
| Database | **PostgreSQL** | Strong relational integrity; required for audit-trail history and role-based data models |
| Hosting | **Microsoft Azure**, Australian region (Australia East / Australia Southeast) | For data residency aligned with Privacy Act 1988 / Australian Privacy Principles (APPs) |
| Auth | Django auth + **django-allauth** or **Azure AD B2C**, with MFA enforced for RN/admin roles | Do not roll custom auth from scratch |
| Audit logging | **django-auditlog** or **django-simple-history** | Every read/write to a medication record must be logged: who, what, when |
| API contract | DRF + **drf-spectacular** (OpenAPI schema) | Needed for future pharmacy/prescriber system integrations |
| CI/CD | GitHub Actions → Azure App Service / Azure Static Web Apps | Separate pipelines for frontend and backend |

---

## Repository Structure (Industry-Standard Monorepo)

Use a monorepo with clearly separated `frontend/` and `backend/` codebases, shared docs, and infra-as-code. This keeps the repo clean, onboarding-friendly, and CI/CD-simple.

```
adac4care/
├── README.md
├── LICENSE
├── .gitignore
├── .editorconfig
├── docker-compose.yml              # local dev: postgres + backend + frontend
├── .github/
│   └── workflows/
│       ├── frontend-ci.yml
│       ├── backend-ci.yml
│       └── deploy-azure.yml
│
├── docs/
│   ├── architecture.md             # system diagram, data flow
│   ├── compliance.md               # NDIS / Privacy Act / audit requirements
│   ├── api-spec.md                 # generated OpenAPI reference
│   └── design-system.md            # colour palette, typography, components
│
├── frontend/                       # Next.js app
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── .env.example
│   ├── public/
│   │   └── assets/                 # logos, icons, PWA manifest
│   ├── src/
│   │   ├── app/                    # App Router pages/layouts
│   │   │   ├── (auth)/             # login, MFA, password reset
│   │   │   ├── (dashboard)/
│   │   │   │   ├── clients/        # client medication profiles
│   │   │   │   ├── charts/         # electronic medication charts
│   │   │   │   ├── reports/        # by client / home / org
│   │   │   │   └── admin/          # roles, permissions, org oversight
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/                 # buttons, cards, inputs (design system)
│   │   │   └── domain/             # MedicationCard, ChartRow, AlertBanner, etc.
│   │   ├── lib/
│   │   │   ├── api-client.ts       # typed API wrapper for Django backend
│   │   │   └── auth.ts
│   │   ├── hooks/
│   │   ├── styles/
│   │   │   └── theme.ts            # colour tokens: #B19CD7, #F7F5FB, #C2D79C
│   │   └── types/                  # shared TS types (mirrors DRF serializers)
│   └── tests/
│
├── backend/                         # Django project
│   ├── manage.py
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── dev.txt
│   │   └── production.txt
│   ├── .env.example
│   ├── config/                      # project settings module
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── dev.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   └── wsgi.py / asgi.py
│   ├── apps/
│   │   ├── accounts/                # users, roles (RN / carer / coordinator), MFA
│   │   ├── clients/                 # resident/client profiles, SIL home mapping
│   │   ├── medications/             # medication charts, orders, PRN protocols
│   │   ├── administration/          # dose events, 8-Rights checks, timestamps
│   │   ├── audit/                   # audit trail models (append-only)
│   │   ├── reporting/               # report generation endpoints
│   │   └── messaging/               # pharmacy/prescriber/care-team comms
│   └── tests/
│
└── infra/                           # Infrastructure as Code
    ├── azure/
    │   ├── bicep/  (or terraform/)
    │   │   ├── app-service.bicep
    │   │   ├── postgres.bicep
    │   │   └── networking.bicep
    │   └── README.md
    └── scripts/
        └── deploy.sh
```

**Conventions to enforce:**
- One Django app per bounded domain (`accounts`, `clients`, `medications`, `administration`, `audit`, `reporting`, `messaging`) — not one giant `core` app.
- Frontend routes grouped by role-relevant sections under `(dashboard)`, mirroring backend app boundaries.
- `audit` app is append-only: no updates/deletes on records, only inserts — this is what gives you a real compliance trail.
- Environment secrets never committed — `.env.example` only, real secrets in Azure Key Vault.
- Every model in `medications`/`administration` must reference the **8 Rights of Medication Administration** (patient, drug, dose, route, time, documentation, reason, response) as explicit fields or validation logic, not just UI copy.

---

## Core Functionality (based on EMMA)

- Electronic medication charts per client/resident, replacing paper charts
- Real-time administration tracking with alerts/prompts enforcing the 8 Rights
- Role-based access: RN, support worker/carer, coordinator/admin — distinct permissions and views
- Central oversight dashboard across multiple SIL homes, clients, and care teams
- Reporting suite filterable by client, home, and organisation, real-time data
- Immutable audit trail for every administration, edit, and communication
- Pharmacy/prescriber messaging tied to each client's chart
- Full client medication profiles: history, current orders, allergies, PRN protocols, notes
- NDIS medication management framework alignment
- Device-agnostic, responsive on desktop/tablet/mobile
- Guided paper-to-digital onboarding/import flow

---

## Design System

### Colour Palette
- **Primary:** `#B19CD7` (soft lavender)
- **Background:** `#F7F5FB` (near-white, lavender-tinted)
- **Menu / toolbar:** `#C2D79C` (soft sage) — the near-exact HSL complement of `#B19CD7` (≈261° vs ≈81° hue), used for nav bar, side menu, and toolbar surfaces to visually separate navigation from content
- Restrict palette to these three plus neutral greys, and one muted red/amber reserved strictly for medication warnings, missed doses, or errors

### Typography & Layout
- Craft.do-style minimalism: generous white space, soft rounded corners, light shadows over hard borders, restrained colour blocking
- Clean sans-serif, clear type hierarchy, comfortable line-height for at-a-glance legibility during shifts
- Grid-based, uncluttered dashboards — avoid dense legacy-medical-software tables; prioritise scannability

### Cursor & Interaction Design
- Custom cursor: grey, with a white padding/halo (soft circular cushion)
- Hover on any button/menu item: smooth animation — cursor/element subtly scales, white padding softly expands, target transitions colour/elevation (soft shadow lift or shift toward lavender/sage accents)
- Transitions 150–250ms ease — calm and professional, never flashy

---

## Target Users
- **RNs** — oversight, reporting, audit access, chart review/approval
- **Support workers / carers** — fast, low-friction shift-floor medication administration with error-reducing prompts
- **SIL home coordinators/admins** — organisation-wide visibility across homes and clients

## Deliverable
A responsive, professional, minimalist Next.js + Django + PostgreSQL web application, hosted on Azure (Australian region), organised as a clean industry-standard monorepo per the structure above, reflecting the functionality, colour system, and interaction design specified — ready to demo to disability/community care providers as a modern replacement for paper-based medication charts.
