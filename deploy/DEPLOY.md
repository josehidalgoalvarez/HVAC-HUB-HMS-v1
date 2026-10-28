# HVACHome Production Deployment Discipline

This document details the deployment architecture, directory mapping, and strict operational guidelines for deploying HVACHome to the Hostinger live production environment.

---

## 1. Environment Architecture & FTP Root

- **Server Architecture**: Shared Linux / Apache / LiteSpeed hosting running PHP 8.x with remote MySQL database.
- **FTP Root (`/`)**: Logging into FTP lands **directly** in `public_html/`.
  - When uploading root files (`index.html`, `sw.js`, `manifest.webmanifest`, `.htaccess`, `assets/`), upload directly to the FTP root `/`.
  - Do NOT upload into a nested `public_html/public_html/` folder.
- **Backend Directory**: Code lives under `public_html/backend/`.
  - Production front controller: `public_html/backend/public_api/index.php`.
  - Production router & models: `public_html/backend/src/`.
  - Dependencies: `public_html/backend/vendor/`.
  - Server configuration: `public_html/backend/.env`.

---

## 2. Inviolable Deploy Rules (Must Follow Every Time)

1. **NEVER overwrite or upload `backend/.env`**:
   - The production database credentials and `APP_ENV=production` configuration live solely on the server in `public_html/backend/.env`.
   - The repository `.env.example` must NEVER be copied or uploaded over `backend/.env`.
2. **NEVER overwrite root `.htaccess` with a plain SPA fallback**:
   - The root `.htaccess` handles four vital functions:
     1. Sensitive file protection (`.env`, `.git`, `.sql`, `.sqlite`).
     2. Blocking direct access to backend source directories (`backend/src`, `backend/vendor`, etc.).
     3. Forwarding `/api/*` requests to `backend/public_api/index.php`.
     4. Passing the `Authorization` header to PHP in FastCGI environments.
     5. React SPA fallback to `index.html`.
   - Never replace root `.htaccess` with Vite's simple rewrite. Always use [deploy/root.htaccess](file:///Users/josehidalgo/Desktop/Downloads%20Backup/Active-Projects/Web-Development-Apps/HVACHome/deploy/root.htaccess).
3. **NEVER overwrite `backend/public_api/index.php` from repo `public/index.php`**:
   - `public/index.php` is the local development controller (used with `php -S 127.0.0.1:8000 -t public`).
   - The production controller lives at `deploy/public_api_index.php` and deploys to `public_html/backend/public_api/index.php`.
4. **Always take a fresh FTP snapshot before applying live changes**:
   - Download `public_html/backend/` and `public_html/.htaccess` to a new dated local backup directory before modifying live files or applying database migrations.
5. **Temporary Migration & Audit Runners**:
   - Must be key-gated with a secure random token and use a randomized file name (e.g. `_maint_<hex>.php`).
   - Must be invoked once, deleted over FTP immediately after execution, and verified to return `404 Not Found`.

---

## 3. Frontend Build & Deploy Workflow

1. Build production bundle with API enabled:
   ```bash
   VITE_USE_API=true npm run build
   ```
2. Clean OS metadata from dist:
   ```bash
   find dist -name ".DS_Store" -delete && rm -f dist/index.php
   ```
3. Upload contents of `dist/` directly to FTP root (`public_html/`).
4. Ensure `public_html/.htaccess` contains the full rules from `deploy/root.htaccess`.
5. Post-deploy validation:
   - Check `GET /` serves the new `index-[hash].js` bundle.
   - Check `GET /sw.js` returns 200.
   - Check `GET /manifest.webmanifest` returns 200.
   - Check `GET /api/health` returns `{"data":{"status":"ok","db":"ok"}}`.
   - Check `POST /api/admin/seed-demo` returns `401 Unauthorized`.
