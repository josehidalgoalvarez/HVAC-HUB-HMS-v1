import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const kitPath = path.resolve('components/common/EmptyState.tsx');
const shoppingListPath = path.resolve('components/parts/ShoppingListSection.tsx');

const CANONICAL_SHELL =
  'text-center py-12 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800';

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

console.log('--- EmptyState Extraction Tests ---');

check('1. components/common/EmptyState.tsx exists and exports EmptyState', () => {
  assert.ok(fs.existsSync(kitPath), 'components/common/EmptyState.tsx does not exist');
  const src = fs.readFileSync(kitPath, 'utf8');
  assert.ok(/export\s+const\s+EmptyState\b/.test(src), 'EmptyState.tsx must export EmptyState');
});

check('2. EmptyState.tsx contains shared canonical shell and renders icon span, title, and optional subtitle', () => {
  assert.ok(fs.existsSync(kitPath), 'components/common/EmptyState.tsx does not exist');
  const src = fs.readFileSync(kitPath, 'utf8');
  assert.ok(src.includes(CANONICAL_SHELL), 'EmptyState.tsx missing canonical shell string');
  assert.ok(src.includes('material-symbols-outlined'), 'EmptyState.tsx missing icon span');
  assert.ok(/\{title\}/.test(src), 'EmptyState.tsx must render title');
  assert.ok(/subtitle\s*\?/.test(src) || /subtitle\s*&&/.test(src), 'EmptyState.tsx must render optional subtitle');
});

check('3. ShoppingListSection.tsx imports EmptyState from ../common/EmptyState', () => {
  const src = fs.readFileSync(shoppingListPath, 'utf8');
  assert.ok(
    /import\s*\{[^}]*\bEmptyState\b[^}]*\}\s*from\s*['"]\.\.\/common\/EmptyState['"]/.test(src),
    'ShoppingListSection.tsx does not import EmptyState from ../common/EmptyState'
  );
});

check('4. ShoppingListSection.tsx renders 1 <EmptyState with zero inline canonical shell', () => {
  const src = fs.readFileSync(shoppingListPath, 'utf8');
  const emptyStates = src.match(/<EmptyState\b/g) || [];
  const inlineShells = src.match(new RegExp(CANONICAL_SHELL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || [];
  assert.equal(emptyStates.length, 1, `Expected 1 <EmptyState in ShoppingListSection.tsx, found ${emptyStates.length}`);
  assert.equal(inlineShells.length, 0, `Expected 0 inline canonical shells in ShoppingListSection.tsx, found ${inlineShells.length}`);
});

check('5. ShoppingListSection.tsx preserves icon, title, and subtitle on <EmptyState>', () => {
  const src = fs.readFileSync(shoppingListPath, 'utf8');
  const blockMatch = src.match(/<EmptyState[\s\S]*?\/>/);
  assert.ok(blockMatch, 'Expected <EmptyState ... /> block in ShoppingListSection.tsx');
  assert.ok(blockMatch[0].includes('icon="production_quantity_limits"'), 'Missing icon="production_quantity_limits"');
  assert.ok(blockMatch[0].includes('title="No parts required for selected tickets"'), 'Missing title');
  assert.ok(blockMatch[0].includes('subtitle="Select open tickets that need parts."'), 'Missing subtitle');
});

check('6. GUARD: ShoppingListSection.tsx keeps its loading block inline', () => {
  const src = fs.readFileSync(shoppingListPath, 'utf8');
  assert.ok(
    src.includes('flex flex-col items-center justify-center py-12 gap-3 text-gray-400'),
    'ShoppingListSection.tsx loading container missing'
  );
  assert.ok(src.includes('animate-spin text-primary'), 'ShoppingListSection.tsx loading spinner missing');
  assert.ok(src.includes('Building buy list...'), 'ShoppingListSection.tsx loading text missing');
  assert.ok(!/LoadingState/.test(src), 'ShoppingListSection.tsx must not reference LoadingState yet');
});

console.log(`\nEmptyState Tests: ${passes} Passed, ${failures} Failed`);
process.exit(failures > 0 ? 1 : 0);
