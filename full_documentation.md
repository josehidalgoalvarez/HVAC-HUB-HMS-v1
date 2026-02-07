
# PropTrack Application: Comprehensive System Documentation

**Version:** 1.0 (MVP)
**Date:** Current
**Target Audience:** AI Agents (Claude Code, Google Antigravity), Full Stack Developers.

---

## 1. Project Overview

**PropTrack** is a sophisticated, **local-first** Progressive Web Application (PWA) designed for property managers and homeowners to track HVAC systems, appliances, and maintenance logs. 

### **Core Tech Stack**
*   **Framework:** React 18+
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (Dark Mode enabled)
*   **Bundler:** Vite (assumed based on import maps/structure)
*   **Deployment Target:** Static Hosting (Hostinger/Apache/Nginx) - **No NodeJS Server**.

### **Key Constraints**
1.  **No Backend:** The app runs entirely in the browser.
2.  **Persistence:** Data is stored in `localStorage`.
3.  **Routing:** Custom State-Based Routing (No `react-router-dom` to ensure compatibility with subfolder static hosting without rewrite rules).
4.  **Mobile-First:** UI is optimized for touch targets, safe areas, and portrait orientation.

---

## 2. Architecture & Design Patterns

The application follows a **Service-Oriented Frontend Architecture**. Logic is strictly separated from UI.

### **A. Data Layer (The "Context Triad")**
Instead of a single monolithic state, data is split into three contexts to optimize React rendering performance:

1.  **`InventoryContext` (Read-Heavy)**
    *   **Contains:** `properties`, `appliances`.
    *   **Behavior:** Updates infrequently (user edits).
    *   **Source:** `localStorage` keys: `HVACHome_properties`, `HVACHome_appliances`.
    
2.  **`ActivityContext` (Write-Heavy)**
    *   **Contains:** `logs` (audit trail).
    *   **Behavior:** Updates frequently (every action triggers a log).
    *   **Source:** `localStorage` key: `HVACHome_logs`.

3.  **`ActionContext` (Stable References)**
    *   **Contains:** Methods (`addProperty`, `updateAppliance`, `importData`).
    *   **Behavior:** Stable function references. Components subscribing to this do not re-render when data changes.

### **B. Navigation (State-Based Routing)**
To guarantee deployment on any static host without server configuration:
*   **File:** `components/Router.tsx` acts as the dispatcher.
*   **State:** `App.tsx` holds `activeView` (enum `ViewType`).
*   **Persistence:** `sessionStorage` is used to restore the user's place after a browser refresh.
*   **Rule:** **DO NOT** introduce `react-router-dom` or `history.pushState` logic unless specifically migrating to a server-rendered architecture.

### **C. Infinite Canvas Engine**
*   **File:** `components/properties/PropertyCanvasView.tsx` & `hooks/useInfiniteCanvas.ts`.
*   **Logic:** Uses CSS Transforms (`translate`, `scale`) for performance.
*   **Coordinate System:** 0-100% relative positioning (`x`, `y` on `Appliance` object).
*   **Layers:** Separates Connection Lines (SVG) from Nodes (HTML Divs) for hit-testing accuracy.

---

## 3. Data Models (Source of Truth)

Refer to `types/domain.ts` for strict definitions.

### **Property**
```typescript
interface Property {
  id: string;          // UUID or timestamp string
  name: string;        // Display name
  address: string;     // Full address
  imageUrl: string;    // Base64 or External URL
  applianceCount: number; // Denormalized count for UI speed
  definedRooms: string[]; // List of rooms specific to this property
  // ... metrics (sqFt, yearBuilt)
}
```

### **Appliance**
```typescript
interface Appliance {
  id: string;
  propertyId: string;  // Foreign Key to Property
  position?: {         // Optional: Only if placed on Canvas
      x: number;       // 0-100 percentage
      y: number;       // 0-100 percentage
      floor: string;   // 'Basement', 'Garage', etc.
  };
  ratingPlateUrl?: string; // Base64 Compressed Image
  specs: Record<string, string>; // Flexible Key-Value for tech specs
  // ... details (brand, model, serial)
}
```

