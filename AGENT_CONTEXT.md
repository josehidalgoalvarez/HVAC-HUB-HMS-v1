# AGENT CONTEXT: HVACHome (Oct 30, 2026)

## 1. Project, Repo & Stack
- **Project**: HVACHome — building maintenance work-order and operations app for Jose Hidalgo, Building Maintenance Technician at Patry Group of Companies (Kingston, Ontario, Canada). Used on a phone in the field.
- **Scope**: Complexes → buildings → units → appliances, tickets (work orders), run sheets, watches, parts/stockpiles, equipment, stored appliances, notices of entry, and SOPs.
- **Repository**: `https://github.com/josehidalgoalvarez/HVAC-HUB-HMS-v1` (branch `main`). Local dir: `/Users/josehidalgo/Desktop/Downloads Backup/Active-Projects/Web-Development-Apps/HVACHome`.
- **Stack**: React 19 + Vite + TypeScript frontend; Slim 4 PHP JSON API (`src/Controllers`, `src/Models`, `src/Services`).
- **Database**: MySQL migrations 001–048 in `migrations/`. Local dev DB is SQLite (`hvachome_dev.sqlite`, auto-created via `src/Db.php::ensureSqliteSchema()`).
- **Environment**: Built with `VITE_USE_API=true`, same-origin `/api`. Live dev logins are disabled in production (management + tech only).

## 2. Current State & Live Baseline (Oct 30, 2026)
- **Live Site**: `https://mediumturquoise-gazelle-912925.hostingersite.com/` (LIVE & API-FED).
- **Repo Code Head Verified**: `1aa1dfd` (`2026-10-30`, *"feat: Building Details profiles for Amherst 3-2-2 and 4x4 buildings (111–229)"*); **Last Test Addition**: `cfdfe01` (`tests/verify_sqlite_schema.php`, 28 checks).
- **Last Agent-Reported Live State (Oct 30, 2026 — NOT re-verified in this docs-only task)**:
  - **Last-Reported Live Frontend**: commit `1aa1dfd` | Version `mvviymuc-1aa1dfd` | Bundle `assets/index-BmgmkMoV.js` (reported after the Amherst 3-2-2 & 4x4 deploy on Oct 30, 2026).
  - **Last-Reported Live DB Counts** (source: Oct 30, 2026 post-migration 047/048 & unit-appliance seed deploys; **last agent-reported, NOT re-verified in this docs-only task**):
    - Units: 1,289 (verified portfolio)
    - Tickets: 25 (21 seeded + 4 archived `[TEST-DIAGNOSTIC]`)
    - Stockpiles: 27
    - Parts: 95
    - Part Allocations (`part_stockpile`): 95
    - Equipment: 7
    - Stored Appliances (`stockpile_id IS NOT NULL`): 8
    - Total Appliances: 35 (8 stored + 27 unit rows after Elm 1A/411 + 137 water heater + Le Santé 101 seeds)
    - Buy List Items: 0
    - Count History: 0
    - Corrections: 67 (`notice`: 8, `run_sheet`: 4, `run_sheet_block`: 18, `ticket`: 37)
  - **Verify Suites Baseline**: 135 total PASS (`verify_complexes_and_defaults`: 53, `verify_phase2_api`: 28, `verify_unit_context`: 26, `verify_sqlite_schema`: 28).

