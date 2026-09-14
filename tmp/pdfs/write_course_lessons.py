from pathlib import Path
import json, re

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/gp-pwa-course'
weeks=[]
def src(path,start=None,end=None,week=None):
    prefix=f'extensions/week-{week:02}/frontend/' if week else 'source/frontend/'
    p=OUT/(prefix+path)
    lines=p.read_text(encoding='utf-8-sig').splitlines()
    a=start or 1;b=end or len(lines)
    assert 1<=a<=b<=len(lines),(path,a,b,len(lines))
    language={'.tsx':'tsx','.ts':'typescript','.sql':'sql','.json':'json','.js':'javascript','.html':'html','.css':'css','.webmanifest':'json'}.get(p.suffix,'text')
    return f'**Source:** `{prefix+path}`, lines {a}–{b}. '+('Complete file.' if a==1 and b==len(lines) else 'Verbatim chunk; assemble with the other chunks in the accompanying complete file.')+f'\n\n```{language}\n'+'\n'.join(lines[a-1:b])+ '\n```'
def cmd(text):return '```powershell\n'+text.strip()+'\n```'
def step(title,purpose,code,explain,contract,why,failure,pattern,expected,verify):
    return {'title':title,'purpose':purpose,'code':code,'explain':explain,'contract':contract,'why':why,'failure':failure,'pattern':pattern,'expected':expected,'verify':verify}
def week(number,title,objective,prereq,files,steps,appendix):weeks.append(dict(number=number,title=title,objective=objective,prereq=prereq,files=files,steps=steps,appendix=appendix))

week(1,'Boot the complete interface and rebuild the shared shell',
 'Run the actual repository stack and reconstruct the shared GP page frame without losing the source styling.',
 'PowerShell, Node 22.13 or newer (author used 22.23), npm 10, Python 3.12 recommended for the Django side. Internet is needed for a fresh npm/pip install. Use fictional fixture records. Estimated 5–7 hours in two sessions.',
 ['frontend/package.json','frontend/vite.config.ts','frontend/app/layout.tsx','frontend/app/globals.css','frontend/components/role-provider.tsx','frontend/components/app-shell.tsx'],[
 step('Create a separate course workspace and install the frontend',
 'First make a runnable reference copy. This preserves the original application and gives you an exact visual target while you rebuild one file at a time in your learner copy.',
 cmd(r'''Set-Location 'C:\Users\pedim\OneDrive\Desktop\Side_projects\ADAC4CARE'
& '.\output\gp-pwa-course\New-CourseWorkspace.ps1' -Week 1 -Destination "$PWD\work\gp-pwa-learn"
Set-Location '.\work\gp-pwa-learn\frontend'
node --version
npm --version
npm ci
node node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --local --config wrangler.lab.json
npm run dev -- --host localhost --port 3200'''),
 'Keep this terminal running. Open http://localhost:3200. The snapshot contains the complete app, including shared role dependencies; its initial selected role is RN. Choose GP in the demo role selector. Do not create a new generic Next.js app: this repo runs Vinext on Vite with the Cloudflare plugin. The script refuses an existing destination. npm ci uses the included lockfile. The local migration command creates tables in this copy’s .wrangler/state tree.',
 'The browser talks to the same-origin /api routes on port 3200. The DB binding is named DB in both the Vite config and wrangler.lab.json. This command does not use the remote database.',
 'One origin lets the browser use relative URLs and the server use a private database binding. A named binding is not a public API URL.',
 'Running migrations in the original frontend directory populates the wrong local database. A missing table produces a 503 from the chart route. If native helpers report spawn EPERM, run from a normal authorised terminal; do not rewrite the application to work around process permissions.',
 'Isolated working copy; same-origin backend-for-frontend.',
 'People and medication charts render in GP mode. Chart GET returns 200 with records, administrations and capability booleans.',
 'In browser Network, inspect /api/prescriber-chart?home=banksia-house&client=james-miller. Record status, content type and body. Stop here if it is 503. Save a screenshot as your visual reference.'),
 step('Boot the separate Django service and identify the boundary',
 'Install the repository’s Python service so you can compare its contracts with the active chart API. This service is present in the repo but is not connected to the GP chart screen.',
 cmd(r'''Set-Location 'C:\Users\pedim\OneDrive\Desktop\Side_projects\ADAC4CARE\work\gp-pwa-learn\backend'
py -3.12 -m venv .venv
& '.\.venv\Scripts\python.exe' -m pip install -r requirements/dev.txt
$env:DJANGO_SETTINGS_MODULE = 'config.settings.dev'
$env:DJANGO_DEBUG = 'true'
$env:DATABASE_URL = "sqlite:///$((Join-Path $PWD 'gp-course.sqlite3') -replace '\\','/')"
& '.\.venv\Scripts\python.exe' manage.py migrate
& '.\.venv\Scripts\python.exe' manage.py runserver localhost:8100'''),
 'Use a second terminal. If Python 3.12 is not installed, install it first or deliberately select your compatible installed Python version. The author previously tested the separate service using the repo’s Python environment. Environment variables here precede settings import, which matters because security settings are computed during import. A fresh copied .env.example supplies placeholders, not credentials.',
 'GET http://localhost:8100/api/medication-orders/ requires a Django authenticated session. An unauthenticated 403 is expected. Frontend NEXT_PUBLIC_API_URL is a legacy client setting and does not redirect relative chart fetches to this server.',
 'Proving both services boot is different from proving a bridge exists. The D1 chart uses string fixture IDs and versioned JSON; Django uses UUIDs and relational medication orders.',
 'Changing the frontend base URL alone cannot map IDs, DTO fields, sessions, CSRF or revision semantics. This repo has no completed GP login/MFA bridge to teach as an existing feature.',
 'Explicit service boundary; adapter required between different domain contracts.',
 'Django starts and migrations apply. An unauthenticated request is rejected; the frontend chart continues to use port 3200.',
 'Inspect lib/api-client.ts and search its imports. Compare the Network request URL with NEXT_PUBLIC_API_URL. Write down why no JWT should be added just because another tutorial used one.'),
 step('Rebuild layout and role context',
 'Recreate the root document, provider and shared role state. These are prerequisites for every GP page, so learn them before touching individual cards.',
 src('app/layout.tsx')+'\n\n'+src('components/role-provider.tsx'),
 'In your learner copy, back up these two files outside app/components, recreate them from these complete blocks, then reload. layout.tsx exports metadata and wraps children in RoleProvider. The provider owns role/home preferences and writes only those preferences to localStorage. useRole throws outside its provider, making a missing ancestor immediately visible.',
 'Context exposes role, setRole, homeId and setHomeId to client components. These values control presentation and selection. They are not a server credential.',
 'A shared provider keeps the header, sidebar and route content in agreement without passing four props through every component. Deferring preference reads avoids accessing window during server rendering.',
 'Placing useRole above its provider throws. Importing a browser-only API at module scope breaks server rendering. Treating the saved role as authorisation would let a user grant themselves GP access.',
 'Provider/context state ownership; presentation role versus server authority.',
 'Changing the home updates all shell controls. Reload preserves the selected home and role.',
 'Inspect localStorage: only adac4care-role and adac4care-home should be added by this provider. Confirm no prescription JSON is written there.'),
 step('Assemble sidebar, header, menu and responsive frame',
 'Rebuild the shell around the original CSS. Keeping the actual class names and primitives is what reproduces the main source interface.',
 src('components/app-shell.tsx',1,47)+'\n\n'+src('components/app-shell.tsx',78,None),
 'Recreate components/app-shell.tsx using its complete companion file; the omitted CustomCursor chunk is in that file. Keep app/globals.css intact initially, then study its sidebar, topbar, summary-grid, workspace-grid and media-query sections. Keep the imported UI primitives. The navigation array is a declarative menu; pathname controls active styling, while role controls inclusion. The mobile button toggles a drawer and scrim. Search trims text, URL-encodes it and routes to People.',
 'The shell turns a search form into /people?q=encodedText. The receiving page owns filtering. Link hrefs are the contract between menu entries and filesystem routes.',
 'A declarative array centralises labels, icons and visibility. Shared shell reuse prevents each page from drifting into a different interface.',
 'Changing class names without changing CSS loses layout. Removing all non-GP source files can break shared imports. Hiding a menu entry does not protect its API. Overview is absent from the original GP menu; Week 2 deliberately adds it.',
 'Shared application shell; declarative role-based navigation; URL-carried state.',
 'The green sidebar, home selector, header search, role menu, GP persona and page area match the supplied source. At narrow width the sidebar becomes a drawer.',
 'Use keyboard Tab to reach menu/search controls. Search James, then use Back. Resize to 390px and 1024px. Record the visible GP menu before applying Week 2.')],
 'Toolchain: React 19.2.6, Vinext 1.0.0-beta.5, Vite 8.0.13, TypeScript 5.9.3, Tailwind 4.2.1. D1 is the active GP persistence store; Drizzle supplies schema/migrations. Django 5.2.6 and DRF 3.16.1 are separate. No clone URL is supplied because frontend/.git has no remote. Use the included source snapshot or the local repo path above. Stop dev servers with Ctrl+C; keep the learner folders and databases for next week.')