---

## 4. Critical Logic & Workflows

### **A. Image Handling (The "5MB Wall")**
*   **Constraint:** `localStorage` is limited to ~5MB per domain.
*   **Risk:** Uploading raw 4K photos from a phone will crash the app immediately.
*   **Solution:** `utils/imageUtils.ts`.
*   **Implementation:** All user uploads flow through `compressImage()`.
    *   Resizes to max 800px width.
    *   Compresses to JPEG (quality 0.6).
    *   Converts transparency to white background.
    *   **Target Size:** ~50KB - 100KB per image.

### **B. Session Persistence**
*   **File:** `App.tsx`.
*   **Logic:**
    1.  On Mount: Reads `sessionStorage.getItem('pt_activeView')`.
    2.  On Change: Writes to `sessionStorage`.
*   **Purpose:** Prevents "Amnesiac Refresh" where a user loses their place in the app upon reloading.

### **C. Data Import/Export**
*   **File:** `components/profile/ProfileView.tsx`.
*   **Format:** JSON.
*   **Logic:** Allows users to backup their `localStorage` to a file and restore it. This is the **only** backup mechanism in the MVP.

---

## 5. File Structure Map

```text
src/
├── components/
│   ├── appliances/      # Appliance-specific domain logic
│   │   ├── add/         # Creation flows
│   │   ├── common/      # Reusable forms (RatingPlateForm)
│   │   ├── detail/      # Detailed view & 3D visualization
│   │   └── list/        # Inventory listing
│   ├── layout/          # Layout wrappers (BottomNav)
│   ├── profile/         # User settings & Data Management
│   ├── properties/      # Property-specific domain logic
│   │   └── PropertyCanvasView.tsx # The interactive map
│   ├── service/         # Service scheduling modals
│   ├── ui/              # Generic UI atoms (Buttons, Modals)
│   └── Router.tsx       # Main Navigation Switch
├── context/
│   └── DataContext.tsx  # The State Management Core
├── hooks/
│   ├── useData.ts       # Facade for Contexts
│   ├── useInfiniteCanvas.ts # Math for Pan/Zoom
│   └── useTheme.ts      # Dark mode logic
├── types/               # TypeScript Definitions
└── utils/               # Helpers (Compression, Geometry, Assets)
```

---

## 6. Developer & Agent Guidelines

**For AI Agents (Claude, Gemini, ChatGPT) modifying this codebase:**

1.  **Respect the Storage Limit:** NEVER remove the image compression logic in `RatingPlateForm` or `ApplianceHero`. If adding new image features, enforce compression.
2.  **No Routing Libraries:** Do not install `react-router-dom`, `wouter`, or `tanstack-router`. Maintain the custom state-router in `Router.tsx`.
3.  **Mobile First:** Ensure all modals have `pb-safe` (padding-bottom safe area) and touch targets are at least 44px.
4.  **Strict Typing:** Do not use `any`. Use the interfaces in `types/`.
5.  **Component Hygiene:** If a component exceeds 200 lines, split it. Keep the "View" components (e.g., `PropertyDetailView`) focused on layout, and extract complex sub-sections (e.g., `ApplianceHero`).

## 7. Known Limitations

1.  **Storage:** The app holds about 50-100 compressed images before `localStorage` fills up.
2.  **Concurrency:** There is no merge conflict resolution. The last write wins.
3.  **Security:** There is no real authentication. The "Admin" mode in `ProfileView` is purely client-side UI toggling.

## 8. Deployment

To deploy updates to Hostinger:
1.  Build: `npm run build`
2.  Upload contents of `dist/` to `public_html`.
3.  Ensure `manifest.json` is present for PWA functionality.