## 3. Building Details Coverage Audit (`utils/buildingProfiles.ts` at `1aa1dfd`)
- **Total Portfolio Entries in `RESIDENTIAL_PROPERTIES`**: 96 buildings (`58` profiled, `38` unprofiled).
- **Landed Building Details Batches (58 profiles present in `utils/buildingProfiles.ts`)**:
  1. **18 Elm (`a85067f`)**: `'18 elm st'` (1).
  2. **Shared Mech & Central Storage (`ecbd255`)**: `'1721 bath rd'`, `'1731 bath rd'`, `'1733 bath rd'`, `'511 days rd'`, `'107 amherst dr'` (5).
  3. **BD Apartments (`59d028e`)**: `'1719 bath rd'`, `'1723 bath rd'`, `'1725 bath rd'`, `'505 days rd'`, `'507 days rd'`, `'509 days rd'` (6).
  4. **BD Townhouses, Amherst Twin/137 & Elm Cluster (`5cc5aac`)**: `'1727 bath rd'`, `'1737 bath rd'`, `'103 amherst dr'`, `'137 amherst dr'`, `'24 elm st'`, `'203 colborne st'` (6).
  5. **Large Frontenac, Uniform & Princess Trio (`c7c3c3c`)**: `'501 frontenac st'`, `'le sant'`, `'2274 princess st'`, `'563 princess st'`, `'565 princess st'`, `'567 princess st'` (6).
  6. **Storage Network (`b7fb805`)**: `'698 mckay st'`, `'539 armstrong rd'`, `'394 alfred st'`, `'265 ontario st'`, `'810 blackburn mews'`, `'85 park st'`, `'181 hillendale ave'` (7).
  7. **Manitou & Verified Singles (`1d67c8a`)**: `'77 manitou cres'`, `'77a manitou cres'`, `'77b manitou cres'`, `'77c manitou cres'`, `'415 albert st'`, `'36 durham st'` (6).
  8. **Alfred Converted Houses & Princess Rest (`8381002`)**: `'353 alfred st'`, `'359 alfred st'`, `'361 alfred st'`, `'376 alfred st'`, `'378 alfred st'`, `'630 princess st'`, `'800 princess st'`, `'800 princess st annex'` (8).
  9. **Amherst 3-2-2 & 4x4 Row Buildings (`1aa1dfd`)**: `'111 amherst dr'`, `'115 amherst dr'`, `'119 amherst dr'`, `'141 amherst dr'`, `'145 amherst dr'`, `'149 amherst dr'`, `'153 amherst dr'`, `'157 amherst dr'`, `'161 amherst dr'`, `'183 amherst dr'`, `'187 amherst dr'`, `'225 amherst dr'`, `'229 amherst dr'` (13).
- **Queued Batch NOT Yet Landed (28 unprofiled buildings in `RESIDENTIAL_PROPERTIES`)**:
  - **Amherst Townhouses Batch**: 28 unprofiled townhouses (`123`, `125`, `127`, `129`, `131`, `133`, `135`, `165`, `167`, `169`, `171`, `173`, `175`, `177`, `179`, `191`, `193`, `195`, `197`, `199`, `201`, `205`, `207`, `209`, `211`, `213`, `217`, `219 Amherst Dr`). Stopped before edit because `'137 amherst dr'` is the 29th repo townhouse (`set-amherst-townhouse`) and was already profiled in `5cc5aac`.
