# Completed author checks

Date: 10 September 2026. Source frontend commit: `c53e0eaccf0d9771a9babfada1fab6de8b1f35f3`. The outer workspace has no Git metadata and the frontend has no configured remote.

The original application source was not edited. `git -C frontend status --short` remained clean after verification.

| Check | Result |
| --- | --- |
| Scaffold helper | Created an isolated copy from whitelisted source directories/files; existing environment secrets and databases excluded. |
| Rebuild helper | Moved exactly nine GP files into an isolated reference tree; all nine restored with identical SHA-256 hashes. |
| Frontend domain and authorization tests | `node --experimental-strip-types --test tests/prescriber-chart.test.ts`: 10 passed. |
| Existing route/SQL harness | `node tests/chart-administrations.mjs`: passed, including hosted-mode role tests and actual SQL against in-memory SQLite. |
| TypeScript | `npx tsc --noEmit --incremental false`: exit 0. |
| Local D1 | Both existing migrations applied; server and CLI used the same local DB binding and persistence directory. |
| Frontend development server | Started on localhost:3100; medication chart page and GP GET returned 200. |
| New HTTP workflow helper | Passed role/origin guards, invalid-field rejection, create, stale-write conflict, signature stamping, invalid old-drawing reuse, unsigned amendment and readback. |
| SQL readback | regular-slot-8 version 1 = 10 mg, version 2 = 10 mg, version 3 = 20 mg; actor Local GP evaluation. |
| Browser acceptance check | Selected General practitioner, saw Test medicine at 20 mg, changed Dose to 25 mg, pressed Tab, observed Saved, reloaded and observed 25 mg again. |
| Final API readback | regular-slot-8 version 4 = 25 mg, prescriber_signature null; other prescription fields preserved. |
| Django | Existing local venv Python 3.11.9 / Django 5.2.6: migrations completed, system check clean, four tests passed. |
| Django HTTP | Started on port 8100; unauthenticated `/api/clients/` returned 403 with the expected detail message. |
| PDF | 30 A4 pages rendered; all pages visually reviewed; text bounds checked without overflow. |
| Source excerpts | 30 extracted excerpts backed by a manifest of 59 complete reference files. |

Author verification used separate directories under `tmp/`, not the learner's default `work/gp-user-lab` path. Existing installed frontend packages and the existing backend virtual environment were reused. The frontend validation copy used a node_modules directory junction; learners instead use the documented `npm ci` command. Fresh network dependency installation, production build/start, hosted deployment, actual GP account/MFA provisioning and clinical validation were not performed.

The two-tab conflict exercise, server-stop recovery exercise, manual GP drawing exercise and demo report composition check are learner instructions. Their underlying code was inspected; the completed browser check was dose autosave and reload, while signature behavior was exercised through the HTTP client and existing tests.

The Node test runner, Wrangler and Vite initially encountered sandbox `spawn EPERM`; approved execution outside the process sandbox allowed their required child processes. No application permission checks were weakened. A mismatched Origin was rejected by the local Vinext runtime with plain-text `Forbidden`, before the chart route's JSON guard; the verification helper was updated to handle that real response format.
