# AGENT CONTEXT: HVACHome (Oct 29, 2026)

## 1. Project, Repo & Stack
- **Project**: HVACHome — building maintenance work-order and operations app for Jose Hidalgo, Building Maintenance Technician at Patry Group of Companies (Kingston, Ontario, Canada). Used on a phone in the field.
- **Scope**: Complexes → buildings → units → appliances, tickets (work orders), run sheets, watches, parts/stockpiles, equipment, stored appliances, notices of entry, and SOPs.
- **Repository**: `https://github.com/josehidalgoalvarez/HVAC-HUB-HMS-v1` (branch `main`). Local dir: `/Users/josehidalgo/Desktop/Downloads Backup/Active-Projects/Web-Development-Apps/HVACHome`.
- **Stack**: React 19 + Vite + TypeScript frontend; Slim 4 PHP JSON API (`src/Controllers`, `src/Models`, `src/Services`).
- **Database**: MySQL migrations 001–046 in `migrations/`. Local dev DB is SQLite (`hvachome_dev.sqlite`, auto-created via `src/Db.php::ensureSqliteSchema()` — note: SQLite bootstrap previously lacked buy_list_item and equipment; cea24c9 adds both, so a fresh local DB now bootstraps them; live MySQL is unaffected).
- **Environment**: Built with `VITE_USE_API=true`, same-origin `/api`. Live dev logins are disabled in production (management + tech only).

## 2. Current State & Live Baseline (Oct 29, 2026)
- **Live Site**: `https://mediumturquoise-gazelle-912925.hostingersite.com/` (LIVE & API-FED).
- **Last code head verified: cea24c9 (SQLite bootstrap only: buy_list_item + equipment CREATEs in src/Db.php, matching migrations 044/045; live code head remains 8065826)** | **Live Version**: `mvt1dhxx-8065826` | **Live Bundle**: `assets/index-BxZQW_OB.js`.
- **Repo vs Live**: repo HEAD cea24c9 includes docs commits ad60064/ae25eb3 plus the SQLite-only cea24c9 change; live remains 8065826. src/Db.php is SQLite-bootstrap-only and must NEVER be uploaded on a deploy — a future deploy from the then-current repo head will carry the frontend as built at that head, with version.json commitHash updated, but no live DB change from Db.php.
- **Health**: `/api/health` returns `{"data":{"status":"ok","db":"ok"},"error":null}`.
- **Live Counts (Verified Post-Migration 046)**:
  - Units: 1,289 (verified portfolio)
  - Tickets: 25 (21 seeded + 4 archived `[TEST-DIAGNOSTIC]`)
  - Run Sheets: 2 (id 7 "Day Plan — 2026-10-27" + id 9 "Day Plan — 2026-10-28", active)
  - Suppliers: 2 (Home Depot + Dependable Appliances; Dependable contact/address/account NULL after migration 042)
  - Stockpiles: 27
  - Parts: 95
  - Part Allocations: 95
  - Equipment: 7
  - Stored Appliances: 8
  - Buy List Items: 0
  - Count History: 0
  - Corrections: 66
  - SOPs: gas-furnace v2 with 74 steps + 5 DRAFT SOPs (`todo_verify=1`)
  - Verify Suites Baseline: 107/107 PASS (`verify_complexes_and_defaults` 53, `verify_phase2_api` 28, `verify_unit_context` 26).

## 3. Defaults & Inventory Model Facts
- **Defaults Source of Truth**: Frontend `residential_constants.tsx` (12 sets, synced to live DB via UPDATE-only migration 046).
- **Appliance Specifications**:
  - Standard sets: Fridge 18 cu ft / 120V / Electric; Stove electric coil 240V / 5.3 cu ft / Electric; Dishwasher model `Frigidaire FFCD2418US3A` / 120V / 14 Place Settings / Electric (in both item model and `specs.model`); Range Hood 120V / Electric / 300 CFM.
  - Townhouse sets (BD, Amherst, Manitou) add: Unit Water Heater Electric 4500W / 60 gal / 240V.
  - BD sets ONLY: Stove color `Black`. Non-BD stoves have no color field.
  - Skyfall / Le Santé uniform set: AC 240V, Unit Water Heater, Thermostat 24V, Dishwasher (NO model), Fridge, Stove (NO color, NO Range Hood row, 6 items total). Washer/dryer is a unit attribute, NEVER a default row.
  - Fridge/stove/hood brand & model are TBD everywhere (derive "Standard / Default", never invent brands/models). Serial numbers NEVER in defaults.
