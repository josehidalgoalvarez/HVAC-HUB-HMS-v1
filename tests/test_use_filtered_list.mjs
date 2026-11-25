import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const hookPath = path.resolve('hooks/useFilteredList.ts');
const viewPath = path.resolve('components/sops/SOPListView.tsx');
const stockpileViewPath = path.resolve('components/parts/StockpileInventoryView.tsx');
const partSearchSectionPath = path.resolve('components/parts/PartSearchSection.tsx');
const ticketListViewPath = path.resolve('components/tickets/TicketListView.tsx');

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

console.log('--- useFilteredList Extraction Tests ---');

check('1. hooks/useFilteredList.ts exists and exports useFilteredList and filterItems', () => {
  assert.ok(fs.existsSync(hookPath), 'hooks/useFilteredList.ts does not exist');
  const hookSrc = fs.readFileSync(hookPath, 'utf8');
  assert.ok(/export\s+(?:function|const)\s+useFilteredList\b/.test(hookSrc), 'Missing export useFilteredList');
  assert.ok(/export\s+(?:function|const)\s+filterItems\b/.test(hookSrc), 'Missing export filterItems');
});

check('2. SOPListView.tsx imports useFilteredList', () => {
  const viewSrc = fs.readFileSync(viewPath, 'utf8');
  assert.ok(/import\s*\{[^}]*\buseFilteredList\b[^}]*\}\s*from\s*['"][^'"]*useFilteredList['"]/.test(viewSrc), 'SOPListView.tsx does not import useFilteredList');
});

check('3. SOPListView.tsx has zero hand-rolled toLowerCase().includes( calls', () => {
  const viewSrc = fs.readFileSync(viewPath, 'utf8');
  const matches = viewSrc.match(/toLowerCase\(\)\.includes\(/g) || [];
  assert.equal(matches.length, 0, `Expected 0 toLowerCase().includes( calls in SOPListView.tsx, found ${matches.length}`);
});

check('4. hooks/useFilteredList.ts contains toLowerCase().includes( and useMemo(', () => {
  assert.ok(fs.existsSync(hookPath), 'hooks/useFilteredList.ts does not exist');
  const hookSrc = fs.readFileSync(hookPath, 'utf8');
  assert.ok(hookSrc.includes('toLowerCase().includes('), 'Hook must contain toLowerCase().includes(');
  assert.ok(hookSrc.includes('useMemo('), 'Hook must contain useMemo(');
});

check('5. StockpileInventoryView.tsx imports useFilteredList', () => {
  const spSrc = fs.readFileSync(stockpileViewPath, 'utf8');
  assert.ok(/import\s*\{[^}]*\buseFilteredList\b[^}]*\}\s*from\s*['"][^'"]*useFilteredList['"]/.test(spSrc), 'StockpileInventoryView.tsx does not import useFilteredList');
});

check('6. StockpileInventoryView.tsx has zero hand-rolled toLowerCase().includes( calls', () => {
  const spSrc = fs.readFileSync(stockpileViewPath, 'utf8');
  const matches = spSrc.match(/toLowerCase\(\)\.includes\(/g) || [];
  assert.equal(matches.length, 0, `Expected 0 toLowerCase().includes( calls in StockpileInventoryView.tsx, found ${matches.length}`);
});

check('7. StockpileInventoryView.tsx getSearchText coerces nullish fields with ?? \'\'', () => {
  const spSrc = fs.readFileSync(stockpileViewPath, 'utf8');
  const match = spSrc.match(/getSearchText:\s*\([^)]*\)\s*=>\s*\[[\s\S]*?\]/);
  assert.ok(match, 'Could not locate getSearchText array in StockpileInventoryView.tsx');
  assert.ok(match[0].includes("?? ''"), 'getSearchText must coerce nullish fields with ?? \'\'');
});

check('8. PartSearchSection.tsx imports filterItems and calls it twice', () => {
  const psSrc = fs.readFileSync(partSearchSectionPath, 'utf8');
  assert.ok(/import\s*\{[^}]*\bfilterItems\b[^}]*\}\s*from\s*['"][^'"]*useFilteredList['"]/.test(psSrc), 'PartSearchSection.tsx does not import filterItems');
  const calls = psSrc.match(/\bfilterItems\(/g) || [];
  assert.ok(calls.length >= 2, `Expected at least 2 filterItems( calls in PartSearchSection.tsx, found ${calls.length}`);
});

check('9. PartSearchSection.tsx has zero hand-rolled toLowerCase().includes( calls', () => {
  const psSrc = fs.readFileSync(partSearchSectionPath, 'utf8');
  const matches = psSrc.match(/toLowerCase\(\)\.includes\(/g) || [];
  assert.equal(matches.length, 0, `Expected 0 toLowerCase().includes( calls in PartSearchSection.tsx, found ${matches.length}`);
});

check('10. filterItems supports trimQuery = true and PartSearchSection passes false on both calls', () => {
  const hookSrc = fs.readFileSync(hookPath, 'utf8');
  assert.ok(/trimQuery\s*(?::\s*boolean\s*)?=\s*true/.test(hookSrc), 'filterItems must accept trimQuery = true parameter');
  const psSrc = fs.readFileSync(partSearchSectionPath, 'utf8');
  const falseTrimMatches = psSrc.match(/\bundefined\s*,\s*false\s*\)/g) || [];
  assert.ok(falseTrimMatches.length >= 2, `Expected 2 filterItems calls passing undefined, false in PartSearchSection.tsx, found ${falseTrimMatches.length}`);
});

