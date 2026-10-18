
# Hostinger Deployment Guide for PropTrack (Mobile Web App)

**Context:** Local-First, React-based Single Page Application (SPA).

## 1. Build Process

Since you are running this in a web-IDE or locally, you must first build the application into static files (HTML/CSS/JS).

1.  **Command:** Run `npm run build` in your terminal.
2.  **Output:** This creates a `dist/` or `build/` folder containing:
    *   `index.html`
    *   `assets/` (bundled JS and CSS)

## 2. Hostinger File Manager Strategy (Simplest)

Since we optimized the router in Phase 3 to be a "State-Based Router" (using `activeView` state instead of URL paths like `/appliance/123`), this app is **completely static compatible**. You do not need confusing `.htaccess` rewrite rules.

1.  **Login** to Hostinger hPanel.
2.  Go to **File Manager** (public_html).
3.  **Delete** the default `default.php` if present.
4.  **Upload** the contents of your `dist/` folder directly to `public_html`.
    *   *Ensure `index.html` is at the root of public_html, not inside a subfolder.*

## 3. Optimization for Mobile (The PWA Touch)

To make it feel like a real phone app:

1.  **Manifest File:** Ensure `manifest.json` is in your `public/` folder and linked in `index.html`.
    ```json
    {
      "short_name": "PropTrack",
      "name": "PropTrack Manager",
      "start_url": ".",
      "display": "standalone",
      "theme_color": "#0077b6",
      "background_color": "#F8F9F3"
    }
    ```
    *Why?* This removes the browser address bar when users "Add to Home Screen".

2.  **Meta Tags:** Ensure `index.html` has:
    ```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="apple-mobile-web-app-capable" content="yes">
    ```
    *Why?* Prevents accidental zooming on input fields and hides iOS safari bars.

## 4. Handling Storage Limits

We implemented **Image Compression** in Phase 8.
*   **Current Limit:** ~5MB (localStorage limit).
*   **Capacity:** With our compression (~80KB/img), users can store ~50 photos before hitting limits.
*   **Reset:** If a user clears their browser cache/cookies, **data will be lost**.

**Recommendation for "Real" Production:**
If you need persistent storage across devices or after cache clear, you cannot rely on Hostinger's static hosting alone. You would need a backend.
*   *Option A (Free):* Use **Firebase** (Google) for the database. It works with static React apps perfectly.
*   *Option B (Hostinger):* Create a simple **PHP API** to save the JSON string to a MySQL database on your Hostinger plan.

## 5. Troubleshooting Common Hostinger Issues

*   **White Screen:** Check the "Console" tab in Developer Tools. 99% of the time, it's a wrong path in `index.html` (e.g., `<script src="/assets/..."` vs `<script src="./assets/..."`).
*   **Changes Not Showing:** Hostinger caches heavily. Toggle "Development Mode" in the Hostinger Dashboard or add `?v=2` to your URL to force refresh.
