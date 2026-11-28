import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const kitPath = path.resolve('components/common/LoadingState.tsx');
const ticketListPath = path.resolve('components/tickets/TicketListView.tsx');
const dayPlanPath = path.resolve('components/runsheets/DayPlanView.tsx');
const batchBuilderPath = path.resolve('components/runsheets/BatchBuilderModal.tsx');
const shoppingListPath = path.resolve('components/parts/ShoppingListSection.tsx');
const buyListPath = path.resolve('components/parts/BuyListView.tsx');

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

check('7. DayPlanView.tsx imports LoadingState from ../common/LoadingState', () => {
  const src = fs.readFileSync(dayPlanPath, 'utf8');
  assert.ok(
    /import\s*\{[^}]*\bLoadingState\b[^}]*\}\s*from\s*['"]\.\.\/common\/LoadingState['"]/.test(src),
    'DayPlanView.tsx does not import LoadingState from ../common/LoadingState'
  );
});

check('8. DayPlanView.tsx renders 1 <LoadingState with zero inline loading shell', () => {
  const src = fs.readFileSync(dayPlanPath, 'utf8');
  const loadingStates = src.match(/<LoadingState\b/g) || [];
  const inlineShells = src.match(/flex flex-col items-center justify-center py-16 gap-3 text-gray-500/g) || [];
  assert.equal(loadingStates.length, 1, `Expected 1 <LoadingState in DayPlanView.tsx, found ${loadingStates.length}`);
  assert.equal(inlineShells.length, 0, `Expected 0 inline loading shells in DayPlanView.tsx, found ${inlineShells.length}`);
});

check('9. DayPlanView.tsx preserves message="Loading day-plan route blocks..." and tone="muted" on <LoadingState>', () => {
  const src = fs.readFileSync(dayPlanPath, 'utf8');
  const blockMatch = src.match(/<LoadingState[\s\S]*?\/>/);
  assert.ok(blockMatch, 'Missing <LoadingState ... /> block in DayPlanView.tsx');
  const block = blockMatch[0];
  assert.ok(block.includes('message="Loading day-plan route blocks..."'), 'Missing message="Loading day-plan route blocks..."');
  assert.ok(block.includes('tone="muted"'), 'Missing tone="muted"');
});

check('10. GUARD: DayPlanView.tsx keeps its empty state as <EmptyState', () => {
  const src = fs.readFileSync(dayPlanPath, 'utf8');
  const emptyStates = src.match(/<EmptyState\b/g) || [];
  assert.equal(emptyStates.length, 1, `Expected 1 <EmptyState in DayPlanView.tsx, found ${emptyStates.length}`);
  assert.ok(src.includes('No day plan scheduled for'), 'DayPlanView.tsx empty state missing');
});

check('11. BatchBuilderModal.tsx imports LoadingState from ../common/LoadingState', () => {
  const src = fs.readFileSync(batchBuilderPath, 'utf8');
  assert.ok(
    /import\s*\{[^}]*\bLoadingState\b[^}]*\}\s*from\s*['"]\.\.\/common\/LoadingState['"]/.test(src),
    'BatchBuilderModal.tsx does not import LoadingState from ../common/LoadingState'
  );
});

check('12. BatchBuilderModal.tsx renders 1 <LoadingState with zero inline loading shell', () => {
  const src = fs.readFileSync(batchBuilderPath, 'utf8');
  const loadingStates = src.match(/<LoadingState\b/g) || [];
  const inlineShells = src.match(/flex flex-col items-center justify-center py-12 gap-2 text-gray-400/g) || [];
  assert.equal(loadingStates.length, 1, `Expected 1 <LoadingState in BatchBuilderModal.tsx, found ${loadingStates.length}`);
  assert.equal(inlineShells.length, 0, `Expected 0 inline loading shells in BatchBuilderModal.tsx, found ${inlineShells.length}`);
});

check('13. BatchBuilderModal.tsx preserves message="Loading open tickets...", padding="md", spacing="compact", iconClassName text-3xl, and messageClassName="text-xs"', () => {
  const src = fs.readFileSync(batchBuilderPath, 'utf8');
  const blockMatch = src.match(/<LoadingState[\s\S]*?\/>/);
  assert.ok(blockMatch, 'Missing <LoadingState ... /> block in BatchBuilderModal.tsx');
  const block = blockMatch[0];
  assert.ok(block.includes('message="Loading open tickets..."'), 'Missing message="Loading open tickets..."');
  assert.ok(block.includes('padding="md"'), 'Missing padding="md"');
  assert.ok(block.includes('spacing="compact"'), 'Missing spacing="compact"');
  assert.ok(block.includes('iconClassName=') && block.includes('text-3xl'), 'Missing iconClassName with text-3xl');
  assert.ok(block.includes('messageClassName="text-xs"') && !block.includes('font-semibold'), 'Missing messageClassName="text-xs" without font-semibold');
});

check('14. GUARD: BatchBuilderModal.tsx keeps its "No open tickets available to schedule." block inline', () => {
  const src = fs.readFileSync(batchBuilderPath, 'utf8');
  assert.ok(
    src.includes('text-center py-10 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl'),
    'BatchBuilderModal.tsx inline non-canonical empty container missing'
  );
  assert.ok(
    src.includes('text-sm font-semibold text-gray-500">No open tickets available to schedule.'),
    'BatchBuilderModal.tsx inline empty message missing'
  );
  assert.ok(!/EmptyState/.test(src), 'BatchBuilderModal.tsx must not reference EmptyState');
});

