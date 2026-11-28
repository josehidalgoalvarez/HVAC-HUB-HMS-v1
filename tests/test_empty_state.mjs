import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const kitPath = path.resolve('components/common/EmptyState.tsx');
const shoppingListPath = path.resolve('components/parts/ShoppingListSection.tsx');
const mckayStoragePath = path.resolve('components/parts/McKayStorageMenuView.tsx');
const ticketListPath = path.resolve('components/tickets/TicketListView.tsx');
const dayPlanPath = path.resolve('components/runsheets/DayPlanView.tsx');
const stockpileViewPath = path.resolve('components/parts/StockpileInventoryView.tsx');
const partSearchPath = path.resolve('components/parts/PartSearchSection.tsx');
const buyListPath = path.resolve('components/parts/BuyListView.tsx');
const watchesViewPath = path.resolve('components/watches/WatchesView.tsx');

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
  assert.ok(
    src.includes('text-center px-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800'),
    'EmptyState.tsx missing canonical shell string'
  );
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

check('7. McKayStorageMenuView.tsx imports EmptyState from ../common/EmptyState', () => {
  const src = fs.readFileSync(mckayStoragePath, 'utf8');
  assert.ok(
    /import\s*\{[^}]*\bEmptyState\b[^}]*\}\s*from\s*['"]\.\.\/common\/EmptyState['"]/.test(src),
    'McKayStorageMenuView.tsx does not import EmptyState from ../common/EmptyState'
  );
});

