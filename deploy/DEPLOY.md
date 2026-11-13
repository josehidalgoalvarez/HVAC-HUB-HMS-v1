# HVACHome Production Deployment Runbook

This document is the authoritative deploy runbook for HVACHome on Hostinger production hosting. All production deployments must strictly adhere to the operational sequence, path mappings, and security guardrails detailed below.

---

## 1. Hosting Architecture & Path Mappings

- **Hosting Environment**: Shared Linux / Apache / LiteSpeed hosting running PHP 8.x with a remote MySQL database.
- **Production URL**: `https://mediumturquoise-gazelle-912925.hostingersite.com`
- **FTP Port & Host**: `195.179.239.151:21`
- **FTP Default Landing Root**: Logging into FTP lands directly inside `public_html/`.
  - When uploading root files (`index.html`, `sw.js`, `manifest.webmanifest`, `.htaccess`, and `assets/*`), upload directly relative to the FTP root (e.g. `STOR index.html` or `STOR assets/<bundle>.js`).
  - **Do NOT** upload into `/public_html/public_html/`.
- **Backend Directory**: Code lives under `/public_html/backend/`.
  - Production front controller: `backend/public_api/index.php`.
  - Production router and models: `backend/src/` (e.g. `STOR backend/src/Models/Stockpile.php`).
  - Production configuration: `backend/.env` (**NEVER overwrite or touch over FTP**).
  - Production vendor: `backend/vendor/`.

---

## 2. Inviolable Guardrails

1. **Credentials Gate**:
   - **NEVER** write or commit credential values (passwords, tokens, database secrets) into this runbook, scripts, commit messages, or chat reports.
   - **Credential Source**: FTP credentials must be obtained from session-provided environment variables (e.g., `os.environ.get("FTP_PASS")` or session secrets). If credentials are not present in the current session, **STOP and ask the user** — do not guess or attempt unauthorized access.
2. **Pre-Deploy Backup-First Rule**:
   - Before modifying any live file or running migrations, take a fresh backup of live configuration and modified components to a dated directory on Desktop outside the repository tree:
     ```bash
     ~/Desktop/HVACHome-backup-YYYYMMDD-<task-name>/
     ```
   - At minimum, back up live `.htaccess`, live `version.json`, and any PHP backend files being updated.
3. **The `.htaccess` Preservation & Merge Rule**:
   - **NEVER** overwrite the live `.htaccess` with a generic or Vite-generated single-page app rewrite fallback.
   - The production `.htaccess` contains critical Apache rules:
     - Header normalization passing `Authorization` to PHP FastCGI (`CGIPassAuth On`).
     - Directory and file guards blocking direct HTTP access to `.env`, `.git`, `.sql`, `backend/src/`, `backend/vendor/`.
     - API routing forwarding `/api/*` to `backend/public_api/index.php`.
     - Static PWA routing with cache control headers.
     - Fallback rewrite to `index.html`.
   - Always verify `.htaccess` against `deploy/root.htaccess` and preserve existing live rules.
4. **Append-Only Accounting**:
   - Never alter or delete existing audit rows (`correction`, `ticket_timeline`, or past `appliance_movement`).
5. **Ephemerality of Maintenance Scripts**:
   - Ad-hoc database checks or migration scripts uploaded to `backend/public_api/` must:
     - Use randomized filenames: `_maint_<hex>.php`.
     - Require a high-entropy secret token passed via query parameter (e.g. `?key=<uuid>`).
     - Be invoked once and immediately deleted via FTP.
     - Be confirmed removed (HTTP 404 / SPA redirect).

---

## 3. End-to-End Deployment Sequence

Follow these steps in exact chronological order:

### Step 1: Pre-Deploy Verification & Local Build
1. Verify working directory is clean and tests pass:
   ```bash
   git status
   php tests/verify_acceptance.php && php tests/verify_complexes_and_defaults.php && php tests/verify_weather_and_watch_diet.php && php tests/verify_past_wo_import.php && php tests/verify_sops.php && php tests/verify_phase1_api.php && php tests/verify_sqlite_schema.php && php tests/verify_blocked_wo.php && php tests/verify_cancel_undo.php && php tests/verify_blocked_phase2.php
   ```
2. Commit and push local changes to `origin main`:
   ```bash
   git push origin main
   ```
3. Build the production frontend distribution (this stamps the current commit hash into `dist/version.json`):
   ```bash
   npm run build
   ```
4. Verify `dist/version.json` matches `git rev-parse --short HEAD`.

### Step 2: Live Snapshot / Backup
Download the current live `.htaccess`, `version.json`, and relevant backend files to the desktop backup directory:
```python
import os, ftplib

HOST = "195.179.239.151"
PORT = 21
USER = "u500309322.mediumturquoise-gazelle-912925.hostingersite.com"
PASS = os.environ.get("FTP_PASS")

BACKUP_DIR = os.path.expanduser("~/Desktop/HVACHome-backup-YYYYMMDD-<task>")
os.makedirs(BACKUP_DIR, exist_ok=True)

ftp = ftplib.FTP()
ftp.connect(HOST, PORT, timeout=30)
ftp.login(USER, PASS)

for fname in [".htaccess", "version.json"]:
    with open(os.path.join(BACKUP_DIR, fname), "wb") as f:
        ftp.retrbinary(f"RETR {fname}", f.write)

# If updating backend files, backup target files as well:
# os.makedirs(os.path.join(BACKUP_DIR, "backend/src/Models"), exist_ok=True)
# with open(os.path.join(BACKUP_DIR, "backend/src/Models/Target.php"), "wb") as f:
#     ftp.retrbinary("RETR backend/src/Models/Target.php", f.write)

ftp.quit()
```