week(2,'GP home, overview cards and the patient directory',
 'Reproduce the complete home experience and connect its cards, patient selector and search to the correct GP routes.',
 'Complete Week 1. Estimated 4–6 hours. Keep the original screen visible as your reference; all colours, spacing and component classes remain source-derived.',
 ['frontend/components/app-shell.tsx','frontend/app/page.tsx','frontend/app/people/page.tsx','frontend/data/demo/index.ts','frontend/data/demo/types.ts'],[
 step('Expose Overview for GP users',
 'The original route exists, but the GP menu excludes it. Apply the small course extension so a GP can discover the home page through the same sidebar.',
 src('components/app-shell.tsx',27,36,week=2),
 'Edit the existing navItems declaration to match this chunk. The complete Week 2 shell file is included under extensions/week-02. The only presentation changes are adding gp to Overview and removing the hardcoded message count. Keep other roles and routes intact because shared components use them. The Bell remains a shortcut to Messages, not a push subscription.',
 'The new menu entry targets /. No server permission changes accompany this UI addition.',
 'Navigation should expose an existing GP-relevant page without implying that a GP can sign administration records or run a medication round.',
 'Granting GP access to every menu item would expose actions outside this role’s intended scope. A badge with the number 3 would misleadingly look like a live unread count.',
 'Capability-aware presentation; honest notification affordance.',
 'GP sees Overview, People, Medication charts, Clinical reports and Messages & incidents.',
 'Select another role then GP. Click Overview. Confirm the active item and home heading agree. Medication round and Medication audit should remain absent from the GP menu.'),
 step('Build the overview view model before its cards',
 'Construct the home/client selection and derived counts before rendering them. A correct card number begins with a clear source of truth.',
 src('app/page.tsx',1,24,week=2)+'\n\n'+src('data/demo/index.ts',1,None),
 'Recreate the overview from the complete Week 2 file in three chunks: imports/calculations, summary cards, then lower panels. homeId selects a fixture home; clientId selects a client or falls back to the first client. Active medication counts and administration completion are derived from fixtures. The administration date is fixed at 2026-09-01 in the original source, so the extension labels it as a demo date. latestInstruction is sorted across clients.',
 'At this checkpoint there is no dashboard endpoint. The cards consume GroupHome/Client fixture objects. A chart PATCH does not mutate those fixture objects.',
 'Derived state avoids separately storing totals that can disagree with their underlying list. However, a derived total is only as current as the data it derives from.',
 'Calling these numbers live would be incorrect. Persisted chart revisions are merged on the chart page, not automatically across dashboard/profile summaries. Adding a database hook later requires one consistent merge policy.',
 'Derived view model; source-of-truth analysis.',
 'Changing Overview client changes active orders and the dose list. Changing home selects a valid client in the new home.',
 'Manually count the selected client’s active fixture medicines and compare the card. Explain why a new chart slot does not yet increment this fixture summary.'),
 step('Render the full overview using the existing design',
 'Build the summary grid, medication list and right rail, including their navigation actions. Adapt the action wording to the GP role while preserving layout.',
 src('app/page.tsx',25,None,week=2),
 'Place this remaining chunk after the view model. Summary cards link to charts, People and Reports. The lower layout contains safety details, medicine names/doses/times, pinned instructions and latest clinical instruction. The Week 2 condition hides the audit panel for GP. The medicine action says Review chart and omits mode=administer for GP. It keeps the original button class so the shape and spacing remain the same.',
 'Each chart link carries the stable client ID; medicine links also carry med. Client names are display labels, not resource identifiers.',
 'Using the same target route from a card, profile and sidebar gives the user several paths into one chart implementation.',
 'Linking with a name instead of an ID breaks lookup. Showing Administer on a GP dashboard promises a workflow this role cannot complete. CSS breakpoints must remain with the copied markup.',
 'Progressive disclosure through linked summary/detail screens.',
 'All four summary cards, the full medication panel and both right-rail panels are visible; GP actions lead to review screens.',
 'Click every card and every lower-panel link, then return with Back. At 390px inspect the single-column order. Compare labels and spacing with the source reference.'),
 step('Build People search, cards, empty state and chart links',
 'Recreate the complete patient list instead of reducing the experience to a prescription form. Search must work from both the header and the directory itself.',
 src('app/people/page.tsx'),
 'Recreate this complete page. The initial q comes from the URL. The effect synchronises subsequent URL changes; local input changes query state. Filtering combines full name, preferred name and diagnoses, normalised to lowercase. Each card includes room, preferred name, allergy alert, medication/PRN/note counts, support note and two actions. Stable client.id keys preserve component identity.',
 'Header search writes q; People reads q. Profile route /people/[clientId] and chart query client use the same fixture identifier.',
 'Keeping the route parameter separate from the display name allows readable names to change without breaking bookmarks. useMemo is an optimisation around a pure filter, not a persistence mechanism.',
 'Initialising state from q without responding to later q changes leaves stale results when header search is used on the same route. Filtering only names would lose the source support-needs search.',
 'URL-to-state synchronisation; collection filtering; empty-state feedback.',
 'James finds James Miller. A nonsense string produces the source empty state. Clearing search restores the current home’s cards.',
 'Search from the header while already on People. Change home with search still present and explain an empty result. Open both actions on one card and confirm the client remains James.')],
 'Week 2 extensions: components/app-shell.tsx and app/page.tsx only. Preserve the rest of the source. A ready-made comparison checkpoint is created with New-CourseWorkspace.ps1 -Week 2 and a new destination. It is a full reference snapshot, not evidence that you implemented the lesson yourself.')

