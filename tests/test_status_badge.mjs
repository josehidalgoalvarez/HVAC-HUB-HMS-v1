import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const componentPath = path.resolve('components/common/StatusBadge.tsx');
const movementSectionPath = path.resolve('components/parts/EquipmentMovementSection.tsx');
const stockpileViewPath = path.resolve('components/parts/StockpileInventoryView.tsx');

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

console.log('--- StatusBadge Extraction Tests ---');

check('1. components/common/StatusBadge.tsx exists and exports StatusBadge', () => {
  assert.ok(fs.existsSync(componentPath), 'components/common/StatusBadge.tsx does not exist');
  const src = fs.readFileSync(componentPath, 'utf8');
  assert.ok(/export\s+(?:const|function)\s+StatusBadge\b/.test(src), 'Missing export StatusBadge');
});

check('2. EquipmentMovementSection.tsx imports StatusBadge from ../common/StatusBadge', () => {
  const src = fs.readFileSync(movementSectionPath, 'utf8');
  assert.ok(
    /import\s*\{[^}]*\bStatusBadge\b[^}]*\}\s*from\s*['"]\.\.\/common\/StatusBadge['"]/.test(src),
    'EquipmentMovementSection.tsx does not import StatusBadge from ../common/StatusBadge'
  );
});

check('3. EquipmentMovementSection.tsx has zero statusBadgeClasses definitions and renders <StatusBadge', () => {
  const src = fs.readFileSync(movementSectionPath, 'utf8');
  assert.ok(!/\bstatusBadgeClasses\b/.test(src), 'EquipmentMovementSection.tsx must not define or reference statusBadgeClasses');
  assert.ok(/<StatusBadge\b/.test(src), 'EquipmentMovementSection.tsx must render <StatusBadge');
});

check('4. StatusBadge.tsx implements classMap[status] || classMap[\'unknown\'] fallback and renders <span>', () => {
  assert.ok(fs.existsSync(componentPath), 'components/common/StatusBadge.tsx does not exist');
  const src = fs.readFileSync(componentPath, 'utf8');
  assert.ok(src.includes('classMap[status]'), 'StatusBadge.tsx must look up classMap[status]');
  assert.ok(src.includes("classMap['unknown']"), "StatusBadge.tsx must fall back to classMap['unknown']");
  assert.ok(/<span\b[\s\S]*?>[\s\S]*<\/span>/.test(src), 'StatusBadge.tsx must render a <span>');
});

check('5. EquipmentMovementSection.tsx passes testId="equipment-current-status" on <StatusBadge', () => {
  const src = fs.readFileSync(movementSectionPath, 'utf8');
  const match = src.match(/<StatusBadge[\s\S]*?\/>/);
  assert.ok(match, 'Could not locate <StatusBadge ... /> in EquipmentMovementSection.tsx');
  assert.ok(
    /testId=["']equipment-current-status["']/.test(match[0]),
    '<StatusBadge> must pass testId="equipment-current-status"'
  );
});

check('6. StockpileInventoryView.tsx imports StatusBadge from ../common/StatusBadge', () => {
  const src = fs.readFileSync(stockpileViewPath, 'utf8');
  assert.ok(
    /import\s*\{[^}]*\bStatusBadge\b[^}]*\}\s*from\s*['"]\.\.\/common\/StatusBadge['"]/.test(src),
    'StockpileInventoryView.tsx does not import StatusBadge from ../common/StatusBadge'
  );
});

check('7. StockpileInventoryView.tsx renders <StatusBadge and has zero statusColors[eq.status] lookups', () => {
  const src = fs.readFileSync(stockpileViewPath, 'utf8');
  assert.ok(/<StatusBadge\b/.test(src), 'StockpileInventoryView.tsx must render <StatusBadge');
  assert.ok(!src.includes('statusColors[eq.status]'), 'StockpileInventoryView.tsx must not contain statusColors[eq.status] lookup');
});

check('8. StockpileInventoryView.tsx hoists equipment status map out of equipmentList.map and preserves amber/gray-500/10 entries', () => {
  const src = fs.readFileSync(stockpileViewPath, 'utf8');
  const mapMatch = src.match(/Record<EquipmentStatus,\s*string>\s*=\s*\{[\s\S]*?\};/);
  assert.ok(mapMatch, 'Could not locate Record<EquipmentStatus, string> map in StockpileInventoryView.tsx');
  const mapIdx = src.indexOf(mapMatch[0]);
  const loopIdx = src.indexOf('equipmentList.map(');
  assert.ok(loopIdx !== -1 && mapIdx < loopIdx, 'Equipment status map must be hoisted before equipmentList.map(');
  assert.ok(
    mapMatch[0].includes('bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'),
    'Hoisted map must preserve amber needs_service entry'
  );
  assert.ok(
    mapMatch[0].includes('bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20'),
    'Hoisted map must preserve gray-500/10 unknown entry'
  );
  assert.ok(
    !mapMatch[0].includes('bg-primary/10 text-primary border-primary/20'),
    'Hoisted map must not use movement section primary needs_service entry'
  );
});

console.log(`\nStatusBadge Tests: ${passes} Passed, ${failures} Failed`);
process.exit(failures > 0 ? 1 : 0);
