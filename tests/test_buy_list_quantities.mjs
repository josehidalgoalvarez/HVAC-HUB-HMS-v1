import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const buyListPath = path.resolve('components/parts/BuyListView.tsx');
const domainTypesPath = path.resolve('types/domain.ts');
const partModelPath = path.resolve('src/Models/Part.php');

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

console.log('--- Buy List Quantities Fix Tests ---');

check('1. BuyListView.tsx uses per-ticket tm.quantity for ticket-derived card items', () => {
  const src = fs.readFileSync(buyListPath, 'utf8');
  assert.ok(/tm\.quantity\s*\?\?\s*1/.test(src), 'BuyListView.tsx must use tm.quantity ?? 1 in tickets_meta path');
});

check('2. BuyListView.tsx contains zero global fan-out quantity expressions', () => {
  const src = fs.readFileSync(buyListPath, 'utf8');
  const matches = src.match(/item\.buy_quantity\s*>\s*0\s*\?\s*item\.buy_quantity\s*:\s*item\.total_needed/g) || [];
  assert.equal(matches.length, 0, `Expected 0 global fan-out quantity expressions, found ${matches.length}`);
});

check('3. types/domain.ts declares quantity on ShoppingListItem.tickets_meta', () => {
  const src = fs.readFileSync(domainTypesPath, 'utf8');
  const match = src.match(/tickets_meta:\s*Array<\{[\s\S]*?\}>/);
  assert.ok(match, 'Could not locate tickets_meta type in types/domain.ts');
  assert.ok(/\bquantity\?:\s*number\b/.test(match[0]), 'tickets_meta element type must declare quantity?: number');
});

check('4. src/Models/Part.php removes default fallback WB24T10025 block and ships quantity in tickets_meta', () => {
  const src = fs.readFileSync(partModelPath, 'utf8');
  assert.ok(!src.includes('Default fallback item for test tickets needing parts'), 'src/Models/Part.php must not contain Default fallback item block');
  const fnMatch = src.match(/function\s+buildShoppingListFromTickets[\s\S]*?'total_parts_count'\s*=>\s*count\(\$items\)/);
  assert.ok(fnMatch, 'Could not locate buildShoppingListFromTickets in src/Models/Part.php');
  assert.ok(/'quantity'\s*=>/.test(fnMatch[0]) && /tickets_meta/.test(fnMatch[0]), 'buildShoppingListFromTickets must include quantity in tickets_meta');
  // Verify no fallback else branch assigning WB24T10025
  assert.ok(!/\}\s*else\s*\{[\s\S]*?WB24T10025/.test(fnMatch[0]), 'buildShoppingListFromTickets must not have an else branch assigning WB24T10025');
});

console.log(`\nBuy List Quantities Tests: ${passes} Passed, ${failures} Failed`);
process.exit(failures > 0 ? 1 : 0);
