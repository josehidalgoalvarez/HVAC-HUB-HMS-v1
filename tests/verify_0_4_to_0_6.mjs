import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { ApiClient, AuthError, ApiError } from '../src/api/client.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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

// Minimal mock environment
global.window = {
  sessionStorage: {
    store: {},
    getItem(k) { return this.store[k] ?? null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  }
};

async function main() {
  console.log("=== Running Verification Tests for Phase 0 (0.4–0.6) ===\n");

  // 1. Task 0.4 API Client Verification
  console.log("--- 0.4 API Client Verification ---");
  assertTest(fs.existsSync(path.join(rootDir, 'src/api/client.ts')), "0.4.1 src/api/client.ts exists");

  const phpServer = spawn('php', ['-S', '127.0.0.1:8898', '-t', 'public'], { cwd: rootDir });
  await new Promise(r => setTimeout(r, 400));

  try {
    const client = new ApiClient('http://127.0.0.1:8898');
    
    // health check
    const health = await client.health();
    assertTest(health?.status === 'ok', "0.4.2 client.health() returns { status: 'ok' }");

    // 401 throws AuthError
    let threwAuth = false;
    try {
      await client.get('/api/protected');
    } catch (err) {
      if (err instanceof AuthError && err.status === 401 && err.code === 'unauthorized') {
        threwAuth = true;
      }
    }
    assertTest(threwAuth, "0.4.3 Protected route without token throws typed AuthError (401)");

    // Token attachment
    client.setToken('test-tech-token');
    const authData = await client.get('/api/protected');
    assertTest(authData?.user?.role === 'tech', "0.4.4 Attached Bearer token authenticates successfully");

    // isOnline
    const online = await client.isOnline();
    assertTest(online === true, "0.4.5 client.isOnline() returns true with healthy API");
  } finally {
    phpServer.kill();
  }

  // 2. Task 0.5 DataContext Rewire Verification
  console.log("\n--- 0.5 DataContext Rewire Verification ---");
  const dataContextContent = fs.readFileSync(path.join(rootDir, 'context/DataContext.tsx'), 'utf-8');
  assertTest(dataContextContent.includes('VITE_USE_API'), "0.5.1 DataContext references VITE_USE_API feature flag");
  assertTest(dataContextContent.includes('apiClient'), "0.5.2 DataContext imports and connects to apiClient");
  assertTest(dataContextContent.includes('localStorage.getItem'), "0.5.3 DataContext retains localStorage fallback when flag is off");
  assertTest(dataContextContent.includes('InventoryContext') && dataContextContent.includes('ActivityContext') && dataContextContent.includes('ActionContext'), "0.5.4 DataContext preserves triad architecture");

  // 3. Task 0.6 Domain Types + Router Views Verification
  console.log("\n--- 0.6 Domain Types + Router Views Verification ---");
  const domainTypesContent = fs.readFileSync(path.join(rootDir, 'types/domain.ts'), 'utf-8');
  const uiTypesContent = fs.readFileSync(path.join(rootDir, 'types/ui.ts'), 'utf-8');
  const routerContent = fs.readFileSync(path.join(rootDir, 'components/Router.tsx'), 'utf-8');

  // Check types in types/domain.ts
  assertTest(domainTypesContent.includes('export interface Building'), "0.6.1 Building interface defined");
  assertTest(domainTypesContent.includes('export interface Unit'), "0.6.2 Unit interface defined");
  assertTest(domainTypesContent.includes('export interface Ticket'), "0.6.3 Ticket interface defined");
  assertTest(domainTypesContent.includes('wo_number: string | null'), "0.6.4 Ticket.wo_number is nullable");
  assertTest(domainTypesContent.includes('parent_ticket_id: string | null'), "0.6.5 Ticket.parent_ticket_id is nullable");
  assertTest(domainTypesContent.includes('verified_scope'), "0.6.6 Ticket.verified_scope defined");
  assertTest(domainTypesContent.includes('last_seen_in_yardi'), "0.6.7 Ticket.last_seen_in_yardi defined");
  assertTest(domainTypesContent.includes('export interface RunSheet'), "0.6.8 RunSheet interface defined");
  assertTest(domainTypesContent.includes('export interface Notice'), "0.6.9 Notice interface defined");
  assertTest(domainTypesContent.includes('drafted') && domainTypesContent.includes('served') && domainTypesContent.includes('verified'), "0.6.10 Notice statuses drafted/sent/served/verified defined");
  assertTest(domainTypesContent.includes('export interface Watch'), "0.6.11 Watch interface defined");
  assertTest(domainTypesContent.includes('export interface Stockpile'), "0.6.12 Stockpile interface defined");
  assertTest(domainTypesContent.includes('export interface Part'), "0.6.13 Part interface defined");
  assertTest(domainTypesContent.includes('export interface Correction'), "0.6.14 Correction interface defined");

  // Check ViewType in types/ui.ts
  const expectedViewTypes = ['TICKETS', 'RUN_SHEET', 'QUICK_LOG', 'PARTS', 'NOTICES', 'WATCHES'];
  let allViewTypesPresent = true;
  for (const vt of expectedViewTypes) {
    if (!uiTypesContent.includes(vt)) {
      allViewTypesPresent = false;
      console.log(`Missing ViewType: ${vt}`);
    }
  }
  assertTest(allViewTypesPresent, "0.6.15 ViewType enum includes tickets, run sheet, quick-log, parts, notices, watches");

  // Check Router cases
  for (const vt of expectedViewTypes) {
    assertTest(routerContent.includes(`ViewType.${vt}`), `0.6.16 Router has case for ViewType.${vt}`);
  }

  // Check every new type is referenced by at least one router case
  const requiredTypesInRouter = [
    'Building',
    'Unit',
    'Ticket',
    'RunSheet',
    'Notice',
    'Watch',
    'Stockpile',
    'Part',
    'Correction'
  ];
  let allTypesReferencedInRouter = true;
  for (const t of requiredTypesInRouter) {
    // Regex checking type annotation e.g. `: Ticket` or type reference
    const regex = new RegExp(`:\\s*${t}\\b`);
    const isReferenced = regex.test(routerContent);
    if (!isReferenced) {
      allTypesReferencedInRouter = false;
      console.log(`Type ${t} not referenced with type annotation in Router.tsx`);
    }
  }
  assertTest(allTypesReferencedInRouter, "0.6.17 Every new domain type is explicitly referenced in Router cases");

  console.log("\n=========================================");
  console.log(`Total Passes: ${passes.length}`);
  console.log(`Total Failures: ${failures.length}`);

  if (failures.length > 0) {
    process.exit(1);
  }
  console.log("ALL TESTS PASSED!\n");
}

main().catch(err => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