### Step 3: Stage Distribution & Clean Metadata
Prepare `dist/` for upload:
1. Copy `deploy/root.htaccess` to `dist/.htaccess`.
2. Remove any local dev artifacts or OS metadata:
   ```bash
   cp deploy/root.htaccess dist/.htaccess
   rm -f dist/index.php
   find dist -name ".DS_Store" -delete
   ```

### Step 4: FTP Upload
Deploy backend files first (if any), then recursively sync `dist/` to the FTP root:
```python
import os, ftplib

HOST = "195.179.239.151"
PORT = 21
USER = "u500309322.mediumturquoise-gazelle-912925.hostingersite.com"
PASS = os.environ.get("FTP_PASS")

ftp = ftplib.FTP()
ftp.connect(HOST, PORT, timeout=30)
ftp.login(USER, PASS)

# 1. Upload PHP backend changes (relative to FTP root -> backend/...)
# Example:
# with open("src/Models/Stockpile.php", "rb") as f:
#     ftp.storbinary("STOR backend/src/Models/Stockpile.php", f)

# 2. Upload dist/ bundle to FTP root
def ensure_remote_dir(ftp_conn, remote_dir):
    if not remote_dir or remote_dir == ".":
        return
    parts = remote_dir.strip("/").split("/")
    curr = ""
    for p in parts:
        curr = f"{curr}/{p}" if curr else p
        try:
            ftp_conn.mkd(curr)
        except ftplib.error_perm:
            pass

for root, dirs, files in os.walk("dist"):
    rel_dir = os.path.relpath(root, "dist")
    if rel_dir == ".":
        rel_dir = ""
    if rel_dir:
        ensure_remote_dir(ftp, rel_dir)
    for fname in files:
        if fname in (".DS_Store", "index.php"):
            continue
        local_path = os.path.join(root, fname)
        remote_path = f"{rel_dir}/{fname}" if rel_dir else fname
        with open(local_path, "rb") as f:
            ftp.storbinary(f"STOR {remote_path}", f)

ftp.quit()
```

### Step 5: Post-Deploy Verification
Verify the deployment immediately over HTTPS:
1. **Version Stamp Check**: Fetch `https://mediumturquoise-gazelle-912925.hostingersite.com/version.json` with `Cache-Control: no-cache`. Ensure:
   - `commitHash` matches the deployed git commit.
   - `entryBundle` matches the newly generated `assets/index-[hash].js`.
2. **API Health Check**: Fetch `https://mediumturquoise-gazelle-912925.hostingersite.com/api/health`. Ensure:
   - Status code is HTTP 200.
   - Payload returns `{"data":{"status":"ok","db":"ok"},"error":null}`.
3. **Bundle Reference Check**: Fetch `https://mediumturquoise-gazelle-912925.hostingersite.com/` and confirm the HTML imports the new `entryBundle` script.
4. **Database Counts Verification**: Query live database row counts via a transient maintenance runner and verify against baseline checkpoints.

---

## 4. What Constitutes a Failed Deploy?

A deployment is considered **FAILED** if any of the following occur:
- `version.json` does not reflect the expected commit hash or fails to load.
- `/api/health` does not return `status: ok` and `db: ok`.
- Live index HTML references an obsolete or missing script bundle hash.
- Unauthenticated access returns HTTP 500 instead of HTTP 401.
- Any database table count unexpectedly drifts from baseline counts.
- The `.htaccess` file is corrupted or wiped, causing `/api/*` routes to return 404 or raw PHP script contents.

If any failure occurs, restore the previous state immediately from the pre-deploy backup directory in `~/Desktop/` and report the incident.

---

## 5. Common Failures & Quick Fixes

| Symptom / Error | Root Cause | Immediate Fix |
| :--- | :--- | :--- |
| **Missing deploy script / script hunt** | Looking for non-existent standalone deploy scripts in repo. | Follow the standard Python `ftplib` workflow in this runbook. |
| **`FTP_HOST` unset in local `.env`** | Local `.env` is dev-only and intentionally lacks live FTP secrets. | Read credentials from session environment (`os.environ.get("FTP_PASS")`) or prompt user. |
| **FTP 550 No such file or directory** | Uploading with `/public_html/` prefix when FTP session already lands in `public_html`. | Use relative remote paths (e.g. `STOR .htaccess` or `STOR backend/src/...`). |
| **Backend changes not taking effect** | Uploading PHP file to `src/...` instead of `backend/src/...`. | Prefix backend paths with `backend/` (e.g. `STOR backend/src/Models/Stockpile.php`). |
| **API returns 404 / routes broken** | Overwrote root `.htaccess` with Vite build or generic SPA fallback. | Re-upload `deploy/root.htaccess` to FTP root as `.htaccess`. |
| **`Class 'App\Db' not found` in runner** | Runner script failed to autoload Composer vendor dependencies. | Include `require __DIR__ . '/../vendor/autoload.php';` and `\App\Config::load();`. |
| **Unauthenticated API call returns 401** | Attempting to probe protected API routes without Bearer token. | Use `/api/health` for unauthenticated ping, or use a key-gated maintenance runner for protected verification. |
| **PWA banner update loop on device** | Browser cached obsolete service worker or asset hashes. | Purge browser caches or check cache-busting headers in `.htaccess`. |

---

## 6. Hard Guard: `dist/.htaccess` Must NEVER Be Uploaded

- Vite copies `public/.htaccess` (the plain Slim rewrite) into `dist/.htaccess`.
- **Before uploading `dist/`**: ALWAYS delete `dist/.htaccess` (`rm -f dist/.htaccess`) or exclude `.htaccess` from the FTP upload.
- **After every frontend deploy**: Verify `/public_html/.htaccess` matches `deploy/root.htaccess` verbatim (and confirm `GET /` returns `HTTP 200 text/html`).
