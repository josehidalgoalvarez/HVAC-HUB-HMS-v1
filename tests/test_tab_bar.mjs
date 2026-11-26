import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const tabBarPath = path.resolve('components/common/TabBar.tsx');
const partsViewPath = path.resolve('components/parts/PartsView.tsx');
const watchesViewPath = path.resolve('components/watches/WatchesView.tsx');
const applianceDetailViewPath = path.resolve('components/appliances/detail/ApplianceDetailView.tsx');

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

console.log('--- TabBar Extraction Tests ---');

check('1. components/common/TabBar.tsx exists and exports TabBar and Tab', () => {
  assert.ok(fs.existsSync(tabBarPath), 'components/common/TabBar.tsx does not exist');
  const src = fs.readFileSync(tabBarPath, 'utf8');
  assert.ok(/export\s+interface\s+Tab\b/.test(src), 'Missing export interface Tab');
  assert.ok(/export\s+(?:const|function)\s+TabBar\b/.test(src), 'Missing export TabBar');
});

check('2. TabBar.tsx renders buttons via tabs.map and calls onChange(tab.id)', () => {
  assert.ok(fs.existsSync(tabBarPath), 'components/common/TabBar.tsx does not exist');
  const src = fs.readFileSync(tabBarPath, 'utf8');
  assert.ok(/tabs\.map\s*\(/.test(src), 'TabBar.tsx must map over tabs');
  assert.ok(/onChange\s*\(\s*tab\.id\s*\)/.test(src), 'TabBar.tsx must call onChange(tab.id)');
});

check('3. TabBar.tsx requires the 4 class props and contains no baked-in tab-bar style', () => {
  assert.ok(fs.existsSync(tabBarPath), 'components/common/TabBar.tsx does not exist');
  const src = fs.readFileSync(tabBarPath, 'utf8');
  for (const prop of ['containerClassName', 'buttonClassName', 'activeClassName', 'inactiveClassName']) {
    assert.ok(new RegExp(`\\b${prop}:\\s*string`).test(src), `TabBar.tsx must require ${prop}: string`);
  }
  for (const forbidden of ['bg-gray-100 dark:bg-neutral-800/80', 'bg-primary/20', 'bg-primary text-white']) {
    assert.ok(!src.includes(forbidden), `TabBar.tsx must not hard-code '${forbidden}'`);
  }
});

check('4. TabBar.tsx renders optional icon span and optional badge pill', () => {
  assert.ok(fs.existsSync(tabBarPath), 'components/common/TabBar.tsx does not exist');
  const src = fs.readFileSync(tabBarPath, 'utf8');
  assert.ok(/tab\.icon\s*&&/.test(src) && src.includes('material-symbols-outlined'), 'TabBar.tsx must render optional material-symbols-outlined icon when tab.icon is present');
  assert.ok(/tab\.badge/.test(src), 'TabBar.tsx must render optional badge pill when tab.badge is non-empty');
});

check('5. PartsView.tsx imports TabBar from ../common/TabBar', () => {
  const src = fs.readFileSync(partsViewPath, 'utf8');
  assert.ok(
    /import\s*\{[^}]*\bTabBar\b[^}]*\}\s*from\s*['"]\.\.\/common\/TabBar['"]/.test(src),
    'PartsView.tsx does not import TabBar from ../common/TabBar'
  );
});