week(3,'Patient profiles, chart navigation and UI state boundaries',
 'Build the patient detail journey and understand which data comes from fixtures, route parameters, React state and the chart API.',
 'Complete Week 2. Estimated 4–6 hours. Use James Miller in Banksia House for consistent examples.',
 ['frontend/app/people/[clientId]/page.tsx','frontend/app/medication-charts/page.tsx','frontend/lib/prescriber-chart.ts','frontend/hooks/use-prescriber-chart.ts'],[
 step('Resolve a profile route and its metadata',
 'Connect a directory link to a detailed patient page. Start with route resolution before adding the profile panels.',
 src('app/people/[clientId]/page.tsx',1,26),
 'Create the literal directory app/people/[clientId]. In PowerShell use -LiteralPath when inspecting paths with square brackets. Vinext passes params as a Promise here, so the server page awaits it. The metadata function uses the same lookup as the page. getClient currently falls back to the first fixture for an unknown identifier; that is existing demo behaviour, not a valid production not-found policy.',
 'The URL path supplies clientId. getClient returns {client, home}. This is a server-rendered fixture read and makes no Django request.',
 'The profile needs home context as well as client details because a bookmarked URL can be opened without first visiting People.',
 'Assuming every unknown ID is a legitimate patient would display the fallback patient under an invalid URL. A future API implementation should return a real 404 and enforce tenant membership, rather than preserve this fallback.',
 'Resource routing; server-side data resolution.',
 'A valid profile path renders the selected client name and metadata.',
 'Open /people/james-miller directly, then try a deliberately invalid ID. Record the current fallback limitation so you do not mistake it for protected clinical routing.'),
 step('Assemble all profile panels and contextual links',
 'Rebuild the complete detail screen: identity, allergies, medicines, instructions, administration guidance and clinical contacts.',
 src('app/people/[clientId]/page.tsx',27,None),
 'Append this JSX to the preceding route logic. Preserve the profile-grid, profile-main-column and profile-side-column classes. The allergy component changes both icon and text, so the alert does not depend on colour alone. Medication rows are links into the chart. Reports and messages carry the same client ID in query strings. The GP and pharmacy contact fields are display text, not communication endpoints.',
 'Fixture Client supplies medication summaries, reports and safety context. The profile’s server component is not subscribed to the Week 6 browser hook.',
 'A contextual link should save the user from searching for the same patient again. A summary view should explicitly identify whether it is a fixture snapshot or a current persisted chart.',
 'New Week 6 records appear in Reports/People/Overview, but the original profile summary remains a fixture snapshot in this course. Use its Reports link to read the persisted list. Likewise, the chart is authoritative for saved dose edits; the static profile medicine summary is not automatically refreshed.',
 'Master/detail navigation; explicit read-model freshness.',
 'The full source profile renders and its Messages, Medication chart and clinical report links preserve client context.',
 'Check one allergy alert, all three contact/support panels and a medicine deep link. Tab through the actions and compare the mobile stacking order with the source CSS.'),
 step('Recreate chart route orchestration',
 'Build the page controller that turns home, role and client into the correct chart. Keep this orchestration separate from individual editable cells.',
 src('app/medication-charts/page.tsx',1,min(65,len((OUT/'source/frontend/app/medication-charts/page.tsx').read_text().splitlines()))),
 'Use the complete companion app/medication-charts/page.tsx to finish this page after studying the opening chunk. Follow its Content component, usePrescriberChart invocation and keyed wrapper. The source assembles fixture medicines and persisted regular-slot/prn-slot records before passing sections to GpMedicationTable. GP and carer share the visual chart but receive different capabilities. window.print is the actual print action.',
 'Inputs to the hook are home ID, client ID and role. Its output includes records, administrations, loaded/error state, actions and capabilities. The component key changes with patient/home/role context.',
 'Keyed remounting clears old drafts when the selected clinical context changes. Shared chart presentation lets a GP read the same administration history without acquiring the ability to sign it.',
 'Omitting context from the key can leave a previous client’s draft in a newly selected client’s page. Inferring GP permission from a button’s visibility bypasses server capability checks.',
 'Container/presentation split; keyed component lifetime; capability-driven UI.',
 'GP sees the source regular and PRN chart sections, populated fixture orders, blank prescribing slots and read-only administration cells.',
 'Change client, home and role in turn. Confirm the chart header and medicines match each selection. Use Print preview and cancel without saving a patient document.'),
 step('Map the four kinds of state before writing API code',
 'Give each value an owner. This prevents a saved prescription, an unsaved draft and a role preference from being treated as interchangeable.',
 src('lib/prescriber-chart.ts',1,33)+'\n\n'+src('hooks/use-prescriber-chart.ts',7,18),
 'Draw four boxes in your notes: route state (q/client), shared preference state (role/home), server state (record/version/capabilities), and row draft state. ChartRecord wraps Prescription with medicationId and version. A fixture medicine starts with initialPrescription; no stored signature is invented. Six time slots are maintained even when some are blank.',
 'GET returns arrays of ChartRecord and AdministrationRecord. PATCH later submits the entire prescription plus the expected version. The frontend map indexes records by medicationId for quick row lookup.',
 'A DTO describes wire data; it is not automatically a database entity. Separating draft from acknowledged record allows the UI to display Unsaved/Saving/Saved honestly.',
 'Writing every keystroke into the authoritative map makes failed requests look persisted. Putting clinical objects in localStorage creates a separate unversioned cache. Flattening server capabilities into role strings loses the distinction between selected and authorised role.',
 'State ownership; DTO boundary; acknowledged server state versus editable draft.',
 'You can trace each visible value to its owner and name the event that changes it.',
 'Before Week 4, answer: which state survives a reload; which survives a patient change; which can only the server assign; which must never be copied into a new prescription signature?')],
 'UI map: / → overview; /people?q=… → directory; /people/[clientId] → profile; /medication-charts?client=… → editable GP chart; /reports?client=… → instruction list; /messages?client=… → care communication. These are application routes, not six separate APIs.')