check('11. PartSearchSection.tsx preserves nullish coercion, String(c.unit_number), and compatible_models spread', () => {
  const psSrc = fs.readFileSync(partSearchSectionPath, 'utf8');
  assert.ok(psSrc.includes("?? ''"), 'PartSearchSection.tsx must coerce nullish fields with ?? \'\'');
  assert.ok(psSrc.includes('String(c.unit_number)'), 'PartSearchSection.tsx must preserve String(c.unit_number)');
  assert.ok(/\.\.\.\(p\.compatible_models\s*\?\?\s*\[\]\)/.test(psSrc), 'PartSearchSection.tsx must spread ...(p.compatible_models ?? [])');
});

check('12. TicketListView.tsx imports useFilteredList', () => {
  const tlSrc = fs.readFileSync(ticketListViewPath, 'utf8');
  assert.ok(/import\s*\{[^}]*\buseFilteredList\b[^}]*\}\s*from\s*['"][^'"]*useFilteredList['"]/.test(tlSrc), 'TicketListView.tsx does not import useFilteredList');
});

check('13. TicketListView.tsx has zero hand-rolled toLowerCase().includes( calls', () => {
  const tlSrc = fs.readFileSync(ticketListViewPath, 'utf8');
  const matches = tlSrc.match(/toLowerCase\(\)\.includes\(/g) || [];
  assert.equal(matches.length, 0, `Expected 0 toLowerCase().includes( calls in TicketListView.tsx, found ${matches.length}`);
});

check('14. useFilteredList supports trimQuery option (default true) and TicketListView passes trimQuery: false', () => {
  const hookSrc = fs.readFileSync(hookPath, 'utf8');
  assert.ok(/trimQuery\?:\s*boolean/.test(hookSrc), 'UseFilteredListOptions must declare trimQuery?: boolean');
  assert.ok(/trimQuery\s*=\s*true/.test(hookSrc), 'useFilteredList must default trimQuery = true');
  assert.ok(/filterItems\(\s*items\s*,\s*query\s*,\s*getSearchText\s*,\s*filter\s*,\s*sort\s*,\s*trimQuery\s*\)/.test(hookSrc), 'useFilteredList must pass trimQuery to filterItems');
  const tlSrc = fs.readFileSync(ticketListViewPath, 'utf8');
  assert.ok(/trimQuery:\s*false/.test(tlSrc), 'TicketListView.tsx must pass trimQuery: false');
});

check('15. TicketListView.tsx preserves inline archived check and all seven tab branches inside useFilteredList and drops dead line', () => {
  const tlSrc = fs.readFileSync(ticketListViewPath, 'utf8');
  const hookCallMatch = tlSrc.match(/useFilteredList\s*\(\s*tickets\s*,\s*\{[\s\S]*?\}\s*\)/);
  assert.ok(hookCallMatch, 'TicketListView.tsx must call useFilteredList(tickets, { ... })');
  const hookBlock = hookCallMatch[0];
  assert.ok(/const\s+isArchived\s*=\s*s\s*===\s*'archived-blocked'\s*\|\|\s*s\s*===\s*'archived'/.test(hookBlock), 'TicketListView.tsx must keep inline isArchived check inside useFilteredList');
  for (const tab of ['safety', 'closable', 'blocked', 'completed', 'archived', 'unassigned']) {
    assert.ok(new RegExp(`activeFilter\\s*===\\s*'${tab}'`).test(hookBlock), `Missing tab branch for '${tab}' inside useFilteredList`);
  }
  assert.ok(/if\s*\(\s*isArchived\s*&&\s*!q\.trim\(\)\s*\)\s*\{\s*return\s+false;\s*\}/.test(hookBlock), 'Missing all-tab archived exclusion using 2nd param !q.trim() inside useFilteredList');
  assert.ok(!/filter\s*:\s*\([^)]*\)\s*=>[\s\S]*\bsearchQuery\b/.test(hookBlock), 'filter predicate must NOT reference searchQuery (TDZ)');
  assert.ok(!/activeFilter\s*!==\s*'archived'\s*&&\s*isArchived\s*&&\s*!searchQuery\.trim\(\)/.test(tlSrc), 'Dead code check inside searchQuery.trim() must be dropped');
});

check('16. filterItems passes query as 2nd argument to filter', () => {
  const hookSrc = fs.readFileSync(hookPath, 'utf8');
  assert.ok(/filter\?:\s*\(\s*item:\s*T\s*,\s*query\?:\s*string\s*\)\s*=>\s*boolean/.test(hookSrc), 'UseFilteredListOptions.filter must accept optional query?: string 2nd param');
  assert.ok(/filter\s*\(\s*item\s*,\s*query\s*\)/.test(hookSrc), 'filterItems must call filter(item, query)');
});

console.log(`\nuseFilteredList Tests: ${passes} Passed, ${failures} Failed`);
process.exit(failures > 0 ? 1 : 0);