- **Inventory Model**:
  - Entities: (1) Storage areas/stockpiles, (2) Stored appliances (donor units/harvest sources, NOT part rows), (3) Parts, (4) Equipment.
  - Stockpile IDs & Locations: 1 = 511 Days Rd Storage, 2 = 107 Amherst Storage, 3 = 539 Armstrong, 4 = 394 Alfred, 5 = 810 Blackburn Mews, 6 = 85 Park St, 7 = 181 Hillendale Ave, 8 = 18 Elm St, 9 = 265 Ontario Upstairs, 10 = 265 Ontario Basement, 11 = 698 McKay St Warehouse, 12 = 698 McKay Sea Containers (group container, 0 items), 13 = 1731/1733 Shared Mech Room, 14 = Sea Can 2 — 698 McKay, 15 = 1721 Bath Mech Room, 16–27 = Sea Cans 3–14 (698 McKay).
  - Building IDs (Live): 511 Days = 15, 107 Amherst = 58, McKay = 89, 1731/1733 = 5, 1721 Bath = 2.
  - Sea Cans 2–14 photo-verified. Can 1 is unseen — NEVER seed it. Renovation cans held.
  - 1731/1733 Shared Mech Room holds 1 water heater + 2 donor fridges (stored appliances 21–22).
  - 1721 Bath Mech Room holds 7 water heaters (5 plumbed, 3 running: 2 John Wood + 1 AO Smith; 1 weeping John Wood ProLine; 2 disconnected/rotting; 7th TBD). Operational vs equipment modeling is undecided.

## 4. Standing Rules & Design System
- **No-Invent Rule**: NEVER invent serial numbers, models, install dates, postal codes, phone numbers, or supplier details. Unknown = empty / TODO-verify.
- **Defaults by Reference**: Units store deviations only — never copy default sets onto units.
- **Append-Only Corrections**: Historical logs and corrections are append-only; never rewrite history silently.
- **Field Truth Beats File Truth**: Yardi "Completed" alone NEVER closes an app ticket.
- **UI Design System**: Flat surfaces, Technician Blue accent, amber ONLY for storage, Material Symbols only (no emojis), touch targets min 44px, readable at 360px.
- **Lookup Convention**: Resolve stockpiles, units, and buildings by NAME/label lookup, never by hardcoded ID.
- **Git & Workflow**: Every pasted prompt starts with `FOR CLAUDE` or `FOR ANTIGRAVITY`. Antigravity commits and pushes to `origin/main`. Live-data-only / deploy-only tasks must not make empty commits.

## 5. Security Rules
- **Credentials**: Live DB, APP_SECRET, FTP, and user account passwords must NEVER be printed, repeated, guessed, or committed in chat, reports, or files.
- **FTP Deployment**: Fresh session credentials only; never reuse older credentials. Hostinger MCP full-overwrite endpoint is rejected.
- **Server Safety**: NEVER touch `public_html/backend/.env` or auth logic (`Auth.php`, `Config.php`).
- **Backups**: Backups must always be placed OUTSIDE the repo tree (`~/Desktop/HVACHome-backup-YYYYMMDD-<task>/`).
- **Destructive Endpoints**: `POST /api/admin/seed-demo` is destructive — NEVER call it authenticated on live (unauthenticated returns 401).

## 6. Open Items & Phone Checklist
- **Top 3 Urgent Open Items**:
  1. **Phone Verdict**: Jose to reload twice on phone and verify building-list Stock Menu buttons (511, 107, McKay menu), DetailView yellow storage button, unit appliance specs (`FFCD2418US3A` + BD stove `Black`), and unchanged Parts menus.
  2. **511 Stove Action**: Decide keep or delete on part 25 / allocation 26 (qty 1, 'available', location_notes 'Initial stock', created Oct 27).
  3. **Work Order Update & Fork Selection**: Reconcile existing app tickets vs Yardi + field truth, or import new Yardi WOs via `past-WO` importer.
- **Other Pending Decisions**:
  - SOP Audio: Jose to provide audio for first job (e.g. 1723-266 Askoll M376 pump or 1719-273 fridge shelf).
  - Day Plan whole-plan clear scope.
  - 1721/1731-1733 water heater modeling (stored appliance operational vs equipment).
  - Dependable winning phone number confirmation.
  - "Wagon Complex" clarification.
  - Fixture ticket cleanup (8 `WO-E2E` + 4 `[TEST-DIAGNOSTIC]`).
  - Add `buy_list_item` and `equipment` to `ensureSqliteSchema()` for local test parity.
  - Credential rotation and scratch directory cleanup.