week(4,'Database, HTTP contracts and GP permission checks',
 'Rebuild the active D1 chart read/write path and explain each boundary from request to stored revision.',
 'Complete Weeks 1–3 and keep local D1 running. Estimated 6–8 hours. This week is intentionally separate from editing/signing UI.',
 ['frontend/db/schema.ts','frontend/drizzle/0001_short_random.sql','frontend/lib/chart-db.ts','frontend/lib/chart-access.ts','frontend/lib/chart-server.ts','frontend/app/api/prescriber-chart/route.ts'],[
 step('Create revision and administration storage',
 'Reconstruct the actual persistence schema. Prescribing appends a new revision; staff administrations remain separate signed records.',
 src('drizzle/0001_short_random.sql')+'\n\n'+src('lib/chart-db.ts'),
 'Recreate the migration from the complete block and compare it with db/schema.ts. Do not reapply an already recorded migration by changing its contents: use a new migration for future schema changes. chartDatabase reads the DB binding from cloudflare:workers. ADAC_GP_EMAILS and ADAC_CARER_EMAILS are server-side allowlists, not browser settings.',
 'Prescription partition: home_id/client_id/medication_id; revision identity adds version. JSON stores the complete prescription. Administration records retain order_version and cell_key so a later schedule edit cannot silently move history.',
 'An append-only model preserves earlier signed orders and makes conflicts detectable. A separate administration table models a different actor and event.',
 'Using only medication_id as a primary key would overwrite history and collide across homes/clients. Renaming DB in one file but not the runtime config makes every database call fail.',
 'Append-only revision log; composite identity; dependency binding.',
 'Local D1 contains prescription_revisions and administration_signatures with the expected keys.',
 'Run the Week 1 local migration command from the learner frontend. Read the schema using Wrangler d1 execute DB --local --config wrangler.lab.json --command "SELECT name FROM sqlite_master WHERE type = \'table\';". Compare column names with the route SQL.'),
 step('Rebuild actor, permission and resource context',
 'Before SQL runs, determine who is calling and whether the requested home/client exists. Presentation role selection is only one input to write permission.',
 src('lib/chart-access.ts')+'\n\n'+src('lib/chart-server.ts'),
 'Implement both complete modules. In local development, the deliberate demo bypass permits evaluation and uses a local actor string. In the hosted path, authenticated identity comes from trusted oai-authenticated-user-id/email headers, GP allowlist membership enables prescribing, and X-Chart-Role must also be gp for writes. chartContext searches a real home and a client within it rather than using fixture fallback helpers.',
 'Unauthenticated read: 401. Invalid home/client: 404. Unauthorised write: 403. Responses are JSON with Cache-Control: no-store and errors shaped {error: string}.',
 'The server must independently evaluate permission because client storage, request bodies and selected roles are user-controlled. Resource validation prevents mismatched home/client identifiers.',
 'These trusted headers are safe only behind an ingress that authenticates and overwrites them; a directly exposed server that trusts arbitrary incoming headers is not secured. The repo does not implement organisation-level GP/client assignment on this path. Local success does not prove hosted security.',
 'Server-side authorisation; trusted identity boundary; contextual resource validation.',
 'You can explain why X-Chart-Role: gp alone is insufficient in hosted mode and why the local actor differs.',
 'Run the chart-access unit tests in Week 8. Inspect the actual deployment ingress separately before any real deployment; do not invent a login screen that grants privileges locally.'),
 step('Implement GET and reconstruct the latest chart',
 'Read the latest revision of each medicine and return the capability envelope required by the UI.',
 src('app/api/prescriber-chart/route.ts',1,28),
 'Create the route file with this GET chunk first. The grouped MAX(version) query is scoped to the selected home/client. Stored JSON is overlaid on initialPrescription for a complete shape. The second query returns administration records. Capabilities travel beside the data; the browser does not have to guess them from a role label.',
 'GET /api/prescriber-chart?home=banksia-house&client=james-miller returns {records, administrations, canPrescribe, canAdminister}. Empty arrays on a fresh database are valid. Fixture defaults still render in the chart.',
 'Returning server capability decisions with the resource aligns editable controls with the resource’s actual access policy. no-store prevents the response being reused as a stale HTTP cache entry.',
 'Removing the inner scope can select a revision from a different partition. Returning a different JSON field name makes the hook fail during iteration. Database failure must remain 503 rather than a fake empty success.',
 'Query projection; capability envelope; fail-visible reads.',
 'A fresh chart GET returns 200 and the exact four top-level fields.',
 'Use Invoke-RestMethod against localhost:3200 and inspect the object. Try a nonexistent client and confirm 404. Stop the database path deliberately only in a disposable copy if you want to observe 503.'),
 step('Implement PATCH with validation and atomic versioning',
 'Complete the write route so a stale editor cannot overwrite a newer prescription, and a changed order cannot inherit an old signature.',
 src('app/api/prescriber-chart/route.ts',30,None),
 'Append this complete PATCH implementation. It checks GP write capability, same origin, context, body size, allowed fields, prescription structure and medication slot identity. It compares the submitted version with the latest version and also guards the INSERT using the expected version. Signature attribution is server-assigned. The source rejects carrying an unchanged drawing onto a changed prescription.',
 'PATCH body is {medicationId, version, prescription}. Success 200 returns one ChartRecord with incremented version. Invalid input 400; origin/access 403; unknown context 404; stale revision 409; oversize body 413; storage failure 503. Errors use {error}.',
 'The SQL guard closes the race between reading the current version and inserting. A preliminary JavaScript version check alone cannot prevent two concurrent writers succeeding.',
 'Blind retries after 409 lose the meaning of an expected version. Retrying an uncertain successful PATCH may return 409 because the first request committed. Reload and compare before editing again. This endpoint is not idempotent by request ID.',
 'Optimistic concurrency control; compare-and-swap; server-stamped attribution.',
 'A valid edit appends version 1. Another request with expected version 0 conflicts. No prior row is overwritten.',
 'Use Test-GpWorkflow.mjs in Week 8. Inspect versions in D1. Read Integration-Reference.md steps (2)–(6) for the expanded validator and write-contract walkthrough before moving to UI autosave.')],
 'Active endpoints: GET/PATCH /api/prescriber-chart and shared POST /api/chart-administrations. GP can read administrations but cannot sign them. Local config uses DB and the placeholder database ID only with --local. Do not run --remote as part of this lab. Production identity/session/MFA is an explicit deployment dependency, not a completed course login feature.')

