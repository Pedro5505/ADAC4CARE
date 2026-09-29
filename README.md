# ADAC4CARE

ADAC4CARE is an early-stage medication-management project for Supported Independent Living (SIL) homes. It explores how support workers, registered nurses, and other authorised staff could view medication information and record administration with clearer checks and audit history.

The repository contains a Django REST Framework API, PostgreSQL-based local configuration, a Docker Compose definition, tests for selected safety rules, and design and governance documentation. A TypeScript frontend is part of the project materials, but the root `frontend/` currently points to a submodule without a usable URL in this repository. The full application cannot yet be reproduced from a standard clone using the quick-start command below.

**Status:** engineering demonstrator. It has not been certified, clinically validated, or approved for real medication records or live care.

## What the code covers

- API resources for SIL homes, clients, medication orders, administration events, and chart-linked messages.
- Models and permissions for different staff roles and organisation-scoped access.
- Medication administration fields for patient, drug, dose, route, and time confirmations, plus documentation, reason, and response.
- Audit and administration records designed to preserve event history.
- A small backend test suite covering audit-event deletion, a missing administration safety check, and selected role permissions.
- Draft architecture, API, design-system, and compliance guidance.

These are descriptions of code and design intent, not evidence of a completed clinical workflow or production security controls.

## Repository layout

| Path | Purpose |
| --- | --- |
| `backend/` | Django REST Framework application, models, API routes, settings, and tests |
| `docs/` | Architecture, API, design-system, and clinical governance notes |
| `infra/azure/` | Azure infrastructure definitions and deployment guidance |
| `docker-compose.yml` | Local PostgreSQL, backend, and frontend service definitions |
| `frontend/` | Currently a submodule pointer; see the setup limitation below |
| `output/gp-lab/` | Separate GP workflow lab materials, including a frontend source copy |


## Architecture and safety approach

The intended separation is a web client calling a Django REST Framework API backed by PostgreSQL. The backend groups code by accounts, clients, medications, administration, audit, reporting, and messaging. `docs/architecture.md` describes the proposed data flow and a future PWA/offline path.

Some controls described in the documentation, including production MFA enforcement, Azure hosting, offline reconciliation, and clinical release checks, are requirements or plans. They should not be read as deployed or independently validated features. See `docs/compliance.md` for work identified before any live pilot.


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

## Why I built it

The project applies software development to a workflow familiar from Supported Independent Living: giving staff a clearer way to work with medication information while keeping safety, access, and traceability visible in the design. It demonstrates domain-informed requirements, API and data modelling, role-based permissions, and awareness of the work needed before software could be used in care.
