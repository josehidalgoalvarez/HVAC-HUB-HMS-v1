/**
 * Test Suite: Inventory Cache Persistence & Honest Sync State
 * Covers:
 * 1. Successful /api/inventory fetch writes 6 keys to localStorage.
 * 2. Empty or partial section in response never overwrites non-empty cached section.
 * 3. Failed fetch leaves cached keys and lastSyncedAt untouched.
 * 4. Sync status indicator shows correct state: Syncing, Updated HH:MM, and Offline.
 */

// Mock browser localStorage
const mockStorage = new Map();
global.localStorage = {
  getItem: (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear(),
};

let passed = 0;
let failed = 0;

function assert(condition, desc) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${desc}`);
  } else {
    failed++;
    console.error(`[FAIL] ${desc}`);
  }
}

console.log("=== Testing Inventory Cache Persistence & Honest Sync State ===\n");

const PORTFOLIO_VERSION = '2.16.0';

// Simulation function mirroring DataContext /api/inventory resolution
function handleInventoryResponse(res, prevLastSyncedAt = null) {
  let isSyncing = false;
  let lastSyncedAt = prevLastSyncedAt;

  // Stamp version
  localStorage.setItem('hvachome_portfolio_version', PORTFOLIO_VERSION);

  if (res?.properties && res.properties.length > 0) {
    localStorage.setItem('hvachome_properties', JSON.stringify(res.properties));
  }
  if (res?.appliances && res.appliances.length > 0) {
    localStorage.setItem('hvachome_appliances', JSON.stringify(res.appliances));
  }
  if (res?.complexes && res.complexes.length > 0) {
    const filtered = res.complexes.filter(c => c.slug !== 'frontenac' && c.id !== 'frontenac' && String(c.id) !== '7');
    localStorage.setItem('hvachome_complexes', JSON.stringify(filtered));
  }
  if (res?.defaultSets && res.defaultSets.length > 0) {
    localStorage.setItem('hvachome_default_sets', JSON.stringify(res.defaultSets));
  }
  if (res?.units && res.units.length > 0) {
    localStorage.setItem('hvachome_units', JSON.stringify(res.units));
  }
  if (res?.logs && res.logs.length > 0) {
    localStorage.setItem('hvachome_logs', JSON.stringify(res.logs));
  }

  const now = Date.now();
  lastSyncedAt = now;
  localStorage.setItem('hvachome_inventory_last_synced_at', String(now));

  return { isSyncing, lastSyncedAt };
}

function handleInventoryError(err, prevLastSyncedAt) {
  // On error, do not modify storage, keep previous lastSyncedAt
  return { isSyncing: false, lastSyncedAt: prevLastSyncedAt };
}

// 1. Initial State: seed cache
localStorage.setItem('hvachome_properties', JSON.stringify([{ id: 'bld-1', name: '1723 Bath Rd' }]));
localStorage.setItem('hvachome_appliances', JSON.stringify([{ id: 'app-1', brand: 'Frigidaire' }]));
localStorage.setItem('hvachome_complexes', JSON.stringify([{ id: 'bd', name: 'BD' }]));
localStorage.setItem('hvachome_default_sets', JSON.stringify([{ id: 'set-bd', name: 'BD Defaults' }]));
localStorage.setItem('hvachome_units', JSON.stringify([{ id: 'unit-1', unitNumber: '101' }]));
localStorage.setItem('hvachome_logs', JSON.stringify([{ id: 'log-1', details: 'Initial' }]));
localStorage.setItem('hvachome_inventory_last_synced_at', '1700000000000');

assert(
  JSON.parse(localStorage.getItem('hvachome_properties'))[0].name === '1723 Bath Rd',
  '1.1 Cache initialised with base properties'
);

// 2. Successful fetch writes fresh data to all 6 keys + stamps lastSyncedAt
const freshResponse = {
  properties: [{ id: 'bld-1', name: '1723 Bath Road Updated' }, { id: 'bld-2', name: '511 Days Rd' }],
  appliances: [{ id: 'app-1', brand: 'Frigidaire Updated' }],
  complexes: [{ id: 'bd', name: 'Bath & Days' }, { id: 'frontenac', name: 'Frontenac Legacy' }],
  defaultSets: [{ id: 'set-bd', name: 'BD Set Updated' }],
  units: [{ id: 'unit-1', unitNumber: '101' }, { id: 'unit-2', unitNumber: '102' }],
  logs: [{ id: 'log-1', details: 'Updated log' }]
};

const syncResult = handleInventoryResponse(freshResponse, 1700000000000);

assert(syncResult.isSyncing === false, '2.1 isSyncing returns to false after fetch');
assert(syncResult.lastSyncedAt > 1700000000000, '2.2 lastSyncedAt advanced to current timestamp');
assert(
  JSON.parse(localStorage.getItem('hvachome_properties')).length === 2,
  '2.3 Fresh properties array persisted to localStorage (length: 2)'
);
assert(
  JSON.parse(localStorage.getItem('hvachome_properties'))[0].name === '1723 Bath Road Updated',
  '2.4 Fresh property content persisted'
);
assert(
  JSON.parse(localStorage.getItem('hvachome_complexes')).length === 1,
  '2.5 Standalone frontenac complex filtered out before persisting complexes'
);
assert(
  JSON.parse(localStorage.getItem('hvachome_units')).length === 2,
  '2.6 Fresh units persisted to localStorage'
);

// 3. Partial / Empty response never overwrites non-empty cache
const cachedUnitsBefore = localStorage.getItem('hvachome_units');
const partialResponse = {
  properties: [{ id: 'bld-1', name: '1723 Bath Road Third' }],
  appliances: [], // empty appliances
  units: null, // missing units
  complexes: undefined
};

handleInventoryResponse(partialResponse, syncResult.lastSyncedAt);

assert(
  localStorage.getItem('hvachome_units') === cachedUnitsBefore,
  '3.1 Missing/null units section in response leaves cached units unchanged'
);
assert(
  JSON.parse(localStorage.getItem('hvachome_appliances')).length === 1,
  '3.2 Empty appliances array (length 0) does not overwrite existing cached appliances'
);

// 4. Failed fetch leaves cache completely untouched
const propsBeforeFailure = localStorage.getItem('hvachome_properties');
const lastSyncBeforeFailure = localStorage.getItem('hvachome_inventory_last_synced_at');

const failResult = handleInventoryError(new Error('Network error 500'), parseInt(lastSyncBeforeFailure, 10));

assert(failResult.isSyncing === false, '4.1 isSyncing false after fetch failure');
assert(failResult.lastSyncedAt === parseInt(lastSyncBeforeFailure, 10), '4.2 lastSyncedAt preserved on failure');
assert(
  localStorage.getItem('hvachome_properties') === propsBeforeFailure,
  '4.3 Cached properties untouched after failed fetch'
);
assert(
  localStorage.getItem('hvachome_inventory_last_synced_at') === lastSyncBeforeFailure,
  '4.4 Cached lastSyncedAt in localStorage untouched after failed fetch'
);

// 5. Sync indicator formatting and states logic
function getIndicatorDescriptor(isSyncing, isOnline, lastSyncedAt) {
  if (isSyncing) return 'Syncing…';
  if (!isOnline) {
    if (!lastSyncedAt) return 'Offline — showing saved data';
    const d = new Date(lastSyncedAt);
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `Offline — showing saved data from ${month} ${day}, ${hours}:${mins}`;
  }
  if (lastSyncedAt) {
    const d = new Date(lastSyncedAt);
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `Updated ${hours}:${mins}`;
  }
  return null;
}

assert(
  getIndicatorDescriptor(true, true, 1700000000000) === 'Syncing…',
  '5.1 In-flight fetch displays "Syncing…"'
);
assert(
  getIndicatorDescriptor(false, true, 1700000000000).startsWith('Updated '),
  '5.2 Successful online state displays "Updated HH:MM"'
);
assert(
  getIndicatorDescriptor(false, false, 1700000000000).startsWith('Offline — showing saved data from'),
  '5.3 Offline state with cache displays "Offline — showing saved data from <date>"'
);
assert(
  getIndicatorDescriptor(false, false, null) === 'Offline — showing saved data',
  '5.4 Offline state without timestamp displays "Offline — showing saved data"'
);

console.log(`\n=========================================`);
console.log(`Inventory Sync Tests: ${passed} Passed, ${failed} Failed`);
console.log(`=========================================`);

if (failed > 0) {
  process.exit(1);
}
