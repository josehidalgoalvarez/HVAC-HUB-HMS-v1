# HVACHome

Phone-first building maintenance work-order and operations app for one technician managing ~1,288 residential units.

- **Stack:** React 19 + Vite + TypeScript frontend; Slim 4 PHP JSON API (`src/Controllers`, `src/Models`, `src/Services`).
- **Repository:** `https://github.com/josehidalgoalvarez/HVAC-HUB-HMS-v1` (`main`)
- **Live Site:** `https://mediumturquoise-gazelle-912925.hostingersite.com/`
- **Live Version (as of Nov 14, 2026):** Frontend `mwgxcknu-91e8eb2` | Backend `b1d1e5a`

## Run Locally

- **Prerequisites:** Node.js, PHP (with `pdo_sqlite`), Composer (`vendor/`).
- **Install & run:**
  ```bash
  npm install
  npm run dev
  ```
- **Database:** Local dev uses SQLite (`hvachome_dev.sqlite`), auto-created by [src/Db.php](src/Db.php) — **not** representative of live MySQL data.
- **API mode:** Built with `VITE_USE_API=true` (same-origin `/api`).

## Verify

```bash
npm run typecheck
```
(`0` errors; `tsconfig.json` has no `strict` / `strictNullChecks`.)

**10 Core Verification Suites (258 total — any other claimed total is a transcription error):**

| Suite | Count |
|---|---:|
| `tests/verify_acceptance.php` | 23 |
| `tests/verify_complexes_and_defaults.php` | 53 |
| `tests/verify_weather_and_watch_diet.php` | 31 |
| `tests/verify_past_wo_import.php` | 6 |
| `tests/verify_sops.php` | 17 |
| `tests/verify_phase1_api.php` | 35 |
| `tests/verify_sqlite_schema.php` | 28 |
| `tests/verify_blocked_wo.php` | 11 |
| `tests/verify_cancel_undo.php` | 26 |
| `tests/verify_blocked_phase2.php` | 28 |
| **Total** | **258** |

**Separate Test Files (not part of the 258):**
- `php tests/test_mcp_server.php` — 84 tests
- `php tests/test_ticket_relationships.php` — 6 tests
- `node tests/test_inventory_sync.mjs` — 17 tests
- `node tests/test_a11y_top_fixes.mjs` — 22 tests
- `node tests/test_client_error_reporter.mjs` — 4 tests
- `php tests/test_timing_middleware.php` — 3 tests

## Deploy

Follow [deploy/DEPLOY.md](deploy/DEPLOY.md) — do not hunt transcripts for credentials.

**Hard guard:** Never upload `dist/.htaccess`; verify live `/public_html/.htaccess` matches [deploy/root.htaccess](deploy/root.htaccess) verbatim after every frontend deploy.

## Docs Map

- [AGENT_CONTEXT.md](AGENT_CONTEXT.md) — Current baseline, inventory/DB counts, standing rules, and open items.
- [docs/observability.md](docs/observability.md) — Server/client error logs, UptimeRobot monitors, slow-request timing, and MCP tools.
- [deploy/DEPLOY.md](deploy/DEPLOY.md) — Production build and Hostinger FTP deployment runbook.
- [docs/v1-reference/](docs/v1-reference/) — Legacy v1-era reference docs (kept as history).

*(A fuller handover document is kept outside the repo by the owner.)*