week(5,'Editable prescriptions, schedules, signatures and history',
 'Rebuild the source GP chart interaction with truthful save feedback, versioned writes and preserved administration history.',
 'Complete Week 4. Estimated 6–8 hours; split into two sessions. Keep original GpMedicationTable and PrescriberSignature files as complete references.',
 ['frontend/hooks/use-prescriber-chart.ts','frontend/components/gp-medication-table.tsx','frontend/components/prescriber-signature.tsx','frontend/lib/prescriber-chart.ts'],[
 step('Connect HTTP results to React state',
 'Implement the hook that owns acknowledged chart data and server capabilities. Components should receive an action, not duplicate the HTTP protocol.',
 src('hooks/use-prescriber-chart.ts'),
 'Recreate this complete hook. reload uses no-store, merges versions monotonically and avoids applying reads during a save. The effect polls visible pages every 15 seconds and refreshes on focus. save serialises writes with a ref, submits the expected version and only updates the acknowledged map after response.ok. signAdministration exists because the chart is shared, but GP capability makes it unavailable.',
 'The hook consumes the Week 4 response envelope and produces the component contract described in Week 3. Save resolves to the server’s ChartRecord or throws a human-readable error.',
 'A ref provides an immediate in-flight guard without waiting for React to rerender. Version checks keep an older polling response from replacing a newer acknowledged prescription.',
 'Not checking response.ok treats JSON errors as successful records. Clearing the saving flag outside finally can lock the editor after failure. Removing effect cleanup leaks timers when a patient changes.',
 'Server-state hook; serialised mutation; monotonic version merge; effect lifecycle.',
 'The chart loads once, refreshes on focus and shows saved changes after reload.',
 'Observe a GET, one PATCH after an edit, then another GET after focus. Confirm no write is sent merely because a GET returned.'),
 step('Rebuild editable rows and autosave feedback',
 'Give each medication row a draft that can be edited without pretending it is saved. Use the source blur/save behaviour rather than inventing a different form layout.',
 src('components/gp-medication-table.tsx',1,min(85,len((OUT/'source/frontend/components/gp-medication-table.tsx').read_text().splitlines()))),
 'Recreate the component using the complete file; study the opening MedicineRows logic first, then its JSX. Follow draft, versionRef, dirty, saving and error. change calls amendPrescription; persist validates before saving and replaces the draft with the acknowledged record. Dirty local edits are not overwritten by polling. The beforeunload handler warns about unsaved work when leaving the document; it is not a complete SPA navigation blocker.',
 'onSave accepts medication ID, whole prescription and expected version. A save error stays on the row and must not switch the label to Saved.',
 'Draft state is a user intention; server state is a confirmed fact. Holding both is necessary when latency or validation separates them.',
 'A stale save may produce 409 even when the input looked valid locally. Navigating within the SPA can bypass beforeunload. A learner should complete or discard edits deliberately before switching clients.',
 'Draft/acknowledged state separation; pessimistic save acknowledgement.',
 'Typing changes the draft; blur validates/saves; Saved appears only after success. Invalid data shows an error.',
 'Edit a fictional dose, blur, reload and compare. Then enter duplicate times and verify rejection. Preserve a screenshot of Saving/Saved/error states in your lab evidence.'),
 step('Trace a drawn signature through the full round trip',
 'Rebuild the signature canvas and understand what exactly is signed. The stored drawing belongs to one prescription revision.',
 src('components/prescriber-signature.tsx',1,None),
 'Recreate the complete component, then follow the onSave callback in GpMedicationTable. The canvas stores normalised points so the drawing can render at different sizes. The source debounces saves after drawing and waits on Done. Clear affects the pad; it is not an API to delete an existing persisted signature. The route stamps signedBy/signedAt and rejects invalid or unchanged carried-over drawings on amended orders.',
 'Signature contains strokes plus server attribution. Validation requires finite in-range points and actual movement; a clicked dot or typed display name is not the GP drawn-signature workflow.',
 'Normalised geometry decouples data from canvas pixels. Tying signature invalidation to prescription changes avoids representing an old drawing as approval of a new dose.',
 'Saving while a drawing is still changing can acknowledge an older drawing revision; the source tracks drawing versions to prevent that. Clearing an already saved pad must not falsely tell the user the server record was deleted.',
 'Debounced input persistence; revision-bound signature; server attribution.',
 'A drawn signature saves, survives reload and disappears from the amended draft when a prescribed field changes.',
 'Draw, finish, reload; amend dose; observe unsigned state; save; draw a fresh signature. Read stored revision JSON to confirm the old signed revision remains intact.'),
 step('Reconstruct PRN sections and immutable history',
 'Finish the regular/PRN tables, six scheduling slots and history rendering. Distinguish validation from clinical decision support.',
 src('lib/prescriber-chart.ts',36, min(100,len((OUT/'source/frontend/lib/prescriber-chart.ts').read_text().splitlines()))),
 'Read the remaining source functions and the second half of GpMedicationTable. Dates must be real YYYY-MM-DD dates; times are unique 24-hour values; end date cannot precede start. PRN uses refer_prn and max_dose text. The chart retains administrations associated with prior schedule cells rather than reassigning them to new times. Blank regular/prn slots use the exact server-supported IDs.',
 'The server accepts fixture medicine IDs or permitted regular-slot-N/prn-slot-N identifiers, with slot range and occupancy checks. Administration records point at orderVersion and cellKey.',
 'Historical events need stable identity even when an order’s schedule changes. Schedules are structured enough for display/validation but do not implement medical dose calculation.',
 'This repo has no drug interaction engine, dosage recommendation service or automatic clinical alert logic. max_dose is text; do not describe it as an enforced dose calculator. End dates are not a delete operation.',
 'Stable event identity; domain validation versus decision support.',
 'Regular and PRN charts retain source layout; GP edits prescribing fields while history remains read-only.',
 'Complete Test-GpWorkflow, test duplicate/invalid times and date ordering, and review an old administration after a schedule edit. Use Integration-Reference.md steps (8)–(11) for further line-by-line reasoning.')],
 'State labels must describe actual acknowledgement. Prescribing PATCH has no request-ID idempotency; Week 6’s communication endpoint introduces a separate retry pattern for comparison. Shared carer code is retained solely because the same chart renders administration history. The GP course does not teach performing a carer round.')

week(6,'Clinical reports, care messages and persistent GP actions',
 'Keep the source report/message screens while replacing GP demo-success actions with an append-only database workflow.',
 'Complete Week 5. Estimated 6–8 hours. These files are explicitly new course extensions, not features falsely attributed to the original repo.',
 ['frontend/drizzle/0002_course_communications.sql','frontend/lib/clinical-records.ts','frontend/app/api/clinical-records/route.ts','frontend/hooks/use-clinical-home.ts','frontend/components/gp-communication-form.tsx','frontend/app/reports/page.tsx','frontend/app/messages/page.tsx','frontend/app/page.tsx','frontend/app/people/page.tsx'],[
 step('Define the communication contract and table',
 'The source compose buttons only show demo notices. Start by giving GP instructions and care notes a real resource identity and persistent record.',
 src('lib/clinical-records.ts',week=6)+'\n\n'+src('drizzle/0002_course_communications.sql',week=6),
 'Create these new files verbatim. NewCommunication contains exactly seven fields; the validator rejects unknown fields and blank title/body, constrains categories and lengths, and requires an action for reports. The shared table stores request content, returned record, server actor and creation timestamp. The primary key is a request UUID generated by the browser and reused for an unchanged retry.',
 'POST /api/clinical-records?home=… accepts {id, clientId, kind, category, title, body, action}. kind is report or message. GP report categories are GP instruction/Dose change; message categories are handover/incident.',
 'One small append-only resource is enough to demonstrate persistence without redesigning the source cards. Retaining the original request enables duplicate detection with content comparison.',
 'A UUID without a database uniqueness constraint cannot prevent duplicate commits. Letting the client submit author/date would allow attribution spoofing. This extension is a lab communication store, not a signed clinical report approval system.',
 'Command DTO; server-owned attribution; idempotency key.',
 'The new migration applies locally and the table/index exist.',
 'Run the same local migrations apply command from Week 1 after creating the file. Compare the D1 schema against this block. Keep original migrations unchanged.'),
 step('Implement read, create, retry and error responses',
 'Build the server route before wiring the compose dialogs. A success message should mean that the database confirmed a record.',
 src('app/api/clinical-records/route.ts',week=6),
 'Create the route exactly. GET lists records for a known home and returns canCreate. POST requires GP capability plus same origin, validates input and client membership, then uses INSERT OR IGNORE. It reloads the row and compares home, actor and canonical request content before returning it. Server time and actor populate the displayed record. Reusing an ID with different content yields a conflict.',
 'GET 200: {records, canCreate}; POST 201 on create, 200 on identical retry: {item}. Invalid JSON/data 400; permission/origin 403; unknown home/client 404; reused ID with different content 409; oversized request 413; storage failure 503. All responses are no-store JSON with {error} for errors.',
 'Network failure can happen after a commit but before the response reaches the browser. Retrying the same ID/content recovers the saved result instead of inserting a duplicate. Concurrent duplicates are resolved by the primary key.',
 'Changing the content during an uncertain retry is a new command, not proof the previous one failed. This route inherits the original hosted identity/allowlist boundary and lacks organisation assignment enforcement. It must not be described as deployment-ready multi-tenant clinical storage.',
 'Idempotent create; append-only command handling; trusted actor stamping.',
 'The same POST twice creates one row. A changed title with the same ID returns 409.',
 'Run Test-Course.mjs after starting the Week 6 or later checkpoint. Inspect the author in the returned JSON and confirm the browser never submitted it.'),
 step('Merge saved records into the source lists',
 'Build a reusable read hook that overlays persisted GP records on the fictional fixture reports/messages. Preserve the source list and filter components.',
 src('hooks/use-clinical-home.ts',week=6),
 'Create this hook, then use the complete Week 6 Reports, Messages, People and Overview files. The hook partitions snapshot state by homeId and ignores responses from older request sequences. It adds saved records to each matching client, polls visible pages and refreshes on focus or a same-window change event. A save inserts the returned item into local state and asks other hook instances to reload.',
 'The hook returns {home, error, canCreate, save, reload}. home has the original GroupHome shape; the view can keep its existing flatMap/filter/sort logic. Draft values are not persisted in browser storage.',
 'Adapting data at the hook boundary preserves the existing design while making its data source explicit. A request sequence prevents a slow response from the previous home replacing the current home’s snapshot.',
 'The original profile server page and medication summary counts are still fixture-based; they are not secretly subscribed to this hook. Read the current communication list through Reports/Messages. Offline or failed reads show an error rather than claiming all data is current.',
 'Read-model adapter; stale-response suppression; event-triggered revalidation.',
 'A new GP instruction appears in Reports and updates Overview’s latest instruction and People’s note count after refresh.',
 'Create a report, navigate to Overview and People, reload, then switch home. The record must remain only in its home/client. Return and confirm it persists.'),
 step('Connect the source dialogs to real GP saves',
 'Retain the existing cards, filter bars, timeline and modal styling while replacing the GP form command. Care replies become persisted follow-up notes rather than a fake opened-thread notice.',
 src('gp-communication-form.tsx',week=6) if False else src('components/gp-communication-form.tsx',week=6),
 'Create the form component, then replace Reports and Messages with their complete Week 6 files. FormData reads stable client IDs, not display names. Busy disables fields and a ref blocks immediate double submit. An unchanged failed submission reuses its UUID; edited content gets a new one. onSaved closes the dialog only after save resolves. Reports use Add GP instruction instead of implying a drawn signature. Reply pre-fills client/title and creates a follow-up note; it is not a nested thread model.',
 'save accepts NewCommunication and resolves after a server acknowledgement. Errors stay in the dialog with the input preserved. GP create controls require the returned canCreate capability; the server checks again.',
 'Separating a reusable form from its transport hook makes UI intent, request handling and server policy independently understandable.',
 'A toast displayed before await save would reproduce the original demo-only behaviour. Closing the form on error would discard retry context. Other roles retain their original demo commands because this course extends GP only. No email, push delivery, unread tracking, pin persistence or external notification is implemented.',
 'Controlled command lifecycle; pessimistic confirmation; reusable form/presentation boundary.',
 'GP can add reports, handover notes, incidents and follow-up replies that survive reload. Filters and source cards remain intact.',
 'Submit a valid report, an incident and a Reply. Reload each list. Simulate a failed request, confirm the dialog stays open and retry unchanged. Do not interpret a follow-up title as a fully modelled discussion thread.')],
 'Apply extensions/week-06 files after Week 2; the Week 6 Overview file already includes Week 2 changes. New endpoint: GET/POST /api/clinical-records?home=… . New table: gp_communications(id, home_id, client_id, kind, request_json, record_json, actor, created_at). No delete/edit, pagination, subscriptions or organisation-scoped permission model is added. A dose-change report documents an instruction; it does not itself modify a prescription. Make the actual order change through Medication charts.')

