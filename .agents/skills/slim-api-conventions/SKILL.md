---
name: slim-api-conventions
description: Conventions for the HVACHome Slim 4 JSON API on Hostinger shared hosting — routing, PDO usage, auth, response shape, and the append-only corrections rule. Load when writing or reviewing any PHP backend code.
---

# Slim API Conventions (HVACHome v2)

## Non-negotiables

- **JSON only.** Slim serves data, never HTML. Every response is JSON with a consistent envelope:
  ```json
  { "data": { ... }, "error": null }
  { "data": null, "error": { "code": "not_found", "message": "..." } }
  ```
- **Corrections are append-only.** The `correction` table gets INSERTs only — no UPDATE, no DELETE. Every field edit on tickets/parts/logs writes a correction row (field, old, new, who, when, reason). Enforce in code, not just convention.
- **Field truth wins.** On sync conflicts, the newer field value wins per-field; the losing value goes into `correction`, never discarded.
- **No business logic that belongs in the client.** The API is deliberately boring: CRUD + a few services (`BatchSuggester`, `VehiclePlanner`, `WatchEngine`). If logic could live in React, it lives in React.

## Structure

```
public/index.php        # front controller only
public/.htaccess        # rewrite to front controller
src/Config.php          # env-based: DB creds, upload dir, CORS origins
src/Db.php              # PDO wrapper (prepared statements, always)
src/Auth.php            # token auth; roles: tech, management
src/Routes.php          # /api/* registration
src/Controllers/*       # one per resource: TicketController, RunsheetController, ...
src/Services/*          # BatchSuggester, VehiclePlanner, WeatherInput, WatchEngine, DigestBuilder
src/Models/*            # thin data access, no logic
migrations/*.sql        # numbered, run in order
cli/check-watches.php   # Hostinger cron entrypoint for the watch engine
```

## Rules

- **PDO with prepared statements, always.** No string-interpolated SQL. Ever.
- **Endpoint naming:** `GET /api/tickets`, `POST /api/tickets`, `GET /api/tickets/:id`, `PATCH /api/tickets/:id`. Nested actions as sub-resources: `POST /api/tickets/:id/children`, `GET /api/tickets/:id/corrections`.
- **Auth:** token in `Authorization: Bearer` header. Role-check per route group — tech routes vs management routes.
- **Uploads:** photos land in a capped directory; resize server-side (GD/Imagick) as a backstop even though the client compresses first. Hostinger storage is the first constraint to watch.
- **Migrations** are numbered and never edited after being run — new change = new file.
- **CORS:** allow only the deployed frontend origin. No wildcard in production.
