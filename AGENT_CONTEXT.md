# AGENT CONTEXT: HVACHome (Nov 14, 2026)

## 1. Project, Repo & Stack
- **Project**: HVACHome — building maintenance work-order and operations app for Jose Hidalgo, Building Maintenance Technician at Patry Group of Companies (Kingston, Ontario, Canada). Used on a phone in the field.
- **Scope**: Complexes → buildings → units → appliances, tickets (work orders), run sheets, watches, parts/stockpiles, equipment, stored appliances, notices of entry, and SOPs.
- **Repository**: `https://github.com/josehidalgoalvarez/HVAC-HUB-HMS-v1` (branch `main`). Local dir: `/Users/josehidalgo/Desktop/Downloads Backup/Active-Projects/Web-Development-Apps/HVACHome`.
- **Stack**: React 19 + Vite + TypeScript frontend; Slim 4 PHP JSON API (`src/Controllers`, `src/Models`, `src/Services`). `tsconfig.json` has no `strict` / `strictNullChecks`; `npm run typecheck` (`tsc --noEmit`) = 0 errors.
- **Database**: MySQL migrations `001`–`062` in `migrations/` (next free: `063`). Local dev DB is SQLite (`hvachome_dev.sqlite`, auto-created via `src/Db.php::ensureSqliteSchema()`).
- **Environment**: Built with `VITE_USE_API=true`, same-origin `/api`. Live dev logins are disabled in production (management + tech only).
- **Observability & MCP**: 14 MCP tools at `POST /api/mcp` (Streamable HTTP, JSON-RPC 2.0, protocol `2024-11-05`, per-user Bearer `api_token`, raw JSON-RPC responses): 7 read-only v1 (`list_tickets`, `get_ticket`, `list_buildings`, `get_unit_appliances`, `search_parts`, `get_stockpile`, `get_counts`) + 4 write v2 (`record_move`, `log_part_use`, `add_to_buy_list`, `create_ticket`) + 3 observability read tools (`get_server_errors` #12, `get_client_errors` #13, `get_slow_requests` #14). Client connection was skipped by Jose on Nov 8 — settled, do not re-pitch. See `docs/observability.md`.

## 2. Current State & Live Baseline (Nov 14, 2026)
- **Live Site**: `https://mediumturquoise-gazelle-912925.hostingersite.com/` (LIVE & API-FED).
- **Repo Code Head**: `b1d1e5a` (`2026-11-14`, *"feat(observability): slow-request timing log"*).
- **Live Frontend**: `mwgxcknu-91e8eb2` (`assets/index-8WHW2Mj5.js`) | **Live Backend**: `b1d1e5a`.
- **Inventory & UI**: `GET /api/inventory` raw 522,122 B (down from 1,054,589 B, −50.49%), gzip 28,752 B; bulk units projection = 13 keys/row; ETag+304 live (`Cache-Control: private, no-cache`). `TicketDetailView` split complete (10/10 steps, 2,904 → 358 lines).
- **Live DB Counts (Nov 13–14, zero deltas)**:
  - Units: 1,288
  - Appliances: 53
  - Tickets: 43 (max ID 46; IDs 22, 23, 28 do not exist)
  - Timeline: 29 | Corrections: 132
  - Parts: 239 | Part Allocations (`part_stockpile`): 235
  - Stockpiles: 30 (max ID 31) | Equipment: 25 | Movements: 8
  - Default Sets: 13 | Buildings: 96 | Complexes: 10 (canonical)
  - Run Sheets: 4 | Run Sheet Blocks: 7 | Ticket Part: 2
  - Buy List Items: 0 | Ticket Relationships: 0
  - SOPs: 8 | SOP Steps: 161
  - Observability: `server_error_log` 0, `client_error_log` 0 (plus one `[TEST]` row), `slow_request_log` 0
  - Job tables: 0
- **Verify Suites Baseline (258 total across 10 suites)**:
  - `verify_acceptance`: 23 | `verify_complexes_and_defaults`: 53 | `verify_weather_and_watch_diet`: 31 | `verify_past_wo_import`: 6 | `verify_sops`: 17 | `verify_phase1_api`: 35 | `verify_sqlite_schema`: 28 | `verify_blocked_wo`: 11 | `verify_cancel_undo`: 26 | `verify_blocked_phase2`: 28
  - Separate test files (not part of the 258): `test_mcp_server.php` (84), `test_ticket_relationships.php` (6), `test_inventory_sync.mjs` (17), `test_a11y_top_fixes.mjs` (22), `test_client_error_reporter.mjs` (4), `test_timing_middleware.php` (3).

## 3. Building Details Coverage Audit (`utils/buildingProfiles.ts`)
- **Total Portfolio Entries in `RESIDENTIAL_PROPERTIES`**: 96 buildings.
- **Landed Building Details**: 58 profiles + Nov 7 `565` trio merge and `690` removal (`567` no longer exists as built).
- **Queued Batch NOT Yet Landed (28 unprofiled buildings in `RESIDENTIAL_PROPERTIES`)**:
  - **Amherst Townhouses Batch**: 28 unprofiled townhouses (`123`, `125`, `127`, `129`, `131`, `133`, `135`, `165`, `167`, `169`, `171`, `173`, `175`, `177`, `179`, `191`, `193`, `195`, `197`, `199`, `201`, `205`, `207`, `209`, `211`, `213`, `217`, `219 Amherst Dr`). `'137 amherst dr'` (the 29th townhouse, `set-amherst-townhouse`) is already profiled.
- **Blocked / Out-of-Scope Buildings (DO NOT profile from guesses)**:
  - **Bucket (b) — Blocked on missing Yardi unit extract (9 repo buildings, 0 units in repo)**: `585 Victoria St`, `614 Victoria St`, `616 Victoria St`, `620 Victoria St`, `520 Frontenac St`, `655 Princess St`, `837 Princess St`, `176 Railway St`, `55 Ontario St`.
  - **Bucket (c) — Ownership / scope / outlier exclusions**:
    - `847 Development` (`prop-dev-847` in repo): `responsibility: 'external'` (own superintendent — not Jose's responsibility).
    - `Westgate Square` (36 entries, not in `RESIDENTIAL_PROPERTIES`): Digest only, not integrated — awaiting Jose's ownership/scope answer.
    - Far outliers (`Eagle`, `150 Marketplace`, `268 Talbot St`, `2 Metcalfe`, not in `RESIDENTIAL_PROPERTIES`): Excluded as far outliers.
  - **Bucket (d) — Conditional / no-count profiles already present in `utils/buildingProfiles.ts`**: `203 Colborne St` (`'203 colborne st'`) and `181 Hillendale Ave` (`'181 hillendale ave'`).

## 4. Defaults & Inventory Model Facts
- **Defaults Source of Truth**: Frontend `residential_constants.tsx` (13 default sets, synced to live DB).
- **Appliance Specifications**:
  - Standard sets: Fridge 18 cu ft / 120V / Electric; Stove electric coil 240V / 5.3 cu ft / Electric; Dishwasher model `Frigidaire FFCD2418US3A` / 120V / 14 Place Settings / Electric; Range Hood 120V / Electric / 300 CFM.
  - Elm Apartment set (`set-elm-apt`, migration 047 from 24 Elm 1A plates): Fridge `FFHT1826LK5` (`115V`, `6.0A`, `R134a 4.25 oz`), Range `CFEF3048LSJ` (`120/240V`, `12.5 kW`), Dishwasher `FFBD2404NS0A` (`1.1A` motor, `7.6A` other), Range Hood `RL6100F-C` (`120V`, `1.7A`, `210 CFM`).
  - Skyfall / Le Santé uniform set (`set-skyfall-sante-uniform`, migration 048): AC `EZVA18L341N57AA`, Unit Water Heater `SS6-40LDE-45 250` (`36.3 gal / 137 L`), Thermostat `24V`, Dishwasher `MDF24P2BST`, Fridge `MRT18D3BST` (`115V`), Stove `MER30B1A4STC`.
  - `2274 Princess` has its **own** default set (`set-princess-2274-standard`) — it does NOT share `set-skyfall-sante-uniform`.
  - Townhouse sets (BD, Amherst, Manitou) add: Unit Water Heater Electric 4500W / 60 gal / 240V.
  - BD sets ONLY: Stove color `Black`. Non-BD stoves have no color field.
  - Serial numbers NEVER in defaults.
- **Inventory Model**:
  - Entities: (1) Storage areas/stockpiles, (2) Stored appliances (donor units/harvest sources, NOT part rows), (3) Parts, (4) Equipment.
  - Stockpile IDs & Locations (30 stockpiles, max ID 31): 1 = 511 Days Rd Storage, 2 = 107 Amherst Storage, 3 = 539 Armstrong, 4 = 394 Alfred, 5 = 810 Blackburn Mews, 6 = 85 Park St, 7 = 181 Hillendale Ave, 8 = 18 Elm St, 9 = 265 Ontario Upstairs, 10 = 265 Ontario Basement, 11 = 698 McKay St Warehouse, 12 = 698 McKay Sea Containers (group container, 0 items), 13 = 1731/1733 Shared Mech Room, 14 = Sea Can 2 — 698 McKay, 15 = 1721 Bath Mech Room, 16–27 = Sea Cans 3–14 (698 McKay), 30 = Sea Can 0, 31 = 509 Days Rd Storage.

## 5. Standing Rules & Security
- **No-Invent Rule**: NEVER invent serial numbers, models, install dates, postal codes, phone numbers, unit counts, or supplier details. Unknown = empty / `"Not yet recorded"`.
- **Defaults by Reference**: Units store deviations only — never copy default sets onto units.
- **Append-Only Corrections**: Historical logs and corrections are append-only; never rewrite history silently.
- **Field Truth Beats File Truth**: Yardi "Completed" alone NEVER closes an app ticket.
- **Lookup Convention**: Resolve stockpiles, units, and buildings by NAME/label lookup, never by hardcoded ID.
- **Two Front Controllers**: `public/index.php` (dev) and `deploy/public_api_index.php` (production → `backend/public_api/index.php`) are both wired for `ServerErrorLog` and `TimingMiddleware` — keep them in sync.
- **`.htaccess` Hard Guard**: Never upload `dist/.htaccess`; verify live `/public_html/.htaccess` matches `deploy/root.htaccess` verbatim after every frontend deploy.
- **Token Route**: `POST /api/login` returns `data.token` (not `data.api_token`); same long-lived token on later logins.
- **Migration Runner Rule**: Try the ephemeral runner ONCE; if it 500s, stop and apply via phpMyAdmin (062 was the first runner success; 060/061 needed phpMyAdmin).
- **Credentials & Server Safety**: Live DB, `APP_SECRET`, FTP, and user account passwords/tokens must NEVER be printed, repeated, guessed, or committed. Never touch `public_html/backend/.env` or auth logic. Backups go outside the repo tree (`~/Desktop/Downloads Backup/HVACHome-Backups/HVACHome-backup-YYYYMMDD-<task>/`). `POST /api/admin/seed-demo` is destructive — NEVER call authenticated on live.

## 6. Open Items & Pending Decisions (Nov 14, 2026)
1. **Amherst Townhouses Batch (28 unprofiled)**: Confirm profiling the 28 remaining Amherst townhouses while leaving `'137 amherst dr'` on its existing profile.
2. **Missing Yardi Unit Extracts (9 buildings)**: Provide Yardi unit extracts for `585/614/616/620 Victoria St`, `520 Frontenac St`, `655 Princess St`, `837 Princess St`, `176 Railway St`, `55 Ontario St`.
3. **Westgate Square & 847 Development Scope**: Confirm whether Westgate Square (36 entries) is external or partially Jose's, and confirm `847 Development` stays `external`.
4. **Field Follow-Ups**: `565-401` return visit + Monday Nov 16 check-in; `1721/1723` ECO monitoring.
5. **Ticket #3 Decision**: Cron Fri Dec 4, 2026 ~09:37 EST, auto-prune ~Dec 5 — do NOT hand-prune.
6. **MCP Client Connection**: Skipped by Jose (Nov 8) — Jose's call to reopen, do not re-pitch.
7. **`RESIDENTIAL_TICKETS` Constant**: KEEP as-is.
8. **Security / Hygiene**: Credential rotation, scratch cleanup, and global skills cleanup still outstanding.
