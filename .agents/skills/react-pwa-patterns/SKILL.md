---
name: react-pwa-patterns
description: Frontend conventions for the HVACHome React 19 + Vite + TypeScript PWA — state routing, the data-context-to-API pattern, image pipeline rules, and gloves-on mobile UX. Load when writing or reviewing any frontend code.
---

# React PWA Patterns (HVACHome v2)

## Non-negotiables

- **No react-router.** The app uses the custom state router in `components/Router.tsx` (deliberate — zero-config deploy on Hostinger subfolders). New views = new `ViewType` + a case in the router. Do not install routing libraries.
- **Image pipeline rules** (from `utils/imageUtils.ts` — proven, do not regress):
  - Every upload flows through compression. No raw camera photos into state or uploads.
  - Cap: ~1600px, JPEG quality ~0.7. (v1 used 800px/0.6 for localStorage; v2 uploads to the API so we can afford more.)
  - Never store base64 images in localStorage — uploads go to the API; localStorage holds only the offline outbox.
- **60-second flows.** Any field action (log a status, intake a ticket) must be completable in under a minute, one-thumb, gloves on.
- **Touch targets ≥ 44px.** No hover-dependent UI. `pb-safe` on modals.

## Data layer

- `context/DataContext.tsx` keeps its triad shape: read-heavy inventory / write-heavy logs / stable action refs — but persistence goes through `src/api/client.ts` (typed fetch wrapper, token attach, offline detection), not localStorage.
- **Offline outbox:** mutations queue in IndexedDB when offline, sync on reconnect via `POST /api/sync`. Cap the outbox; surface "N unsynced changes" honestly. The 5MB wall moved here — respect it.
- Strict TypeScript: no `any`. Extend `types/domain.ts` — never inline ad-hoc shapes.

## Component hygiene

- View components stay under ~200 lines; extract sub-sections.
- Job cards: 2–3 visible rows, one-tap expand (validated pattern — keep it).
- Dark mode via `useTheme`; test every new view in both modes.
- Plain language anywhere a tenant could see it; trade terms stay behind the tech role.

## Deploy

- `npm run build` → upload `dist/` to Hostinger as static files. API base URL comes from env, never hardcoded.
