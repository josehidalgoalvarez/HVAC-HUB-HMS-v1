import assert from 'node:assert/strict';
import { reportClientError, resetClientErrorReporterForTests } from '../utils/clientErrorReporter.ts';

let passed = 0;

// 1. Payload truncation (stack > 4000 chars cut to 4000)
resetClientErrorReporterForTests();
let captured = null;
const ok1 = await reportClientError(
  { source: 'boundary', message: 'Boom', stack: 'x'.repeat(5000), route: '/tickets/42' },
  async (p) => { captured = p; }
);
assert.equal(ok1, true);
assert.equal(captured.stack.length, 4000);
passed++;

// 2. 60s dedup (same message + route twice -> one post)
resetClientErrorReporterForTests();
let count2 = 0;
await reportClientError({ source: 'window', message: 'Dup', route: '/a' }, async () => { count2++; });
const second = await reportClientError({ source: 'window', message: 'Dup', route: '/a' }, async () => { count2++; });
assert.equal(second, false);
assert.equal(count2, 1);
passed++;

// 3. Session cap (max 5 reports; 6th dropped)
resetClientErrorReporterForTests();
let count3 = 0;
for (let i = 1; i <= 6; i++) {
  await reportClientError({ source: 'window', message: `Err ${i}`, route: '/a' }, async () => { count3++; });
}
assert.equal(count3, 5);
passed++;

// 4. Never throws when post rejects
resetClientErrorReporterForTests();
const ok4 = await reportClientError(
  { source: 'unhandledrejection', message: 'Net fail', route: '/b' },
  async () => { throw new Error('401 Unauthorized'); }
);
assert.equal(ok4, false);
passed++;

console.log(`ClientErrorReporter tests: ${passed} Passed, 0 Failed`);