week(7,'Installable PWA and an explicit offline experience',
 'Add install metadata, icons, service-worker registration and a generic offline screen without caching clinical pages or queuing writes.',
 'Complete Week 6. Estimated 4–6 hours. Use localhost for local testing and HTTPS for a later authorised deployment. Installation controls differ across browsers and devices.',
 ['frontend/public/manifest.webmanifest','frontend/public/icons/icon-192.png','frontend/public/icons/icon-512.png','frontend/public/offline.html','frontend/public/sw.js','frontend/components/pwa-status.tsx','frontend/app/layout.tsx','frontend/app/globals.css'],[
 step('Complete the manifest and app identity',
 'The original manifest has an empty icons array. Extend it into a coherent installed-app identity while retaining the application name and palette.',
 src('public/manifest.webmanifest',week=7),
 'Replace the manifest with this complete file and copy both provided PNG icons into public/icons. They are new course assets using the existing palette. Keep the root metadata manifest link. id and scope anchor the installation to this origin root, start_url opens Overview, and display requests a standalone window. The browser remains responsible for deciding when and how installation is offered.',
 'The browser fetches /manifest.webmanifest and its public icon URLs. The 192×192 and 512×512 PNG files must return actual PNG bytes, not an HTML fallback.',
 'A manifest describes application identity and presentation. It is not an authentication system and does not by itself define an offline data policy.',
 'Broken icon URLs or an incorrect scope can make the installed experience incomplete. Do not promise identical prompts on Chrome, Edge and iOS. A service worker is useful for this offline design but is not a universal installability requirement.',
 'Web app manifest; progressive enhancement.',
 'Browser developer tools display the manifest name, scope, standalone mode and both icons without fetch errors.',
 'Open both icon URLs directly. Inspect manifest in Application tools, then use the browser’s install/add-to-home-screen option if offered. Official reference: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable'),
 step('Implement the generic offline page and cache allowlist',
 'Define offline behaviour deliberately. A GP should see an honest offline message instead of a cached patient page that looks current.',
 src('public/offline.html',week=7)+'\n\n'+src('public/sw.js',week=7),
 'Create these complete files. Install preloads only offline.html and the two generic icons. Fetch handling ignores non-GET, cross-origin and /api/ requests. Navigations try the network and fall back to the generic page only on network failure. Clinical route HTML is never written to Cache Storage by this worker. Activation deletes only older caches with this course’s own prefix.',
 'Cache allowlist: exactly three public paths. API GET/PATCH/POST use their ordinary network behaviour. There is no background sync or offline mutation queue.',
 'An offline fallback communicates loss of access without inventing a medical-record synchronisation system. Scoped cleanup avoids deleting unrelated applications’ caches.',
 'A catch-all cache-first fetch strategy could retain patient pages and API JSON. Serving the offline page for failed API requests would turn expected JSON into HTML. Network-only is not a guarantee of zero browser memory or HTTP caching; it describes this worker’s explicit storage policy.',
 'Allowlist caching; network-first navigation with generic fallback; network-only mutations.',
 'After worker activation and a second visit, turning the network offline and navigating produces the generic offline screen.',
 'Inspect Cache Storage: only offline.html and icons should be present. Open a patient page online, then check again. Run the worker routing harness in Test-Course. Official reference: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers'),
 step('Register the worker and show connection/update status',
 'Connect PWA support to the existing root layout while keeping its provider and source page styling.',
 src('components/pwa-status.tsx',week=7)+'\n\n'+src('app/layout.tsx',week=7),
 'Create PwaStatus, replace the Week 7 layout and use the complete Week 7 globals.css. Only a small status style is appended to the source CSS. navigator.onLine provides an advisory banner, while actual requests still determine success. Registration failures are visible. The worker does not call skipWaiting, so an existing chart is not forcibly switched to a new worker mid-session.',
 'register(/sw.js, {scope: /, updateViaCache: none}) asks the browser to manage the worker lifecycle. The status component adds no API endpoint and does not alter chart save semantics.',
 'A new worker should not silently change the app environment while the user has an unsaved clinical draft. Waiting for windows to close is a simple course update policy.',
 'The online flag can be true while the server is unavailable; it cannot justify a Saved message. A waiting update is checked on registration here, not exposed through a complete live update centre. In production, version changes require incrementing the cache name when cached resources change.',
 'Progressive enhancement; explicit worker lifecycle; advisory connectivity state.',
 'Online pages retain their source layout. Loss of network shows a status banner; hard navigation offline shows the generic page.',
 'Check online/offline transitions in developer tools, then close all app tabs and reopen. Confirm the new worker controls the next navigation. Do not expect first-load offline support before the initial cache install succeeds.'),
 step('Verify installation, recovery and clinical data boundaries',
 'Test the installed experience as a user would, including reopening and reconnecting. Keep this separate from unit tests because operating-system installation is a browser capability.',
 cmd(r'''Set-Location 'C:\Users\pedim\OneDrive\Desktop\Side_projects\ADAC4CARE\work\gp-pwa-learn\frontend'
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run build'''),
 'These commands check types and build output. Then use the manual installation matrix in Week 8. On localhost, use a supporting desktop browser’s install control; on a phone, localhost means that phone itself, so testing the laptop app requires a deliberately configured secure origin rather than replacing localhost with an arbitrary insecure LAN address. No hosting or deployment command is part of this course.',
 'An installed window uses the same origin, routes, storage and server permissions as the browser application. It is not a separate native backend.',
 'Installability, offline fallback, application data consistency and authorisation are four different properties and require different evidence.',
 'A successful build does not prove installation, mobile rendering or hosted identity. A request that lost its response might still have committed; after reconnecting compare chart versions or retry an unchanged communication ID before creating another record.',
 'Layered verification; uncertain-outcome recovery.',
 'The app can be opened in an installed window where supported, using the original navigation and pages. Offline writes never appear queued or confirmed.',
 'Record browser/OS, install result, icon, start page, standalone display, offline fallback, reconnect result and worker cache entries. For cleanup, remove only this app’s worker/cache through browser Application tools; leave the D1 database intact.')],
 'MDN references were consulted for installability and service-worker behaviour. Browser-specific installation must be verified on the learner’s target platform. The course adds no push notifications, background medication sync or cached patient views. Use the existing Messages shortcut for in-app communication; do not label it a notification delivery service.')