check('8. McKayStorageMenuView.tsx renders 1 <EmptyState with zero inline canonical shell', () => {
  const src = fs.readFileSync(mckayStoragePath, 'utf8');
  const emptyStates = src.match(/<EmptyState\b/g) || [];
  const inlineShells = src.match(new RegExp(CANONICAL_SHELL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || [];
  assert.equal(emptyStates.length, 1, `Expected 1 <EmptyState in McKayStorageMenuView.tsx, found ${emptyStates.length}`);
  assert.equal(inlineShells.length, 0, `Expected 0 inline canonical shells in McKayStorageMenuView.tsx, found ${inlineShells.length}`);
});

check('9. McKayStorageMenuView.tsx preserves icon, iconClassName, title, subtitle, and subtitleClassName on <EmptyState>', () => {
  const src = fs.readFileSync(mckayStoragePath, 'utf8');
  const blockMatch = src.match(/<EmptyState[\s\S]*?\/>/);
  assert.ok(blockMatch, 'Expected <EmptyState ... /> block in McKayStorageMenuView.tsx');
  assert.ok(blockMatch[0].includes('icon="inventory"'), 'Missing icon="inventory"');
  assert.ok(blockMatch[0].includes('iconClassName="text-4xl text-gray-400"'), 'Missing iconClassName="text-4xl text-gray-400"');
  assert.ok(blockMatch[0].includes('title="No stockpiles found for McKay site"'), 'Missing title');
  assert.ok(blockMatch[0].includes('subtitle="Stockpiles linked to building #89 will appear here automatically."'), 'Missing subtitle');
  assert.ok(blockMatch[0].includes('subtitleClassName="text-xs text-gray-500"'), 'Missing subtitleClassName="text-xs text-gray-500"');
});

check('10. TicketListView.tsx imports EmptyState from ../common/EmptyState', () => {
  const src = fs.readFileSync(ticketListPath, 'utf8');
  assert.ok(
    /import\s*\{[^}]*\bEmptyState\b[^}]*\}\s*from\s*['"]\.\.\/common\/EmptyState['"]/.test(src),
    'TicketListView.tsx does not import EmptyState from ../common/EmptyState'
  );
});

check('11. TicketListView.tsx renders 1 <EmptyState with zero inline canonical shell', () => {
  const src = fs.readFileSync(ticketListPath, 'utf8');
  const emptyStates = src.match(/<EmptyState\b/g) || [];
  const inlineShells = src.match(new RegExp(CANONICAL_SHELL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || [];
  assert.equal(emptyStates.length, 1, `Expected 1 <EmptyState in TicketListView.tsx, found ${emptyStates.length}`);
  assert.equal(inlineShells.length, 0, `Expected 0 inline canonical shells in TicketListView.tsx, found ${inlineShells.length}`);
});

check('12. TicketListView.tsx preserves icon, conditional title/subtitle, subtitleClassName, spacing="normal", and + New Ticket action on <EmptyState>', () => {
  const src = fs.readFileSync(ticketListPath, 'utf8');
  const blockMatch = src.match(/<EmptyState[\s\S]*?\/>/);
  assert.ok(blockMatch, 'Expected <EmptyState ... /> block in TicketListView.tsx');
  assert.ok(blockMatch[0].includes('icon="task_alt"'), 'Missing icon="task_alt"');
  assert.ok(
    blockMatch[0].includes("searchQuery || activeFilter !== 'all' ? 'No matching tickets found' : 'No active tickets'"),
    'Missing conditional title expression'
  );
  assert.ok(
    blockMatch[0].includes("searchQuery ? 'Try clearing your search query or filters' : 'Snap a photo or add details to start'"),
    'Missing conditional subtitle expression'
  );
  assert.ok(blockMatch[0].includes('subtitleClassName="text-xs text-gray-400 max-w-xs mx-auto"'), 'Missing subtitleClassName');
  assert.ok(blockMatch[0].includes('spacing="normal"'), 'Missing spacing="normal"');
  assert.ok(
    blockMatch[0].includes('action={') &&
    blockMatch[0].includes('variant="primary"') &&
    blockMatch[0].includes('setIsIntakeOpen(true)') &&
    blockMatch[0].includes('+ New Ticket'),
    'Missing + New Ticket action Button'
  );
});

check('14. DayPlanView.tsx imports EmptyState from ../common/EmptyState', () => {
  const src = fs.readFileSync(dayPlanPath, 'utf8');
  assert.ok(
    /import\s*\{[^}]*\bEmptyState\b[^}]*\}\s*from\s*['"]\.\.\/common\/EmptyState['"]/.test(src),
    'DayPlanView.tsx does not import EmptyState from ../common/EmptyState'
  );
});

check('15. DayPlanView.tsx renders 1 <EmptyState with zero inline canonical shell', () => {
  const src = fs.readFileSync(dayPlanPath, 'utf8');
  const emptyStates = src.match(/<EmptyState\b/g) || [];
  const inlineShells = src.match(new RegExp(CANONICAL_SHELL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || [];
  assert.equal(emptyStates.length, 1, `Expected 1 <EmptyState in DayPlanView.tsx, found ${emptyStates.length}`);
  assert.equal(inlineShells.length, 0, `Expected 0 inline canonical shells in DayPlanView.tsx, found ${inlineShells.length}`);
});

check('16. DayPlanView.tsx preserves icon, dynamic title, text-sub subtitleClassName, spacing="normal", and Plan Day action on <EmptyState>', () => {
  const src = fs.readFileSync(dayPlanPath, 'utf8');
  const blockMatch = src.match(/<EmptyState[\s\S]*?\n\s*\/>/);
  assert.ok(blockMatch, 'Expected <EmptyState ... /> block in DayPlanView.tsx');
  assert.ok(blockMatch[0].includes('icon="event_busy"'), 'Missing icon="event_busy"');
  assert.ok(
    blockMatch[0].includes('No day plan scheduled for {currentDate}'),
    'Missing dynamic {currentDate} title interpolation'
  );
  assert.ok(
    blockMatch[0].includes('subtitle="Plan a daily route from open tickets grouped by site."'),
    'Missing subtitle'
  );
  assert.ok(
    blockMatch[0].includes('subtitleClassName="text-xs text-text-sub-light dark:text-text-sub-dark max-w-sm mx-auto"'),
    'Missing text-sub subtitleClassName with max-w-sm mx-auto'
  );
  assert.ok(blockMatch[0].includes('spacing="normal"'), 'Missing spacing="normal"');
  assert.ok(
    blockMatch[0].includes('action={') &&
    blockMatch[0].includes('variant="primary"') &&
    blockMatch[0].includes('icon="alt_route"') &&
    blockMatch[0].includes('setIsBatchBuilderOpen(true)') &&
    blockMatch[0].includes('Plan Day'),
    'Missing Plan Day action Button with icon="alt_route"'
  );
});

check("18. EmptyState.tsx supports padding prop ('md' | 'sm', default 'md') without hard-coded py-12 in BASE_SHELL", () => {
  const src = fs.readFileSync(kitPath, 'utf8');
  const baseShellMatch = src.match(/const BASE_SHELL =\s*['"`]([^'"`]+)['"`]/);
  assert.ok(baseShellMatch, 'Missing BASE_SHELL in EmptyState.tsx');
  assert.ok(!baseShellMatch[1].includes('py-12'), 'BASE_SHELL must not hard-code py-12 once padding prop is added');
  assert.ok(
    src.includes('PADDING_CLASSES') && src.includes("md: 'py-12'") && src.includes("sm: 'py-10'"),
    'EmptyState.tsx must define PADDING_CLASSES with md: py-12 and sm: py-10'
  );
  assert.ok(/padding\?:\s*'md'\s*\|\s*'sm'/.test(src), "EmptyStateProps must declare padding?: 'md' | 'sm'");
  assert.ok(/padding\s*=\s*'md'/.test(src), "EmptyState must default padding to 'md'");
});

check('19. StockpileInventoryView.tsx imports EmptyState from ../common/EmptyState', () => {
  const src = fs.readFileSync(stockpileViewPath, 'utf8');
  assert.ok(
    /import\s*\{[^}]*\bEmptyState\b[^}]*\}\s*from\s*['"]\.\.\/common\/EmptyState['"]/.test(src),
    'StockpileInventoryView.tsx does not import EmptyState from ../common/EmptyState'
  );
});

check('20. StockpileInventoryView.tsx renders 2 <EmptyState with zero inline py-12 or py-10 shells', () => {
  const src = fs.readFileSync(stockpileViewPath, 'utf8');
  const emptyStates = src.match(/<EmptyState\b/g) || [];
  const inlinePy12 = src.match(/text-center py-12 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800/g) || [];
  const inlinePy10 = src.match(/text-center py-10 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800/g) || [];
  assert.equal(emptyStates.length, 2, `Expected 2 <EmptyState in StockpileInventoryView.tsx, found ${emptyStates.length}`);
  assert.equal(inlinePy12.length, 0, `Expected 0 inline py-12 shells in StockpileInventoryView.tsx, found ${inlinePy12.length}`);
  assert.equal(inlinePy10.length, 0, `Expected 0 inline py-10 shells in StockpileInventoryView.tsx, found ${inlinePy10.length}`);
});

check('21. StockpileInventoryView.tsx main <EmptyState> preserves wrapped icon, title variants, dynamic subtitle, spacing="normal", tone="subtle", and 2-button conditional action', () => {
  const src = fs.readFileSync(stockpileViewPath, 'utf8');
  const blocks = src.match(/<EmptyState[\s\S]*?\n\s*\/>/g) || [];
  assert.equal(blocks.length, 2, `Expected 2 <EmptyState ... /> blocks in StockpileInventoryView.tsx, found ${blocks.length}`);
  const main = blocks[0];
  assert.ok(main.includes('icon="inventory_2"'), 'Main block missing icon="inventory_2"');
  assert.ok(main.includes('iconWrapperClassName=') && main.includes('w-12 h-12 mx-auto rounded-full'), 'Main block missing iconWrapperClassName');
  assert.ok(main.includes('iconClassName="text-3xl"'), 'Main block missing iconClassName="text-3xl"');
  assert.ok(main.includes('title="No parts recorded at this location yet"'), 'Main block missing title');
  assert.ok(main.includes('titleSize="base"'), 'Main block missing titleSize="base"');
  assert.ok(main.includes('dark:text-gray-200'), 'Main block missing dark:text-gray-200 in titleClassName');
  assert.ok(main.includes("stockpile?.name || 'this location'"), 'Main block missing dynamic stockpile?.name fallback');
  assert.ok(main.includes('max-w-sm mx-auto') && main.includes('mt-1'), 'Main block missing max-w-sm mx-auto mt-1 in subtitleClassName');
  assert.ok(main.includes('spacing="normal"'), 'Main block missing spacing="normal"');
  assert.ok(main.includes('tone="subtle"'), 'Main block missing tone="subtle"');
  assert.ok(
    main.includes('setIsAddPartOpen(true)') &&
    main.includes('Add Part to Location') &&
    main.includes('allParts.length > 0') &&
    main.includes('setIsTransferOpen(true)') &&
    main.includes('Transfer from Another Depot'),
    'Main block missing 2-button conditional action'
  );
});

check('22. StockpileInventoryView.tsx filter <EmptyState> preserves search_off, dynamic title, text-gray-600, padding="sm", tone="faint", and Reset filter action', () => {
  const src = fs.readFileSync(stockpileViewPath, 'utf8');
  const blocks = src.match(/<EmptyState[\s\S]*?\n\s*\/>/g) || [];
  assert.equal(blocks.length, 2, `Expected 2 <EmptyState ... /> blocks in StockpileInventoryView.tsx, found ${blocks.length}`);
  const filter = blocks[1];
  assert.ok(filter.includes('icon="search_off"'), 'Filter block missing icon="search_off"');
  assert.ok(filter.includes('iconClassName="text-3xl text-gray-400"'), 'Filter block missing iconClassName="text-3xl text-gray-400"');
  assert.ok(filter.includes('No parts matching') && filter.includes('{searchQuery}'), 'Filter block missing dynamic {searchQuery} title');
  assert.ok(filter.includes('text-gray-600'), 'Filter block missing text-gray-600 in titleClassName');
  assert.ok(filter.includes('padding="sm"'), 'Filter block missing padding="sm"');
  assert.ok(filter.includes('tone="faint"'), 'Filter block missing tone="faint"');
  assert.ok(
    filter.includes("setSearchQuery('')") &&
    filter.includes('setFilterBelowMinOnly(false)') &&
    filter.includes('Reset filter'),
    'Filter block missing Reset filter action'
  );
});

check('23. PartSearchSection.tsx imports EmptyState from ../common/EmptyState', () => {
  const src = fs.readFileSync(partSearchPath, 'utf8');
  assert.ok(
    /import\s*\{[^}]*\bEmptyState\b[^}]*\}\s*from\s*['"]\.\.\/common\/EmptyState['"]/.test(src),
    'PartSearchSection.tsx does not import EmptyState from ../common/EmptyState'
  );
});

check('24. PartSearchSection.tsx renders 1 <EmptyState with zero inline canonical shell', () => {
  const src = fs.readFileSync(partSearchPath, 'utf8');
  const emptyStates = src.match(/<EmptyState\b/g) || [];
  const inlineShells = src.match(new RegExp(CANONICAL_SHELL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || [];
  assert.equal(emptyStates.length, 1, `Expected 1 <EmptyState in PartSearchSection.tsx, found ${emptyStates.length}`);
  assert.equal(inlineShells.length, 0, `Expected 0 inline canonical shells in PartSearchSection.tsx, found ${inlineShells.length}`);
});

check('25. PartSearchSection.tsx preserves icon inventory_2, titleSize="base", subtitle with max-w-xs mx-auto, spacing="normal", tone="subtle", and conditional Buy New / Add Part action', () => {
  const src = fs.readFileSync(partSearchPath, 'utf8');
  const blockMatch = src.match(/<EmptyState[\s\S]*?\n\s*\/>/);
  assert.ok(blockMatch, 'Missing <EmptyState ... /> block in PartSearchSection.tsx');
  const block = blockMatch[0];
  assert.ok(block.includes('icon="inventory_2"'), 'Missing icon="inventory_2"');
  assert.ok(block.includes('title="No matching parts or harvest units found"'), 'Missing title');
  assert.ok(block.includes('titleSize="base"'), 'Missing titleSize="base"');
  assert.ok(
    block.includes('Try searching by part number, appliance type, building or unit, or buy a new replacement part.'),
    'Missing subtitle text'
  );
  assert.ok(
    block.includes('subtitleClassName=') && block.includes('max-w-xs mx-auto'),
    'Missing subtitleClassName with max-w-xs mx-auto'
  );
  assert.ok(block.includes('spacing="normal"'), 'Missing spacing="normal"');
  assert.ok(block.includes('tone="subtle"'), 'Missing tone="subtle"');
  assert.ok(
    block.includes('onAddPart &&') &&
    block.includes('onClick={onAddPart}') &&
    block.includes('Buy New / Add Part'),
    'Missing conditional Buy New / Add Part action'
  );
});

check('23. BuyListView.tsx imports EmptyState from ../common/EmptyState', () => {
  const src = fs.readFileSync(buyListPath, 'utf8');
  assert.ok(
    /import\s*\{[^}]*\bEmptyState\b[^}]*\}\s*from\s*['"]\.\.\/common\/EmptyState['"]/.test(src),
    'BuyListView.tsx does not import EmptyState from ../common/EmptyState'
  );
});

check('24. BuyListView.tsx renders 1 <EmptyState with zero inline py-16 empty shell', () => {
  const src = fs.readFileSync(buyListPath, 'utf8');
  const emptyStates = src.match(/<EmptyState\b/g) || [];
  const inlinePy16 = src.match(/text-center py-16 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800/g) || [];
  assert.equal(emptyStates.length, 1, `Expected 1 <EmptyState in BuyListView.tsx, found ${emptyStates.length}`);
  assert.equal(inlinePy16.length, 0, `Expected 0 inline py-16 empty shells in BuyListView.tsx, found ${inlinePy16.length}`);
});

check('25. BuyListView.tsx preserves icon, title, subtitle, padding="lg", spacing="normal", iconClassName text-5xl, titleSize="base", subtitleClassName text-text-sub-light, and Add Manual Item Button', () => {
  const src = fs.readFileSync(buyListPath, 'utf8');
  const blockMatch = src.match(/<EmptyState[\s\S]*?\n\s*\/>/);
  assert.ok(blockMatch, 'Missing <EmptyState ... /> block in BuyListView.tsx');
  const block = blockMatch[0];
  assert.ok(block.includes('icon="production_quantity_limits"'), 'Missing icon="production_quantity_limits"');
  assert.ok(block.includes('iconClassName=') && block.includes('text-5xl'), 'Missing iconClassName with text-5xl');
  assert.ok(block.includes('title="No buy list items currently queued"'), 'Missing title');
  assert.ok(block.includes('titleSize="base"'), 'Missing titleSize="base"');
  assert.ok(
    block.includes('subtitle="Auto-derived work order parts or manually added items will appear here."'),
    'Missing subtitle'
  );
  assert.ok(
    block.includes('subtitleClassName=') && block.includes('text-text-sub-light'),
    'Missing subtitleClassName with text-text-sub-light'
  );
  assert.ok(block.includes('padding="lg"'), 'Missing padding="lg"');
  assert.ok(block.includes('spacing="normal"'), 'Missing spacing="normal"');
  assert.ok(
    block.includes('action={') &&
    block.includes('icon="add"') &&
    block.includes('setIsAddFormOpen(true)') &&
    block.includes('Add Manual Item'),
    'Missing Add Manual Item Button action'
  );
});

check('26. GUARD: BuyListView.tsx keeps its loading state as <LoadingState', () => {
  const src = fs.readFileSync(buyListPath, 'utf8');
  const loadingStates = src.match(/<LoadingState\b/g) || [];
  assert.equal(loadingStates.length, 1, `Expected 1 <LoadingState in BuyListView.tsx, found ${loadingStates.length}`);
  assert.ok(src.includes('Generating buy list by work order...'), 'BuyListView.tsx loading message missing');
});

check('27. WatchesView.tsx imports EmptyState from ../common/EmptyState', () => {
  const src = fs.readFileSync(watchesViewPath, 'utf8');
  assert.ok(
    /import\s*\{[^}]*\bEmptyState\b[^}]*\}\s*from\s*['"]\.\.\/common\/EmptyState['"]/.test(src),
    'WatchesView.tsx does not import EmptyState from ../common/EmptyState'
  );
});

check('28. WatchesView.tsx renders 1 <EmptyState with zero inline empty shell', () => {
  const src = fs.readFileSync(watchesViewPath, 'utf8');
  const emptyStates = src.match(/<EmptyState\b/g) || [];
  const inlineShell = src.match(/py-12 text-center[^"]*border border-dashed border-gray-200 dark:border-gray-800 bg-white\/40/g) || [];
  assert.equal(emptyStates.length, 1, `Expected 1 <EmptyState in WatchesView.tsx, found ${emptyStates.length}`);
  assert.equal(inlineShell.length, 0, `Expected 0 inline empty shells in WatchesView.tsx, found ${inlineShell.length}`);
});

check('29. WatchesView.tsx preserves icon="search", title, iconClassName text-3xl, titleClassName text-text-sub-light, and tone="faint"', () => {
  const src = fs.readFileSync(watchesViewPath, 'utf8');
  const blockMatch = src.match(/<EmptyState[\s\S]*?\/>/);
  assert.ok(blockMatch, 'Missing <EmptyState ... /> block in WatchesView.tsx');
  const block = blockMatch[0];
  assert.ok(block.includes('icon="search"'), 'Missing icon="search"');
  assert.ok(block.includes('iconClassName=') && block.includes('text-3xl'), 'Missing iconClassName with text-3xl');
  assert.ok(block.includes('title="No watches match current filter."'), 'Missing title');
  assert.ok(block.includes('titleClassName=') && block.includes('text-text-sub-light'), 'Missing titleClassName with text-text-sub-light');
  assert.ok(block.includes('tone="faint"'), 'Missing tone="faint"');
});

console.log(`\nEmptyState Tests: ${passes} Passed, ${failures} Failed`);
process.exit(failures > 0 ? 1 : 0);
