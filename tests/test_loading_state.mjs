import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const kitPath = path.resolve('components/common/LoadingState.tsx');
const ticketListPath = path.resolve('components/tickets/TicketListView.tsx');

const BASE_SHELL = 'flex flex-col items-center justify-center';

let passes = 0;
let failures = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passes++;
  } catch (err) {
    console.log(`  [FAIL] ${name}: ${err.message}`);
    failures++;
  }
}

console.log('--- LoadingState Extraction Tests ---');

check('1. components/common/LoadingState.tsx exists and exports LoadingState', () => {
  assert.ok(fs.existsSync(kitPath), 'components/common/LoadingState.tsx does not exist');
  const src = fs.readFileSync(kitPath, 'utf8');
  assert.ok(/export\s+const\s+LoadingState\b/.test(src), 'LoadingState.tsx must export LoadingState');
});

check('2. LoadingState.tsx contains shared shell and renders icon span (animate-spin) and message <p>', () => {
  assert.ok(fs.existsSync(kitPath), 'components/common/LoadingState.tsx does not exist');
  const src = fs.readFileSync(kitPath, 'utf8');
  assert.ok(src.includes(BASE_SHELL), 'LoadingState.tsx missing BASE_SHELL');
  assert.ok(src.includes('material-symbols-outlined') && src.includes('animate-spin'), 'LoadingState.tsx missing animate-spin icon span');
  assert.ok(/<p\b[^>]*>\{message\}<\/p>/.test(src), 'LoadingState.tsx must render {message} inside <p>');
});

check('3. TicketListView.tsx imports LoadingState from ../common/LoadingState', () => {
  const src = fs.readFileSync(ticketListPath, 'utf8');
  assert.ok(
    /import\s*\{[^}]*\bLoadingState\b[^}]*\}\s*from\s*['"]\.\.\/common\/LoadingState['"]/.test(src),
    'TicketListView.tsx does not import LoadingState from ../common/LoadingState'
  );
});

check('4. TicketListView.tsx renders 1 <LoadingState with zero inline loading shell', () => {
  const src = fs.readFileSync(ticketListPath, 'utf8');
  const loadingStates = src.match(/<LoadingState\b/g) || [];
  const inlineShells = src.match(/flex flex-col items-center justify-center py-16 gap-3 text-gray-500/g) || [];
  assert.equal(loadingStates.length, 1, `Expected 1 <LoadingState in TicketListView.tsx, found ${loadingStates.length}`);
  assert.equal(inlineShells.length, 0, `Expected 0 inline loading shells in TicketListView.tsx, found ${inlineShells.length}`);
});

check('5. TicketListView.tsx preserves message="Loading tickets..." and tone="muted" on <LoadingState>', () => {
  const src = fs.readFileSync(ticketListPath, 'utf8');
  const blockMatch = src.match(/<LoadingState[\s\S]*?\/>/);
  assert.ok(blockMatch, 'Missing <LoadingState ... /> block in TicketListView.tsx');
  const block = blockMatch[0];
  assert.ok(block.includes('message="Loading tickets..."'), 'Missing message="Loading tickets..."');
  assert.ok(block.includes('tone="muted"'), 'Missing tone="muted"');
});

check('6. GUARD: TicketListView.tsx keeps its empty state as <EmptyState', () => {
  const src = fs.readFileSync(ticketListPath, 'utf8');
  const emptyStates = src.match(/<EmptyState\b/g) || [];
  assert.equal(emptyStates.length, 1, `Expected 1 <EmptyState in TicketListView.tsx, found ${emptyStates.length}`);
  assert.ok(src.includes('No active tickets'), 'TicketListView.tsx empty state missing');
});

console.log(`\nLoadingState Tests: ${passes} Passed, ${failures} Failed`);
process.exit(failures > 0 ? 1 : 0);