week(8,'Full GP journey, regression checks and final hand-in',
 'Prove the complete source-based GP experience works across navigation, persistence, failure recovery and PWA behaviour.',
 'Complete Weeks 1–7. Estimated 4–6 hours. Work only with the isolated fictional-data database. The supplied scripts create additional fictional test records.',
 ['Test-GpWorkflow.mjs','Test-Course.mjs','VALIDATION-COURSE.md','Integration-Reference.md'],[
 step('Run the automated integration gates',
 'Validate behaviour across the HTTP/database boundary, not just whether a page compiles. Run the checks once against a fresh final checkpoint.',
 cmd(r'''Set-Location 'C:\Users\pedim\OneDrive\Desktop\Side_projects\ADAC4CARE\work\gp-pwa-learn\frontend'
node node_modules/typescript/bin/tsc --noEmit --incremental false
node --experimental-strip-types --test tests/prescriber-chart.test.ts
$env:COURSE_URL = 'http://localhost:3200'
node '..\..\..\output\gp-pwa-course\Test-Course.mjs'
node '..\..\..\output\gp-pwa-course\Test-GpWorkflow.mjs' 'http://localhost:3200'
npm run build'''),
 'Keep the development server running in its first terminal. Test-Course adds a report and message, retries a report, rejects invalid/unauthorised submissions, checks routes and manifest, and executes the actual service-worker fetch handler in a harness. Test-GpWorkflow exercises the prescription round trip. Read its configuration header before running; the integration reference describes its disposable slot and version behaviour.',
 'Tests observe status codes, persisted reads, duplicate counts and cache-routing decisions. They are deliberately different from UI screenshots.',
 'A route returning 200 HTML is insufficient evidence that editing, retries or signatures work. The checks target effects that would otherwise be easy to fake with local state.',
 'Running against another app’s port produces misleading failures or unwanted test data. Node process restrictions can prevent test runners spawning; use an authorised normal terminal. Do not weaken assertions to obtain a green result.',
 'Contract/integration testing; invariant verification.',
 'Typecheck and relevant rule tests pass; persistent create/retry returns one record; invalid operations return their documented statuses.',
 'Save terminal output with date and URL. Compare it against VALIDATION-COURSE.md, which distinguishes author-tested behaviour from checks you must perform yourself.'),
 step('Walk every GP screen and menu action',
 'Verify the complete user journey rather than treating the chart as the whole product. Use the following screen matrix as your hand-in checklist.',
 cmd(r'''$base = 'http://localhost:3200'
$paths = '/', '/people?q=James', '/people/james-miller', '/medication-charts?client=james-miller', '/reports?client=james-miller', '/messages?client=james-miller'
foreach ($path in $paths) {
  $response = Invoke-WebRequest -Uri ($base + $path)
  "$path : $($response.StatusCode)"
}'''),
 'The command checks route reachability only. In the browser select GP and Banksia House. Overview: inspect four cards, selected client, medication list and right rail. People: header/local search, no-results, clear and both card actions. Profile: allergies, orders, reports, contacts and support details. Chart: regular/PRN, edit, blur, sign and print. Reports: client/category filters and persistent GP form. Messages: client/type filters, incident/handover creation and follow-up Reply. Header: home switch, search, role menu and Bell shortcut.',
 'Every navigation must preserve or deliberately reset the selected client/home. Every persistent action must be confirmed by a subsequent GET/reload.',
 'Testing the actual paths reveals state-reset defects that isolated page tests miss. Using one patient makes unintended context switches obvious.',
 'Do not call source fixture medication counts live after a chart edit. Do not call static profile reports current after Week 6 creation. Do not treat management pins, other-role demo actions or Bell navigation as implemented notification delivery.',
 'End-to-end journey testing; context continuity.',
 'All six main screens and GP menu options are reachable with the source layout. The implemented saves survive reload.',
 'Capture one desktop and one narrow-screen image of each page and a short result note for every action above. Explain remaining source/demo limitations in your hand-in instead of concealing them.'),
 step('Exercise conflicts, accessibility, print and PWA recovery',
 'Test conditions that normal happy-path navigation does not reveal. Focus on whether the interface tells the truth when it cannot complete an action.',
 src('public/sw.js',1,None,week=7),
 'Use two chart tabs on the same medicine: save in A, then submit stale content in B and expect a conflict rather than overwrite. Disconnect while a draft is unsaved; verify no Saved label or background queue appears. Restore connectivity and reload/compare before retrying. At 390px, 768px and desktop widths inspect menus, dialog scrolling, chart horizontal scrolling and button reachability. Keyboard-test search, tabs, select menus, dialog focus/close and signature alternatives actually present in the source. Print preview should remove navigation while retaining chart information.',
 'A failed client response does not prove a failed server commit. Chart recovery uses version comparison; communication recovery uses the unchanged request ID. Offline fallback is generic by design.',
 'Different mutations require different retry strategies. Accessibility and responsive layout are user-facing contracts not established by API tests.',
 'Automatically discarding a dirty draft on a conflict loses user work. Claiming canvas accessibility or device installation from typecheck alone is not evidence. Record problems found; do not mark an unperformed check passed.',
 'Failure-mode testing; accessible interaction review; conservative recovery.',
 'Stale writes conflict, offline state is visible, reconnect allows verification, and no patient documents appear in the worker cache.',
 'Write the exact observed result for each browser/device. Inspect both 192px/512px icons and standalone start URL after installation. Remove the local install only after collecting evidence.'),
 step('Package your rebuild and explain the integration',
 'Finish with a reviewable implementation and an explanation you can reuse in another stack. Completion means understanding the boundaries as well as reproducing screens.',
 cmd(r'''Set-Location 'C:\Users\pedim\OneDrive\Desktop\Side_projects\ADAC4CARE\work\gp-pwa-learn\frontend'
Get-Content -LiteralPath 'package.json'
Get-Content -LiteralPath '.env.example'
Get-Content -LiteralPath 'app\api\clinical-records\route.ts' -TotalCount 18'''),
 'Hand in your learner source files, a README with exact install/migration/run commands, test output and the six-screen comparison evidence. Exclude node_modules, .venv, .wrangler, actual .env files and databases. Explain one chart PATCH from field edit to D1 revision and one communication POST from form to acknowledged timeline item. Include a diagram in your own words: browser → same-origin route → access/context checks → D1 → JSON → hook → view.',
 'Document active chart and communication endpoints, their payloads and failures. Document Django separately with its missing ID/auth/DTO bridge. Identify the source snapshot and the course extensions you used.',
 'A transferable integration explanation identifies ownership, authority and failure handling rather than memorising framework-specific filenames.',
 'A real clinical deployment still needs authenticated ingress, organisation/client access policy, operational controls and verification of the intended clinical workflow. This course is an isolated rebuild with fictional data, not evidence those missing systems are already supplied.',
 'Reproducible delivery; boundary documentation; evidence-based acceptance.',
 'Another learner can run your copy and follow the same GP journey without hidden files or undocumented services.',
 'Stop both servers with Ctrl+C. Keep your workspace and local database for comparison; do not copy secrets or test patient records into the final source ZIP. Re-run only checks affected by subsequent changes.')],
 'Acceptance: source interface preserved; GP Overview discoverable; all five GP menu destinations plus profile work; chart edits/signatures version correctly; GP reports/notes persist; known demo behaviours labelled; PWA manifest/icons/worker/offline screen present; API/cache tests pass; browser installation and screen checks documented. Stretch work, not completed features: live dashboard/profile projection from D1, true discussion threads, unread/push delivery, pagination, tenant assignments and a Django adapter.')

