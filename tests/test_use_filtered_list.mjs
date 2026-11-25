import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const hookPath = path.resolve('hooks/useFilteredList.ts');
const viewPath = path.resolve('components/sops/SOPListView.tsx');
const stockpileViewPath = path.resolve('components/parts/StockpileInventoryView.tsx');
const partSearchSectionPath = path.resolve('components/parts/PartSearchSection.tsx');

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

console.log(`\nuseFilteredList Tests: ${passes} Passed, ${failures} Failed`);
process.exit(failures > 0 ? 1 : 0);