check('15. ShoppingListSection.tsx imports LoadingState from ../common/LoadingState', () => {
  const src = fs.readFileSync(shoppingListPath, 'utf8');
  assert.ok(
    /import\s*\{[^}]*\bLoadingState\b[^}]*\}\s*from\s*['"]\.\.\/common\/LoadingState['"]/.test(src),
    'ShoppingListSection.tsx does not import LoadingState from ../common/LoadingState'
  );
});

check('16. ShoppingListSection.tsx renders 1 <LoadingState with zero inline loading shell', () => {
  const src = fs.readFileSync(shoppingListPath, 'utf8');
  const loadingStates = src.match(/<LoadingState\b/g) || [];
  const inlineShells = src.match(/flex flex-col items-center justify-center py-12 gap-3 text-gray-400/g) || [];
  assert.equal(loadingStates.length, 1, `Expected 1 <LoadingState in ShoppingListSection.tsx, found ${loadingStates.length}`);
  assert.equal(inlineShells.length, 0, `Expected 0 inline loading shells in ShoppingListSection.tsx, found ${inlineShells.length}`);
});

check('17. ShoppingListSection.tsx preserves message="Building buy list...", padding="md", and iconClassName text-3xl on <LoadingState>', () => {
  const src = fs.readFileSync(shoppingListPath, 'utf8');
  const blockMatch = src.match(/<LoadingState[\s\S]*?\/>/);
  assert.ok(blockMatch, 'Missing <LoadingState ... /> block in ShoppingListSection.tsx');
  const block = blockMatch[0];
  assert.ok(block.includes('message="Building buy list..."'), 'Missing message="Building buy list..."');
  assert.ok(block.includes('padding="md"'), 'Missing padding="md"');
  assert.ok(block.includes('iconClassName=') && block.includes('text-3xl'), 'Missing iconClassName with text-3xl');
});

check('18. GUARD: ShoppingListSection.tsx keeps its empty state as <EmptyState', () => {
  const src = fs.readFileSync(shoppingListPath, 'utf8');
  const emptyStates = src.match(/<EmptyState\b/g) || [];
  assert.equal(emptyStates.length, 1, `Expected 1 <EmptyState in ShoppingListSection.tsx, found ${emptyStates.length}`);
  assert.ok(src.includes('No parts required for selected tickets'), 'ShoppingListSection.tsx empty state missing');
});

check('19. BuyListView.tsx imports LoadingState from ../common/LoadingState', () => {
  const src = fs.readFileSync(buyListPath, 'utf8');
  assert.ok(
    /import\s*\{[^}]*\bLoadingState\b[^}]*\}\s*from\s*['"]\.\.\/common\/LoadingState['"]/.test(src),
    'BuyListView.tsx does not import LoadingState from ../common/LoadingState'
  );
});

check('20. BuyListView.tsx renders 1 <LoadingState with zero inline loading shell', () => {
  const src = fs.readFileSync(buyListPath, 'utf8');
  const loadingStates = src.match(/<LoadingState\b/g) || [];
  const inlineShells = src.match(/flex flex-col items-center justify-center py-16 gap-3 text-gray-400/g) || [];
  assert.equal(loadingStates.length, 1, `Expected 1 <LoadingState in BuyListView.tsx, found ${loadingStates.length}`);
  assert.equal(inlineShells.length, 0, `Expected 0 inline loading shells in BuyListView.tsx, found ${inlineShells.length}`);
});

check('21. BuyListView.tsx preserves message="Generating buy list by work order..." on <LoadingState> with no other props', () => {
  const src = fs.readFileSync(buyListPath, 'utf8');
  const blockMatch = src.match(/<LoadingState[\s\S]*?\/>/);
  assert.ok(blockMatch, 'Missing <LoadingState ... /> block in BuyListView.tsx');
  const block = blockMatch[0];
  assert.ok(block.includes('message="Generating buy list by work order..."'), 'Missing message="Generating buy list by work order..."');
  for (const prop of ['padding=', 'spacing=', 'tone=', 'icon=', 'iconClassName=', 'messageClassName=', 'className=']) {
    assert.ok(!block.includes(prop), `BuyListView.tsx <LoadingState> must not pass ${prop}`);
  }
});

check('22. GUARD: BuyListView.tsx keeps its "No buy list items currently queued" empty block inline', () => {
  const src = fs.readFileSync(buyListPath, 'utf8');
  assert.ok(
    src.includes('text-center py-16 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 space-y-3'),
    'BuyListView.tsx inline near-canonical empty container missing'
  );
  assert.ok(src.includes('production_quantity_limits'), 'BuyListView.tsx empty icon missing');
  assert.ok(src.includes('No buy list items currently queued'), 'BuyListView.tsx empty title missing');
  assert.ok(src.includes('Add Manual Item'), 'BuyListView.tsx Add Manual Item button missing');
  assert.ok(!/EmptyState/.test(src), 'BuyListView.tsx must not reference EmptyState');
});

console.log(`\nLoadingState Tests: ${passes} Passed, ${failures} Failed`);
process.exit(failures > 0 ? 1 : 0);