check('6. PartsView.tsx renders <TabBar with search/harvest/suppliers and zero inline setActiveTab handlers', () => {
  const src = fs.readFileSync(partsViewPath, 'utf8');
  assert.ok(/<TabBar\b/.test(src), 'PartsView.tsx must render <TabBar');
  for (const id of ["'search'", "'harvest'", "'suppliers'"]) {
    assert.ok(src.includes(id), `PartsView.tsx missing tab id ${id}`);
  }
  assert.ok(!/onClick=\{\(\)\s*=>\s*setActiveTab\(/.test(src), 'PartsView.tsx must contain zero inline onClick={() => setActiveTab( handlers');
});

check('7. PartsView.tsx keeps Buy List as a plain <button> with id="parts-tab-shopping" calling onOpenBuyList inside <TabBar>', () => {
  const src = fs.readFileSync(partsViewPath, 'utf8');
  assert.ok(/<TabBar\b/.test(src), 'PartsView.tsx must render <TabBar');
  assert.ok(src.includes('id="parts-tab-shopping"'), 'PartsView.tsx must keep id="parts-tab-shopping"');
  const btnMatch = src.match(/<button\b[^>]*id="parts-tab-shopping"[\s\S]*?<\/button>/);
  assert.ok(btnMatch, 'Buy List must remain a plain <button> in PartsView.tsx');
  assert.ok(/onClick=\{onOpenBuyList\}/.test(btnMatch[0]), 'Buy List button must call onOpenBuyList');
  assert.ok(!/setActiveTab/.test(btnMatch[0]), 'Buy List button must not call setActiveTab');
});

check('8. TabBar.tsx renders afterTab?.[tab.id] after each tab button and PartsView passes afterTab={{ harvest: ... }}', () => {
  assert.ok(fs.existsSync(tabBarPath), 'components/common/TabBar.tsx does not exist');
  const tbSrc = fs.readFileSync(tabBarPath, 'utf8');
  assert.ok(/afterTab\?:\s*Record<string,\s*React\.ReactNode>/.test(tbSrc), 'TabBar.tsx must declare afterTab?: Record<string, React.ReactNode>');
  assert.ok(/<\/button>\s*\{afterTab\?\.\[tab\.id\]\}/.test(tbSrc), 'TabBar.tsx must render {afterTab?.[tab.id]} immediately after </button>');
  const pvSrc = fs.readFileSync(partsViewPath, 'utf8');
  const afterMatch = pvSrc.match(/afterTab=\{\{[\s\S]*?\}\}/);
  assert.ok(afterMatch, 'PartsView.tsx must pass afterTab={{ ... }} to <TabBar>');
  assert.ok(/\bharvest\s*:/.test(afterMatch[0]) && afterMatch[0].includes('parts-tab-shopping'), 'PartsView.tsx afterTab must key the parts-tab-shopping button under harvest');
});

check('9. WatchesView.tsx imports TabBar from ../common/TabBar', () => {
  const src = fs.readFileSync(watchesViewPath, 'utf8');
  assert.ok(
    /import\s*\{[^}]*\bTabBar\b[^}]*\}\s*from\s*['"]\.\.\/common\/TabBar['"]/.test(src),
    'WatchesView.tsx does not import TabBar from ../common/TabBar'
  );
});

check('10. WatchesView.tsx renders <TabBar with digest/all tabs and zero inline setActiveTab handlers', () => {
  const src = fs.readFileSync(watchesViewPath, 'utf8');
  assert.ok(/<TabBar\b/.test(src), 'WatchesView.tsx must render <TabBar');
  for (const id of ["'digest'", "'all'"]) {
    assert.ok(src.includes(id), `WatchesView.tsx missing tab id ${id}`);
  }
  assert.ok(!/onClick=\{\(\)\s*=>\s*setActiveTab\(/.test(src), 'WatchesView.tsx must contain zero inline onClick={() => setActiveTab( handlers');
});

check('11. WatchesView.tsx passes digest badge from activeAlertCount, iconClassName="text-base leading-none", and no badgeClassName', () => {
  const src = fs.readFileSync(watchesViewPath, 'utf8');
  const tabBarMatch = src.match(/<TabBar[\s\S]*?\/>/);
  assert.ok(tabBarMatch, 'Could not locate <TabBar ... /> in WatchesView.tsx');
  const block = tabBarMatch[0];
  assert.ok(/badge:\s*activeAlertCount\s*>\s*0/.test(block), 'Digest tab must pass badge driven by activeAlertCount > 0');
  assert.ok(/iconClassName=["']text-base leading-none["']/.test(block), 'WatchesView.tsx must pass iconClassName="text-base leading-none"');
  assert.ok(!/badgeClassName/.test(block), 'WatchesView.tsx must not pass badgeClassName (uses TabBar default rose pill)');
});

check('12. ApplianceDetailView.tsx imports TabBar from ../../common/TabBar', () => {
  const src = fs.readFileSync(applianceDetailViewPath, 'utf8');
  assert.ok(
    /import\s*\{[^}]*\bTabBar\b[^}]*\}\s*from\s*['"]\.\.\/\.\.\/common\/TabBar['"]/.test(src),
    'ApplianceDetailView.tsx does not import TabBar from ../../common/TabBar'
  );
});

check('13. ApplianceDetailView.tsx renders <TabBar with tabs={availableTabs} and zero inline setActiveTab(tab.id) handlers', () => {
  const src = fs.readFileSync(applianceDetailViewPath, 'utf8');
  assert.ok(/<TabBar\b/.test(src), 'ApplianceDetailView.tsx must render <TabBar');
  assert.ok(/tabs=\{availableTabs\}/.test(src), 'ApplianceDetailView.tsx must pass tabs={availableTabs}');
  assert.ok(!/onClick=\{\(\)\s*=>\s*setActiveTab\(tab\.id\)\}/.test(src), 'ApplianceDetailView.tsx must contain zero inline onClick={() => setActiveTab(tab.id)} handlers');
});

check('14. ApplianceDetailView.tsx keeps availableTabs.length > 1 conditional and grid containerClassName', () => {
  const src = fs.readFileSync(applianceDetailViewPath, 'utf8');
  assert.ok(/availableTabs\.length\s*>\s*1\s*&&\s*\([\s\S]*?<TabBar[\s\S]*?\)/.test(src), 'ApplianceDetailView.tsx must wrap <TabBar> in availableTabs.length > 1');
  const tabBarMatch = src.match(/<TabBar[\s\S]*?\/>/);
  assert.ok(tabBarMatch, 'Could not locate <TabBar ... /> in ApplianceDetailView.tsx');
  assert.ok(
    /containerClassName=["']grid grid-cols-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl["']/.test(tabBarMatch[0]),
    'ApplianceDetailView.tsx must pass grid containerClassName'
  );
});

console.log(`\nTabBar Tests: ${passes} Passed, ${failures} Failed`);
process.exit(failures > 0 ? 1 : 0);
