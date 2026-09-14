# ADAC4CARE

ADAC4CARE is a medication management platform for Supported Independent Living homes. It gives registered nurses, support workers, and coordinators a safer digital workflow for medication charts, administration, oversight, and audit history.

The repository is an intentionally separated monorepo:

- `frontend/` — responsive Next.js-compatible App Router client, designed for shared shift tablets and desktop use.
- `backend/` — Django REST Framework API with domain-specific apps and append-only audit records.
- `docs/` — architecture, compliance, API, and design-system guidance.
- `infra/` — Azure infrastructure as code for Australian-region hosting.

## Quick start

1. Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env.local`.
2. Start PostgreSQL, Django, and the frontend with `docker compose up --build`.
3. Open `http://localhost:3000`; the API is available at `http://localhost:8000/api/`.

The interface currently uses realistic demo data. Before production use, complete the privacy, clinical governance, security, accessibility, and validation activities described in `docs/compliance.md`.

## Core safety principles

- Every administration records all eight medication rights.
- Medication and administration records are never silently overwritten.
- Audit events are append-only and capture read/write access.
- RN/admin access is designed for MFA enforcement.
- Secrets belong in local environment files and Azure Key Vault, never source control.

## Status

This repository is a production-oriented demonstrator and engineering foundation, not certified clinical software.
