import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const hookPath = path.resolve('hooks/useModalState.ts');
const detailViewPath = path.resolve('components/tickets/TicketDetailView.tsx');
const visitModalPath = path.resolve('components/tickets/detail/TicketVisitModal.tsx');

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

console.log('--- useModalState Extraction Tests ---');

check('1. hooks/useModalState.ts exists and exports useModalState', () => {
  assert.ok(fs.existsSync(hookPath), 'hooks/useModalState.ts does not exist');
  const src = fs.readFileSync(hookPath, 'utf8');
  assert.ok(/export\s+function\s+useModalState\b/.test(src), 'useModalState.ts must export useModalState');
});

check('2. useModalState returns isOpen, open, close, submitting, error, setError, and submit', () => {
  assert.ok(fs.existsSync(hookPath), 'hooks/useModalState.ts does not exist');
  const src = fs.readFileSync(hookPath, 'utf8');
  const returnMatch = src.match(/return\s*\{[\s\S]*?\};/);
  assert.ok(returnMatch, 'Missing return object in useModalState.ts');
  for (const field of ['isOpen', 'open', 'close', 'submitting', 'error', 'setError', 'submit']) {
    assert.ok(new RegExp(`\\b${field}\\b`).test(returnMatch[0]), `Return object missing ${field}`);
  }
});

check('3. useModalState submit sets submitting true, clears error, runs fn, catches error with fallbackMessage, and resets submitting false in finally', () => {
  assert.ok(fs.existsSync(hookPath), 'hooks/useModalState.ts does not exist');
  const src = fs.readFileSync(hookPath, 'utf8');
  assert.ok(/setSubmitting\(true\)/.test(src), 'submit must call setSubmitting(true)');
  assert.ok(/setError\(null\)/.test(src), 'submit must clear error via setError(null)');
  assert.ok(/await\s+fn\(\)/.test(src), 'submit must await fn()');
  assert.ok(
    /err\s+instanceof\s+Error\s*\?\s*err\.message\s*:\s*fallbackMessage/.test(src),
    'submit catch must use err instanceof Error ? err.message : fallbackMessage'
  );
  assert.ok(/finally\s*\{[\s\S]*?setSubmitting\(false\)/.test(src), 'submit must reset setSubmitting(false) in finally');
});

check('4. useModalState open clears error', () => {
  assert.ok(fs.existsSync(hookPath), 'hooks/useModalState.ts does not exist');
  const src = fs.readFileSync(hookPath, 'utf8');
  assert.ok(
    /const\s+open\s*=\s*[\s\S]*?setIsOpen\(true\)[\s\S]*?setError\(null\)/.test(src) ||
    /const\s+open\s*=\s*[\s\S]*?setError\(null\)[\s\S]*?setIsOpen\(true\)/.test(src),
    'open must call setIsOpen(true) and setError(null)'
  );
});

check('5. TicketDetailView.tsx imports useModalState from ../hooks/useModalState and declares NO isLogVisitOpen / setIsLogVisitOpen', () => {
  const src = fs.readFileSync(detailViewPath, 'utf8');
  assert.ok(
    /import\s*\{[^}]*\buseModalState\b[^}]*\}\s*from\s*['"]\.\.\/\.\.\/hooks\/useModalState['"]/.test(src) ||
    /import\s*\{[^}]*\buseModalState\b[^}]*\}\s*from\s*['"]\.\.\/hooks\/useModalState['"]/.test(src),
    'TicketDetailView.tsx does not import useModalState'
  );
  assert.ok(!/\bisLogVisitOpen\b/.test(src), 'TicketDetailView.tsx must not reference isLogVisitOpen');
  assert.ok(!/\bsetIsLogVisitOpen\b/.test(src), 'TicketDetailView.tsx must not reference setIsLogVisitOpen');
});

check('6. TicketDetailView.tsx passes open={visitModal.isOpen}, onClose={visitModal.close}, and onLogVisit={visitModal.open}', () => {
  const src = fs.readFileSync(detailViewPath, 'utf8');
  assert.ok(src.includes('onLogVisit={visitModal.open}'), 'Missing onLogVisit={visitModal.open}');
  assert.ok(src.includes('open={visitModal.isOpen}'), 'Missing open={visitModal.isOpen}');
  assert.ok(src.includes('onClose={visitModal.close}'), 'Missing onClose={visitModal.close}');
});

check("7. TicketVisitModal.tsx imports useModalState, calls submit with 'Failed to log visit', and has NO visitSaving / setVisitSaving / alert(", () => {
  const src = fs.readFileSync(visitModalPath, 'utf8');
  assert.ok(
    /import\s*\{[^}]*\buseModalState\b[^}]*\}\s*from\s*['"]\.\.\/\.\.\/\.\.\/hooks\/useModalState['"]/.test(src),
    'TicketVisitModal.tsx does not import useModalState'
  );
  assert.ok(src.includes('.submit(') && src.includes("'Failed to log visit'"), "Missing submit call with 'Failed to log visit' fallback");
  assert.ok(!/\bvisitSaving\b/.test(src), 'TicketVisitModal.tsx must not reference visitSaving');
  assert.ok(!/\bsetVisitSaving\b/.test(src), 'TicketVisitModal.tsx must not reference setVisitSaving');
  assert.ok(!/\balert\(/.test(src), 'TicketVisitModal.tsx must have zero alert( calls');
});

check('8. TicketVisitModal.tsx renders inline error banner with exact LogPartUseModal class string conditional on hook error', () => {
  const src = fs.readFileSync(visitModalPath, 'utf8');
  assert.ok(
    src.includes('modalState.error &&') &&
    src.includes('p-3 text-xs bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300 rounded-xl') &&
    src.includes('{modalState.error}'),
    'TicketVisitModal.tsx missing inline error banner conditional on modalState.error'
  );
});

check('9. GUARD: TicketVisitModal.tsx still takes open prop and returns null when closed', () => {
  const src = fs.readFileSync(visitModalPath, 'utf8');
  assert.ok(/\bopen:\s*boolean\b/.test(src), 'TicketVisitModal.tsx missing open: boolean prop');
  assert.ok(src.includes('if (!open) return null;'), 'TicketVisitModal.tsx missing if (!open) return null;');
});

check('10. GUARD: TicketDetailView.tsx keeps its other three modal states (isEditModalOpen, isOrderPartOpen, isIdentifyOpen) with useState(false)', () => {
  const src = fs.readFileSync(detailViewPath, 'utf8');
  assert.ok(src.includes('const [isOrderPartOpen, setIsOrderPartOpen] = useState(false);'), 'Missing isOrderPartOpen useState(false)');
  assert.ok(src.includes('const [isIdentifyOpen, setIsIdentifyOpen] = useState(false);'), 'Missing isIdentifyOpen useState(false)');
  assert.ok(src.includes('const [isEditModalOpen, setIsEditModalOpen] = useState(false);'), 'Missing isEditModalOpen useState(false)');
});

console.log(`\nuseModalState Tests: ${passes} Passed, ${failures} Failed`);
process.exit(failures > 0 ? 1 : 0);
