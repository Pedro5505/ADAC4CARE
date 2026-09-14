# GP and support worker medication charts

The GP regular-medication view follows `routine_medication_chart_template.xlsx`, Sheet1:

- A3:F4: Regular Medicine Orders 1 to 8.
- G3:G4: Dates / Time; H3:V4: days 1–15.
- Eight blocks of six administration lines, beginning at rows 5, 11, 17, 23, 29, 35, 41 and 47.
- Each block merges the medicine name across A:E, with dose in F; signature in A:D, start date in E, route in F; the lower A:D area remains available for save feedback, with stop date in E and frequency in F.
- Refer PRN and six prescribed administration times are editable by the GP. All administration signatures are read-only for the GP. A month and second-half selector allow access to later dates without changing the default template.

Prescriber text saves on leaving a cell. The signature dialog starts blank and saves the drawing after a one-second pause or on Done. It reports save errors, supports retry and clear, and does not report success until the server acknowledges storage. Clearing the drawing box does not delete the last saved signature. Changing a prescription field clears the current signature; previous signed versions remain in storage.

Both GP and support workers/carers use the same table structure. Carers select the + in an empty routine administration cell or PRN Initial cell, then draw their signature/initials or choose Type initials for keyboard entry (1–6 letters). A separate blank dialog opens for each cell. The saved drawing or text fits within that cell and is immutable after confirmation. Populated existing orders can be administered without first adding a new GP drawing in this app; blank orders, ceased orders, dates outside the prescription period and future dates cannot be signed. Carers cannot edit prescription details, Refer PRN, prescribed times, or existing staff signatures. The GP cannot sign administration cells. RN, pharmacist and management chart workflows remain as previously implemented, pending a separate requested rollout.

The PRN view follows `PRN_medication_chart_template1.xlsx`, H17:AD66: eight six-line medicine blocks, a prescriber section, Instruction / MAX dose per 24 hours, and four Date / Time / Qty / Initial groups. PRN Date and Time are recorded by the server when a carer signs; Qty comes from the existing prescribed quantity, or the dose for a newly entered order. Only the Initial cell is interactive for carers. Historical records retain their original times when the GP changes a schedule; they are shown separately rather than moved into another time cell.

## Storage and permissions

The hosted Sites frontend uses D1 (`DB`) for this evaluation feature. `prescription_revisions` is append-only through the API, partitioned by home, client and medicine with an optimistic version check. `administration_signatures` uniquely identifies each signed cell by home, client, medicine and cell key and binds it to the prescription version seen by the carer. A duplicate attempt cannot replace an existing signature; retrying an identical request is idempotent. Every save records the server's actor and timestamp. No signature or clinical record is stored in browser storage. The chart refreshes on focus and every 15 seconds while visible.

Hosted prescription writes require Sites-authenticated identity, an email explicitly configured in `ADAC_GP_EMAILS`, the GP view, and a same-origin request. Administration writes require `ADAC_CARER_EMAILS`, the carer view, a populated current prescription, and confirmation of administration. Existing demo orders use version 0 until first edited by a GP; atomic version checks also protect those orders from concurrent amendments. The role selector alone cannot grant either permission. Other authenticated site viewers can read. Empty allowlists deny hosted writes. Local development permits evaluation via the role selector; this bypass is removed by the production build. Provision evaluator identities separately from clinical staff identities.

This remains the app's fictional demo population. The separate Django/Azure API is not connected to these D1 evaluation records. Do not treat the selectable demo personas as verified clinical identities, and do not use evaluation records as clinical authorisations.

## Checks

- `node --experimental-strip-types --test tests/prescriber-chart.test.ts`
- `node tests/chart-administrations.mjs` (production permissions and actual SQL against isolated in-memory SQLite)
- `npx tsc --noEmit`
- `npm run build`
- Apply the generated Drizzle migration locally before exercising the API. Production Sites applies packaged migrations at deployment.
