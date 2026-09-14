# Architecture

## Context

ADAC4CARE is split into a presentation tier and a compliance-focused API tier. The boundary is an OpenAPI-described HTTPS interface so the clients can later include a PWA, pharmacy integrations, and supported mobile experiences.

```text
Shift tablet / desktop / mobile
            │ HTTPS + secure session
            ▼
      Next.js frontend
            │ DRF JSON API
            ▼
       Django service ───────── Azure Key Vault
        │     │     │
        │     │     └────────── Application Insights
        │     └──────────────── Azure Blob Storage (future documents)
        └────────────────────── Azure Database for PostgreSQL
```

## Domain boundaries

- `accounts`: identity, organisation membership, roles, and MFA policy flags.
- `clients`: organisations, SIL homes, people, allergies, and profile notes.
- `medications`: medication orders and PRN protocols; all eight medication rights are explicit.
- `administration`: immutable point-in-time administration facts and outcomes.
- `audit`: append-only access and mutation records without duplicating clinical payloads.
- `reporting`: organisation-, home-, and client-scoped aggregations.
- `messaging`: chart-linked care team, pharmacy, and prescriber communication.

## Data flow

1. The authenticated user selects a home and loads authorised clients and scheduled orders.
2. The API filters all queries by the user’s organisation.
3. Administration begins only after the interface presents all eight rights.
4. The API validates all required checks and creates an immutable administration event.
5. The audit middleware records the access and outcome as a separate append-only event.
6. Reports aggregate immutable events rather than mutable UI status.

## Resilience and PWA path

The current application is installability-ready through its web manifest and responsive shell. A later service worker should cache only the application shell and explicitly encrypted, minimum-necessary reference data. Clinical writes should enter a visible offline queue, require conflict-safe idempotency keys, and reconcile with the API before being represented as final.
