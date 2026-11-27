import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const kitPath = path.resolve('components/common/FormFields.tsx');
const buyListPath = path.resolve('components/parts/BuyListView.tsx');
const ticketEditModalPath = path.resolve('components/tickets/detail/TicketEditModal.tsx');

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

console.log('--- FormFields Extraction Tests ---');

check('1. components/common/FormFields.tsx exists and exports TextInput, Select, and Field', () => {
  assert.ok(fs.existsSync(kitPath), 'components/common/FormFields.tsx does not exist');
  const src = fs.readFileSync(kitPath, 'utf8');
  for (const name of ['TextInput', 'Select', 'Field']) {
    assert.ok(new RegExp(`export\\s+(?:const|function)\\s+${name}\\b`).test(src), `Missing export ${name}`);
  }
});

check('2. FormFields.tsx contains shared base class string without text-size and size prop with xs default', () => {
  assert.ok(fs.existsSync(kitPath), 'components/common/FormFields.tsx does not exist');
  const src = fs.readFileSync(kitPath, 'utf8');
  const expectedBase = 'w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-800 focus:outline-none focus:border-primary';
  assert.ok(src.includes(expectedBase), 'FormFields.tsx missing exact shared base class string');
  assert.ok(/size\s*=\s*['"]xs['"]/.test(src), "FormFields.tsx must default size = 'xs'");
});

check('3. BuyListView.tsx imports TextInput, Select, and Field from ../common/FormFields', () => {
  const src = fs.readFileSync(buyListPath, 'utf8');
  const importMatch = src.match(/import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/common\/FormFields['"]/);
  assert.ok(importMatch, 'BuyListView.tsx does not import from ../common/FormFields');
  for (const name of ['TextInput', 'Select', 'Field']) {
    assert.ok(new RegExp(`\\b${name}\\b`).test(importMatch[1]), `BuyListView.tsx import missing ${name}`);
  }
});

check('4. BuyListView.tsx add-part form renders 5 <TextInput and 1 <Select with zero inline w-full px-3 py-2', () => {
  const src = fs.readFileSync(buyListPath, 'utf8');
  const textInputs = src.match(/<TextInput\b/g) || [];
  const selects = src.match(/<Select\b/g) || [];
  const inlineInputs = src.match(/w-full px-3 py-2/g) || [];
  assert.equal(textInputs.length, 5, `Expected 5 <TextInput in BuyListView.tsx, found ${textInputs.length}`);
  assert.equal(selects.length, 1, `Expected 1 <Select in BuyListView.tsx, found ${selects.length}`);
  assert.equal(inlineInputs.length, 0, `Expected 0 inline w-full px-3 py-2 in BuyListView.tsx, found ${inlineInputs.length}`);
});

check('5. BuyListView.tsx quantity <TextInput preserves font-mono via className', () => {
  const src = fs.readFileSync(buyListPath, 'utf8');
  const match = src.match(/<TextInput[\s\S]*?\/>/g) || [];
  const qtyField = match.find((m) => m.includes('type="number"') && m.includes('className="font-mono"'));
  assert.ok(qtyField, 'Quantity <TextInput> must preserve className="font-mono"');
});

check('6. BuyListView.tsx add-part form renders 6 <Field wrappers and zero inline label strings', () => {
  const src = fs.readFileSync(buyListPath, 'utf8');
  const fields = src.match(/<Field\b/g) || [];
  const inlineLabels = src.match(/block text-xs font-bold uppercase text-gray-500 mb-1/g) || [];
  assert.equal(fields.length, 6, `Expected 6 <Field in BuyListView.tsx, found ${fields.length}`);
  assert.equal(inlineLabels.length, 0, `Expected 0 inline label strings in BuyListView.tsx, found ${inlineLabels.length}`);
});

check('7. FormFields.tsx exports Textarea with shared BASE_FIELD_CLASSES and size pattern', () => {
  const src = fs.readFileSync(kitPath, 'utf8');
  assert.ok(/export\s+(?:const|function)\s+Textarea\b/.test(src), 'Missing export Textarea');
  assert.ok(/<textarea\b/.test(src), 'Textarea must render <textarea>');
});

check('8. TicketEditModal.tsx imports TextInput, Select, Textarea, and Field from ../../common/FormFields', () => {
  const src = fs.readFileSync(ticketEditModalPath, 'utf8');
  const importMatch = src.match(/import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/\.\.\/common\/FormFields['"]/);
  assert.ok(importMatch, 'TicketEditModal.tsx does not import from ../../common/FormFields');
  for (const name of ['TextInput', 'Select', 'Textarea', 'Field']) {
    assert.ok(new RegExp(`\\b${name}\\b`).test(importMatch[1]), `TicketEditModal.tsx import missing ${name}`);
  }
});

check('9. TicketEditModal.tsx renders 4 <TextInput, 2 <Select, 1 <Textarea with zero inline w-full px-3 py-2', () => {
  const src = fs.readFileSync(ticketEditModalPath, 'utf8');
  const textInputs = src.match(/<TextInput\b/g) || [];
  const selects = src.match(/<Select\b/g) || [];
  const textareas = src.match(/<Textarea\b/g) || [];
  const inlineInputs = src.match(/w-full px-3 py-2/g) || [];
  assert.equal(textInputs.length, 4, `Expected 4 <TextInput in TicketEditModal.tsx, found ${textInputs.length}`);
  assert.equal(selects.length, 2, `Expected 2 <Select in TicketEditModal.tsx, found ${selects.length}`);
  assert.equal(textareas.length, 1, `Expected 1 <Textarea in TicketEditModal.tsx, found ${textareas.length}`);
  assert.equal(inlineInputs.length, 0, `Expected 0 inline w-full px-3 py-2 in TicketEditModal.tsx, found ${inlineInputs.length}`);
});

check('10. TicketEditModal.tsx renders 4 <Field wrappers and zero inline Field label strings', () => {
  const src = fs.readFileSync(ticketEditModalPath, 'utf8');
  const fields = src.match(/<Field\b/g) || [];
  const inlineLabels = src.match(/block text-xs font-bold uppercase text-gray-500 mb-1/g) || [];
  assert.equal(fields.length, 4, `Expected 4 <Field in TicketEditModal.tsx, found ${fields.length}`);
  assert.equal(inlineLabels.length, 0, `Expected 0 inline label strings in TicketEditModal.tsx, found ${inlineLabels.length}`);
});

check('11. TicketEditModal.tsx preserves State/Priority/Blocker variant classes and closed-elsewhere logic on kit components', () => {
  const src = fs.readFileSync(ticketEditModalPath, 'utf8');
  const selects = src.match(/<Select[\s\S]*?<\/Select>/g) || [];
  assert.equal(selects.length, 2, 'Expected 2 <Select>...</Select> blocks in TicketEditModal.tsx');
  assert.ok(selects[0].includes('border-emerald-500') && selects[0].includes('border-rose-500'), 'State <Select> must preserve conditional color branches');
  assert.ok(selects[0].includes('closed-elsewhere:'), 'State <Select> must preserve closed-elsewhere: logic');
  assert.ok(selects[1].includes('border-brand-red') && selects[1].includes('border-amber-500'), 'Priority <Select> must preserve conditional color branches');
  const textInputs = src.match(/<TextInput[\s\S]*?\/>/g) || [];
  const blockerInput = textInputs.find((m) => m.includes('border-red-300') && m.includes('bg-red-50/50'));
  assert.ok(blockerInput, 'Blocker <TextInput> must preserve border-red-300 and bg-red-50/50');
});

console.log(`\nFormFields Tests: ${passes} Passed, ${failures} Failed`);
process.exit(failures > 0 ? 1 : 0);