- **Blocked / Out-of-Scope Buildings (10 unprofiled in `RESIDENTIAL_PROPERTIES` + external/digest entries — DO NOT profile from guesses)**:
  - **Bucket (b) — Blocked on missing Yardi unit extract (9 repo buildings, 0 units in repo)**: `585 Victoria St`, `614 Victoria St`, `616 Victoria St`, `620 Victoria St`, `520 Frontenac St`, `655 Princess St`, `837 Princess St`, `176 Railway St`, `55 Ontario St`.
  - **Bucket (c) — Ownership / scope / outlier exclusions**:
    - `847 Development` (`prop-dev-847` in repo): `responsibility: 'external'` (own superintendent — not Jose's responsibility).
    - `Westgate Square` (36 entries, not in `RESIDENTIAL_PROPERTIES`): Digest only, not integrated — awaiting Jose's ownership/scope answer.
    - Far outliers (`Eagle`, `150 Marketplace`, `268 Talbot St`, `2 Metcalfe`, not in `RESIDENTIAL_PROPERTIES`): Excluded as far outliers.
  - **Bucket (d) — Conditional / no-count profiles already present in `utils/buildingProfiles.ts`**: `203 Colborne St` (`'203 colborne st'`) and `181 Hillendale Ave` (`'181 hillendale ave'`) are already profiled with conditional no-unit-count notes.

## 4. Defaults & Inventory Model Facts
- **Defaults Source of Truth**: Frontend `residential_constants.tsx` (12 sets, synced to live DB via UPDATE-only migrations 046–048).
- **Appliance Specifications**:
  - Standard sets: Fridge 18 cu ft / 120V / Electric; Stove electric coil 240V / 5.3 cu ft / Electric; Dishwasher model `Frigidaire FFCD2418US3A` / 120V / 14 Place Settings / Electric; Range Hood 120V / Electric / 300 CFM.
  - Elm Apartment set (`set-elm-apt`, migration 047 from 24 Elm 1A plates): Fridge `FFHT1826LK5` (`115V`, `6.0A`, `R134a 4.25 oz`), Range `CFEF3048LSJ` (`120/240V`, `12.5 kW`), Dishwasher `FFBD2404NS0A` (`1.1A` motor, `7.6A` other), Range Hood `RL6100F-C` (`120V`, `1.7A`, `210 CFM`).
  - Skyfall / Le Santé uniform set (`set-skyfall-sante-uniform`, migration 048 candidate pattern from Le Santé 101 plates, 6 items): AC `EZVA18L341N57AA`, Unit Water Heater `SS6-40LDE-45 250` (`36.3 gal / 137 L`), Thermostat `24V`, Dishwasher `MDF24P2BST`, Fridge `MRT18D3BST` (`115V`), Stove `MER30B1A4STC` (Microwave `MMO17S12ASTC` is a direct unit-101 row only; 2274 Princess shares `set-skyfall-sante-uniform` as an UNCONFIRMED candidate share).
  - Townhouse sets (BD, Amherst, Manitou) add: Unit Water Heater Electric 4500W / 60 gal / 240V.
  - BD sets ONLY: Stove color `Black`. Non-BD stoves have no color field.
  - Serial numbers NEVER in defaults.
- **Inventory Model**:
  - Entities: (1) Storage areas/stockpiles, (2) Stored appliances (donor units/harvest sources, NOT part rows), (3) Parts, (4) Equipment.
  - Stockpile IDs & Locations: 1 = 511 Days Rd Storage, 2 = 107 Amherst Storage, 3 = 539 Armstrong, 4 = 394 Alfred, 5 = 810 Blackburn Mews, 6 = 85 Park St, 7 = 181 Hillendale Ave, 8 = 18 Elm St, 9 = 265 Ontario Upstairs, 10 = 265 Ontario Basement, 11 = 698 McKay St Warehouse, 12 = 698 McKay Sea Containers (group container, 0 items), 13 = 1731/1733 Shared Mech Room, 14 = Sea Can 2 — 698 McKay, 15 = 1721 Bath Mech Room, 16–27 = Sea Cans 3–14 (698 McKay).

## 5. Standing Rules & Security
- **No-Invent Rule**: NEVER invent serial numbers, models, install dates, postal codes, phone numbers, unit counts, or supplier details. Unknown = empty / `"Not yet recorded"`.
- **Defaults by Reference**: Units store deviations only — never copy default sets onto units.
- **Append-Only Corrections**: Historical logs and corrections are append-only; never rewrite history silently.
- **Field Truth Beats File Truth**: Yardi "Completed" alone NEVER closes an app ticket.
- **Lookup Convention**: Resolve stockpiles, units, and buildings by NAME/label lookup, never by hardcoded ID.
- **Credentials & Server Safety**: Live DB, APP_SECRET, FTP, and user account passwords must NEVER be printed, repeated, guessed, or committed. Never touch `public_html/backend/.env` or auth logic. Backups go outside the repo (`~/Desktop/HVACHome-backup-YYYYMMDD-<task>/`). `POST /api/admin/seed-demo` is destructive — NEVER call authenticated on live.

## 6. Open Items & Pending Decisions
1. **Amherst Townhouses Batch (28 unprofiled)**: Confirm profiling the 28 remaining Amherst townhouses (`123–135`, `165–179`, `191–219 Amherst Dr`) while leaving `'137 amherst dr'` (the 29th townhouse) on its existing Batch 3 profile.
2. **Missing Yardi Unit Extracts (9 buildings)**: Provide Yardi unit extracts before profiling `585/614/616/620 Victoria St`, `520 Frontenac St`, `655 Princess St`, `837 Princess St`, `176 Railway St`, and `55 Ontario St` (plus `203 Colborne` and `181 Hillendale` if unit counts are desired).
3. **Westgate Square & 847 Development Scope**: Answer whether Westgate Square (36 entries) is external or partially Jose's, and confirm whether `847 Development` stays unprofiled (`external`).
4. **Other Open Field/Data Items**: 511 stove part 25 keep/delete decision; skipped unit-appliance rows (1719-273 fridge, 505-103 duplicate freezers, 1723-266 pump note, 137-137 range details) if revisited; 2274 Princess plate check; Manitou brand-cluster data; 501 Frontenac external unit list; 1721/1731-1733 water heater modeling.