for w in weeks:
    n=w['number'];folder=OUT/f'week-{n:02}';folder.mkdir(exist_ok=True)
    header=f"# GP User Module — Implementation Lab\n\n**Week {n} of 8 · {w['title']}**\n\n**Objective:** {w['objective']}\n\n## Setup / Prerequisites\n\n{w['prereq']}\n\n"
    header+='**Working method:** Keep one learner workspace across weeks. Recreate the listed files in the stated order. Code blocks are exact chunks from the included complete files; do not paste an isolated chunk as an entire file unless it is labelled complete. For long JSX files, open the complete companion and rebuild one named section at a time. Keep the original CSS and shared primitives. Reference checkpoints contain the complete source app from the start; they are comparison targets, not blank starters or a claim of incremental implementation.\n\n'
    header+='**Files for this week:** '+', '.join('`'+x+'`' for x in w['files'])+'.\n\n## Laboratory Instructions\n\n'
    sections=[]
    for i,s in enumerate(w['steps']):
        body=f"### ({i}) {s['title']}\n\n{s['purpose']}\n\n{s['code']}\n\n**What the code does:** {s['explain']}\n\n**Integration contract:** {s['contract']}\n\n**Why this design:** {s['why']}\n\n**What breaks if miswired:** {s['failure']}\n\n**General pattern:** {s['pattern']}\n\n**Expected result:** {s['expected']}\n\n**Verify before continuing:** {s['verify']}\n\n"
        sections.append(body)
        (folder/f'lesson-{i:02}.md').write_text(header+body+'## Appendix\n\n'+w['appendix']+'\n',encoding='utf-8')
    # Every week carries its own quick reference rather than depending on memory.
    appendix='## Appendix\n\n'+w['appendix']+'\n\n'
    appendix+='### Endpoint quick reference\n\n| Method / route | Purpose | Access and response |\n|---|---|---|\n| GET /api/prescriber-chart?home=…&client=… | Latest chart and administrations | Authenticated; 200 capability envelope; 401/404/503 |\n| PATCH /api/prescriber-chart?home=…&client=… | Append prescription revision | GP write + same origin; 200 record; 400/403/404/409/413/503 |\n| POST /api/chart-administrations?home=…&client=… | Shared staff signature path | Carer only; GP reads history through chart GET |\n| GET /api/clinical-records?home=… | Week 6 report/message list | Authenticated; 200 records/canCreate; 401/404/503 |\n| POST /api/clinical-records?home=… | Week 6 GP instruction/note | GP + same origin; 201 create/200 retry; 400/403/404/409/413/503 |\n| GET /api/medication-orders/ on Django | Separate relational API | Django session required; not called by chart UI |\n\n'
    appendix+='### Storage and configuration\n\n| Item | Meaning |\n|---|---|\n| prescription_revisions | home/client/medication/version key; prescription JSON, actor and saved_at |\n| administration_signatures | home/client/medication/cell key; order version and signed event |\n| gp_communications (Week 6) | UUID, home/client, kind, original request, returned record, actor, creation time |\n| DB | Private D1 runtime binding; migrations and dev server must share local state location |\n| ADAC_GP_EMAILS | Server GP allowlist for hosted identity; local development deliberately bypasses it |\n| ADAC_CARER_EMAILS | Shared carer allowlist; does not grant GP administration actions |\n| NEXT_PUBLIC_API_URL | Legacy Django client URL; not used by relative chart fetches |\n| NEXT_PUBLIC_SITE_URL | Root metadata base; local example is port 3000 and may be set to port 3200 for this course |\n| DJANGO_SETTINGS_MODULE / DJANGO_DEBUG / DATABASE_URL | Separate Python service settings; set before launching Django |\n\n'
    appendix+='**Source provenance:** Snapshot of the actual repository inspected 10 September 2026; frontend commit c53e0eaccf0d9771a9babfada1fab6de8b1f35f3. Full original files are under source; new teaching code is under extensions/week-02, week-06 and week-07. source-manifest.json records hashes. Integration-Reference.md preserves the detailed first lab for deeper chart/Django explanations.\n'
    (folder/f'Week-{n:02}.md').write_text(header+''.join(sections)+appendix,encoding='utf-8')
    (folder/'FILES.md').write_text('# Reconstruction order\n\n'+'\n'.join(f'{i+1}. `{file}`' for i,file in enumerate(w['files']))+'\n\nUse original files from source unless this week or a prior week provides a replacement in extensions. Apply overlays cumulatively in week order. Never overwrite your learner workspace with a reference checkpoint; create a separate comparison folder.\n',encoding='utf-8')
(OUT/'course-map.json').write_text(json.dumps([{k:w[k] for k in ['number','title','objective','files']} for w in weeks],indent=2),encoding='utf-8')
print(json.dumps({'weeks':len(weeks),'lessons':sum(len(w['steps']) for w in weeks),'words':sum(len((OUT/f"week-{w['number']:02}/Week-{w['number']:02}.md").read_text().split()) for w in weeks)}))
