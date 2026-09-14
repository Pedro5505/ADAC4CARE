# Compliance and clinical governance

This document is engineering guidance, not legal or clinical certification advice. Production release requires review by Australian privacy, cyber-security, medication-governance, and NDIS specialists.

## Baseline controls

- Host production data and backups in an approved Australian Azure region.
- Record the lawful basis, purpose, retention period, and access policy for each personal-information category.
- Collect only minimum necessary health information and keep it segregated by organisation.
- Enforce MFA for RN and administrator roles and use least-privilege authorisation for every API request.
- Encrypt data in transit and at rest; store application secrets in Azure Key Vault.
- Log every medication-record read and write with actor, resource, timestamp, action, request ID, and result.
- Make administration and audit records append-only. Corrections are new linked facts, never replacements.
- Test backup restoration, incident response, breach notification, access revocation, and audit export procedures.
- Establish clinical ownership for order approval, PRN protocols, missed-dose escalation, and chart reconciliation.

## Eight Rights

The medication order and administration event represent:

1. Right patient
2. Right drug
3. Right dose
4. Right route
5. Right time
6. Right documentation
7. Right reason
8. Right response

The API rejects administered outcomes when the required identity, drug, dose, route, or time confirmations are absent. Documentation, reason, and response remain mandatory for all outcomes.

## Australian obligations to assess

- Privacy Act 1988 and Australian Privacy Principles
- Notifiable Data Breaches scheme
- NDIS Practice Standards and Quality Indicators
- State and territory medicines and poisons legislation
- Records retention and health-record legislation applicable to each operating jurisdiction
- WCAG 2.2 AA accessibility conformance for the supported workforce

## Before a live pilot

Complete a privacy impact assessment, threat model, penetration test, clinical safety assessment, accessibility audit, disaster-recovery exercise, role/permission review, data-processing register, and end-to-end medication-round validation with representative support workers and RNs.
