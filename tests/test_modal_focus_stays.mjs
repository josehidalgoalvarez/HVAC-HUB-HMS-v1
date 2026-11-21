import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const modalPath = path.resolve('components/ui/Modal.tsx');
const src = fs.readFileSync(modalPath, 'utf8');

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

console.log('--- Modal Focus Stability Tests ---');

check('1. Focus-management useEffect has empty dependency array ([])', () => {
  const match = src.match(/\/\/ Focus management and Escape key handler[\s\S]*?\},\s*(\[[^\]]*\])\);/);
  assert.ok(match, 'Could not locate focus-management useEffect dependency array');
  assert.equal(match[1], '[]', `Expected empty deps [], got ${match[1]}`);
});

check('2. Escape handler calls onCloseRef.current() instead of closed-over onClose()', () => {
  const escMatch = src.match(/if \(e\.key === 'Escape'\) \{[\s\S]*?\}/);
  assert.ok(escMatch, 'Could not locate Escape handler block');
  assert.ok(escMatch[0].includes('onCloseRef.current()'), 'Escape handler must call onCloseRef.current()');
  assert.ok(!/\bonClose\(\)/.test(escMatch[0]), 'Escape handler must not call closed-over onClose()');
});

console.log(`\nModal Focus Tests: ${passes} Passed, ${failures} Failed`);
process.exit(failures > 0 ? 1 : 0);
