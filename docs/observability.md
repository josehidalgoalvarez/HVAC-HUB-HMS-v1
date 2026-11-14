# Observability — HVACHome

As of **Nov 14, 2026** (HEAD `b1d1e5a`), HVACHome has four in-house / free-tier observability layers:

1. **Server Error Log** (PHP exceptions, warnings, fatal errors)
2. **Client Error Reporting** (React ErrorBoundary + browser `window` errors)
3. **UptimeRobot** (external availability + keyword content checks)
4. **Slow-Request Timing** (API requests `>= 1000 ms` + `X-Response-Time` header)

---

## 1. What Exists

### 1.1 Server Error Log
- **What it captures:** Uncaught PHP exceptions, warnings, and fatal errors in the Slim 4 API.
- **Where it lives:**
  - Table: `server_error_log`
  - Migration: [migrations/060_server_error_log.sql](migrations/060_server_error_log.sql) (also in [src/Db.php](src/Db.php))
  - Model: [src/Models/ServerErrorLog.php](src/Models/ServerErrorLog.php)
  - Wired in both front controllers: [public/index.php](public/index.php) (dev) and [deploy/public_api_index.php](deploy/public_api_index.php) (production `backend/public_api/index.php`)
- **Retention:** 30 days (pruned inside `ServerErrorLog::log()`).
- **MCP tool:** `get_server_errors`
  - Filters: `level` (`error` | `warning` | `fatal`), `limit` (1–100, default 20), `since` (`YYYY-MM-DD` or datetime)
  - Empty result (`{"errors": [], "total": 0}`) means **no server errors logged yet** — not a broken tool.

### 1.2 Client Error Reporting
- **What it captures:** React render crashes (`ErrorBoundary.componentDidCatch`) and uncaught browser errors (`window.onerror`, `unhandledrejection`).
- **Where it lives:**
  - Table: `client_error_log`
  - Migration: [migrations/061_client_error_log.sql](migrations/061_client_error_log.sql) (also in [src/Db.php](src/Db.php))
  - Model: [src/Models/ClientErrorLog.php](src/Models/ClientErrorLog.php) — redaction regexes strip `Bearer ...`, `Authorization: ...`, and `password=...`
  - Reporter: [utils/clientErrorReporter.ts](utils/clientErrorReporter.ts) — `DEDUP_WINDOW_MS = 60_000` (60s dedup on `message::route`), `MAX_SESSION_REPORTS = 5` (5/session cap), fire-and-forget `POST /api/client-errors`
  - Entrypoints: [components/common/ErrorBoundary.tsx](components/common/ErrorBoundary.tsx) and [index.tsx](index.tsx)
  - Route: `POST /api/client-errors` inside the protected `/api` group in [src/Routes.php](src/Routes.php)
- **Retention:** 30 days (pruned inside `ClientErrorLog::log()`).
- **MCP tool:** `get_client_errors`
  - Filters: `source` (`boundary` | `window` | `unhandledrejection`), `limit` (1–100, default 20), `since` (`YYYY-MM-DD` or datetime)
  - Empty result (`{"errors": [], "total": 0}`) means **no client errors logged yet** — not a broken tool.

### 1.3 UptimeRobot (External Monitoring)
- **Account:** Free plan (`josepakohidalgo@gmail.com`).
- **Alert contact:** `josepakohidalgo@gmail.com` (up + down notifications).
- **Monitors:**
  1. **"HVACHome — Site"** (ID `804676767`): Keyword monitor on `https://mediumturquoise-gazelle-912925.hostingersite.com/`, keyword `HVACHome Operations`, 5-minute interval.
  2. **"HVACHome — API Health"** (ID `804676777`): Keyword monitor on `https://mediumturquoise-gazelle-912925.hostingersite.com/api/health`, keyword `"status":"ok"` (exact), 5-minute interval.
- **Why keyword checks exist:** A plain HTTP 200 check is not enough — the Site keyword monitor catches wrong-content serving (such as the Nov 13 `.htaccess` incident), not just downtime.

### 1.4 Slow-Request Timing
- **What it captures:** Every API request whose duration is `>= 1000 ms`, logging `method`, matched route **pattern** (e.g. `/api/tickets/{id}`, never the literal ID), `duration_ms`, `status_code` (500 on exception via `try/finally`), and `user_id` (if authenticated).
- **Where it lives:**
  - Table: `slow_request_log`
  - Migration: [migrations/062_slow_request_log.sql](migrations/062_slow_request_log.sql) (also in [src/Db.php](src/Db.php))
  - Model: [src/Models/SlowRequestLog.php](src/Models/SlowRequestLog.php)
  - Middleware: [src/Middleware/TimingMiddleware.php](src/Middleware/TimingMiddleware.php) (`SLOW_THRESHOLD_MS = 1000`)
  - Wired in both [public/index.php](public/index.php) and [deploy/public_api_index.php](deploy/public_api_index.php) before `addRoutingMiddleware()` (LIFO order so it runs after routing).
- **Retention:** 30 days (pruned inside `SlowRequestLog::log()`).
- **MCP tool:** `get_slow_requests`
  - Filters: `route` (optional substring match on route pattern), `min_duration_ms` (integer, default `1000`, min `0`), `limit` (1–100, default 20), `since` (`YYYY-MM-DD` or datetime)
  - Empty result (`{"requests": [], "total": 0}`) means **no slow requests logged yet** — not a broken tool.

---

## 2. Thresholds & Headers

- **`SLOW_THRESHOLD_MS = 1000`** in `App\Middleware\TimingMiddleware`: warm API calls run around ~250 ms, while cold starts (e.g. cold `GET /api/inventory` measured at 3.3s) and real performance regressions land above 1000 ms.
- **`X-Response-Time` header:** Added to **every** API response (`{ms}ms`). Verify live with:
  ```bash
  curl -I https://mediumturquoise-gazelle-912925.hostingersite.com/api/health
  ```

---

## 3. Troubleshooting Checklist

1. **Site down or serving wrong content:** Check UptimeRobot (`804676767` / `804676777`) and `curl -i https://mediumturquoise-gazelle-912925.hostingersite.com/api/health`.
2. **Crash on phone (ErrorBoundary / white screen):** Call MCP `get_client_errors` (filter `source: "boundary"` for React render crashes, or omit `source` for all).
3. **Slow page or cold-start regression:** Call MCP `get_slow_requests` (default `min_duration_ms: 1000`) and inspect `X-Response-Time` headers on live requests.
4. **Server 500 error:** Call MCP `get_server_errors` (filter `level: "error"` or `"fatal"`).

---

## 4. What Is NOT Here & First-Proof Note

- **No third-party APM:** No New Relic or Datadog (overkill and paid on shared hosting). If third-party error tracking is ever wanted later, Sentry is the standard default.
- **First-proof note:** As of Nov 14, 2026, `server_error_log` has 0 rows, `client_error_log` has 0 real rows (plus one `[TEST]` row from initial verification), and `slow_request_log` has 0 rows. Empty tables are expected — the first real proof is the next real error or slow call landing in its table.
