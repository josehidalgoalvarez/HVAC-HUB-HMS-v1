import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { ApiClient, AuthError } from '../src/api/client.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Simulated Browser Storage
const sessionStorageStore = {};
const localStorageStore = {};

global.window = {
  sessionStorage: {
    getItem(k) { return sessionStorageStore[k] ?? null; },
    setItem(k, v) { sessionStorageStore[k] = String(v); },
    removeItem(k) { delete sessionStorageStore[k]; }
  },
  localStorage: {
    getItem(k) { return localStorageStore[k] ?? null; },
    setItem(k, v) { localStorageStore[k] = String(v); },
    removeItem(k) { delete localStorageStore[k]; }
  }
};

const passes = [];
const failures = [];

function assertTest(condition, desc) {
  if (condition) {
    passes.push(desc);
    console.log(`[PASS] ${desc}`);
  } else {
    failures.push(desc);
    console.log(`[FAIL] ${desc}`);
  }
}

async function runDeployGate() {
  console.log("=== PHASE 0 GATE: Deploy & Round-Trip Verification ===\n");

  // 1. Verify Production Build (dist/ folder)
  console.log("--- 1. Production Bundle Verification ---");
  const distHtml = path.join(rootDir, 'dist/index.html');
  assertTest(fs.existsSync(distHtml), "1.1 dist/index.html exists from npm run build");
  const htmlContent = fs.readFileSync(distHtml, 'utf-8');
  assertTest(!htmlContent.includes('@google/genai'), "1.2 dist/index.html is completely free of @google/genai");

  // 2. Start PHP Backend Server on port 8895
  console.log("\n--- 2. Starting Slim 4 API Backend on 127.0.0.1:8895 ---");
  const phpServer = spawn('php', ['-S', '127.0.0.1:8895', '-t', 'public'], { cwd: rootDir });
  await new Promise(r => setTimeout(r, 400));

  try {
    const client = new ApiClient('http://127.0.0.1:8895');

    // Health check
    const health = await client.health();
    assertTest(health?.status === 'ok', "2.1 API is alive: /api/health returned { status: 'ok' }");

    // 3. Login against real API
    console.log("\n--- 3. Authentication & Session Persistence ---");
    // Dev bootstrap login needs DEV_BOOTSTRAP_PASSWORD in the environment (passed through to the spawned API).
    const loginResult = await client.login('tech@hvachome.local', process.env.DEV_BOOTSTRAP_PASSWORD ?? '');
    assertTest(loginResult?.token === 'test-tech-token', "3.1 Real API login succeeded with Bearer token");
    assertTest(loginResult?.user?.role === 'tech', "3.2 User role verified as 'tech'");

    // Session Persistence test: simulate page reload by creating a fresh ApiClient instance
    const reloadedClient = new ApiClient('http://127.0.0.1:8895');
    const persistedToken = reloadedClient.getToken();
    assertTest(persistedToken === 'test-tech-token', "3.3 Token persists across session refresh");

    // 4. Real round-trip: GET /api/tickets
    console.log("\n--- 4. Real Round-Trip: GET /api/tickets ---");
    const tickets = await reloadedClient.getTickets();
    assertTest(Array.isArray(tickets), "4.1 GET /api/tickets round-trip returned JSON data array");
    console.log(`[+] Tickets count: ${tickets.length}`);

    // Verify unauthorized access fails without token
    const unauthedClient = new ApiClient('http://127.0.0.1:8895');
    unauthedClient.clearToken();
    let threw401 = false;
    try {
      await unauthedClient.getTickets();
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        threw401 = true;
      }
    }
    assertTest(threw401, "4.2 GET /api/tickets correctly rejects unauthenticated requests (HTTP 401)");

    // 5. Photo Upload & Render Back Test
    console.log("\n--- 5. Photo Upload & Render Back Test ---");
    // Synthetic JPEG header + image payload
    const syntheticJpegBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
      0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
      0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
      0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
      0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x10,
      0x00, 0x10, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
      0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
      0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F,
      0x00, 0x7F, 0xFF, 0xD9
    ]);

    const blob = new Blob([syntheticJpegBuffer], { type: 'image/jpeg' });
    const uploadRes = await reloadedClient.uploadPhoto(blob, {
      entityType: 'appliance',
      entityId: '42',
      caption: 'Gate verification photo'
    });

    assertTest(Boolean(uploadRes?.url), "5.1 Photo uploaded successfully through ApiClient");
    console.log(`[+] Uploaded photo served at: ${uploadRes.url}`);

    // Fetch uploaded photo over HTTP to verify it renders back
    const photoFetch = await fetch(uploadRes.url.startsWith('http') ? uploadRes.url : `http://127.0.0.1:8895${uploadRes.url}`);
    assertTest(photoFetch.status === 200, "5.2 Uploaded photo fetched back via HTTP 200");
    assertTest(photoFetch.headers.get('content-type')?.includes('image/'), "5.3 Response Content-Type is valid image/*");

    // 6. Verify localStorage contains zero base64 image strings
    console.log("\n--- 6. LocalStorage Base64 Wall Verification ---");
    let hasBase64InLocalStorage = false;
    for (const [key, val] of Object.entries(localStorageStore)) {
      if (typeof val === 'string' && val.includes('data:image/')) {
        hasBase64InLocalStorage = true;
        console.log(`Found base64 in localStorage key: ${key}`);
      }
    }
    assertTest(!hasBase64InLocalStorage, "6.1 localStorage contains zero base64 image data");

    console.log("\n=========================================");
    console.log(`Deploy Gate Results: ${passes.length} Passed, ${failures.length} Failed`);

    if (failures.length > 0) {
      process.exit(1);
    }
    console.log("PHASE 0 GATE COMPLETED SUCCESSFULLY: ALL CRITERIA GREEN!\n");
  } finally {
    phpServer.kill();
  }
}

runDeployGate().catch(err => {
  console.error("Deploy gate failed:", err);
  process.exit(1);
});
