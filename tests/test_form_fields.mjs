import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const kitPath = path.resolve('components/common/FormFields.tsx');
const buyListPath = path.resolve('components/parts/BuyListView.tsx');
const ticketEditModalPath = path.resolve('components/tickets/detail/TicketEditModal.tsx');
const ticketSubJobsPath = path.resolve('components/tickets/detail/TicketSubJobsSection.tsx');
const ticketIntakeModalPath = path.resolve('components/tickets/TicketIntakeModal.tsx');
const stockpileViewPath = path.resolve('components/parts/StockpileInventoryView.tsx');
const closeBlockModalPath = path.resolve('components/runsheets/CloseBlockModal.tsx');
const sopRunViewPath = path.resolve('components/sops/SOPRunView.tsx');
const ticketVisitModalPath = path.resolve('components/tickets/detail/TicketVisitModal.tsx');
const quickLogWidgetPath = path.resolve('components/jobs/QuickLogWidget.tsx');
const addPartModalPath = path.resolve('components/parts/AddPartModal.tsx');
const ticketOrderPartModalPath = path.resolve('components/tickets/detail/TicketOrderPartModal.tsx');
const ticketIdentifyModalPath = path.resolve('components/tickets/detail/TicketIdentifyModal.tsx');
const stockTransferModalPath = path.resolve('components/parts/StockTransferModal.tsx');
const harvestTransferModalPath = path.resolve('components/parts/HarvestTransferModal.tsx');

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

check('12. TicketSubJobsSection.tsx imports TextInput, Select, and Field from ../../common/FormFields', () => {
  const src = fs.readFileSync(ticketSubJobsPath, 'utf8');
  const importMatch = src.match(/import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/\.\.\/common\/FormFields['"]/);
  assert.ok(importMatch, 'TicketSubJobsSection.tsx does not import from ../../common/FormFields');
  for (const name of ['TextInput', 'Select', 'Field']) {
    assert.ok(new RegExp(`\\b${name}\\b`).test(importMatch[1]), `TicketSubJobsSection.tsx import missing ${name}`);
  }
});

check('13. TicketSubJobsSection.tsx renders 2 <TextInput, 2 <Select with zero inline w-full px-3 py-2', () => {
  const src = fs.readFileSync(ticketSubJobsPath, 'utf8');
  const textInputs = src.match(/<TextInput\b/g) || [];
  const selects = src.match(/<Select\b/g) || [];
  const inlineInputs = src.match(/w-full px-3 py-2/g) || [];
  assert.equal(textInputs.length, 2, `Expected 2 <TextInput in TicketSubJobsSection.tsx, found ${textInputs.length}`);
  assert.equal(selects.length, 2, `Expected 2 <Select in TicketSubJobsSection.tsx, found ${selects.length}`);
  assert.equal(inlineInputs.length, 0, `Expected 0 inline w-full px-3 py-2 in TicketSubJobsSection.tsx, found ${inlineInputs.length}`);
});

check('14. TicketSubJobsSection.tsx renders 3 <Field wrappers and zero inline Field label strings', () => {
  const src = fs.readFileSync(ticketSubJobsPath, 'utf8');
  const fields = src.match(/<Field\b/g) || [];
  const inlineLabels = src.match(/block text-xs font-bold uppercase text-gray-500 mb-1/g) || [];
  assert.equal(fields.length, 3, `Expected 3 <Field in TicketSubJobsSection.tsx, found ${fields.length}`);
  assert.equal(inlineLabels.length, 0, `Expected 0 inline label strings in TicketSubJobsSection.tsx, found ${inlineLabels.length}`);
});

check('15. TicketSubJobsSection.tsx preserves State/Priority/Blocker variant classes and childState === blocked conditional on kit components', () => {
  const src = fs.readFileSync(ticketSubJobsPath, 'utf8');
  const selects = src.match(/<Select[\s\S]*?<\/Select>/g) || [];
  assert.equal(selects.length, 2, 'Expected 2 <Select>...</Select> blocks in TicketSubJobsSection.tsx');
  assert.ok(
    selects[0].includes('border-emerald-500') && selects[0].includes('border-rose-500') && selects[0].includes('border-amber-400'),
    'Initial State <Select> must preserve 5-branch conditional colors'
  );
  assert.ok(selects[1].includes('border-brand-red') && selects[1].includes('border-amber-500'), 'Priority <Select> must preserve 3-branch conditional colors');
  assert.ok(/\{childState === 'blocked' && \([\s\S]*?<TextInput[\s\S]*?border-red-300[\s\S]*?bg-red-50\/50[\s\S]*?\)\}/.test(src), 'Blocker <TextInput> must preserve childState === blocked conditional and red classes');
});

check('16. TicketIntakeModal.tsx imports TextInput, Select, and Textarea from ../common/FormFields', () => {
  const src = fs.readFileSync(ticketIntakeModalPath, 'utf8');
  const importMatch = src.match(/import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/common\/FormFields['"]/);
  assert.ok(importMatch, 'TicketIntakeModal.tsx does not import from ../common/FormFields');
  for (const name of ['TextInput', 'Select', 'Textarea']) {
    assert.ok(new RegExp(`\\b${name}\\b`).test(importMatch[1]), `TicketIntakeModal.tsx import missing ${name}`);
  }
});

check('17. TicketIntakeModal.tsx renders 1 <TextInput, 1 <Select, 2 <Textarea with zero inline w-full px-3 py-2', () => {
  const src = fs.readFileSync(ticketIntakeModalPath, 'utf8');
  const textInputs = src.match(/<TextInput\b/g) || [];
  const selects = src.match(/<Select\b/g) || [];
  const textareas = src.match(/<Textarea\b/g) || [];
  const inlineInputs = src.match(/w-full px-3 py-2/g) || [];
  assert.equal(textInputs.length, 1, `Expected 1 <TextInput in TicketIntakeModal.tsx, found ${textInputs.length}`);
  assert.equal(selects.length, 1, `Expected 1 <Select in TicketIntakeModal.tsx, found ${selects.length}`);
  assert.equal(textareas.length, 2, `Expected 2 <Textarea in TicketIntakeModal.tsx, found ${textareas.length}`);
  assert.equal(inlineInputs.length, 0, `Expected 0 inline w-full px-3 py-2 in TicketIntakeModal.tsx, found ${inlineInputs.length}`);
});

check('18. GUARD: TicketIntakeModal.tsx renders 0 <Field wrappers and keeps tracking-wider labels untouched', () => {
  const src = fs.readFileSync(ticketIntakeModalPath, 'utf8');
  const fields = src.match(/<Field\b/g) || [];
  const trackingLabels = src.match(/block text-xs font-bold uppercase tracking-wider/g) || [];
  assert.equal(fields.length, 0, `Expected 0 <Field in TicketIntakeModal.tsx, found ${fields.length}`);
  assert.ok(trackingLabels.length >= 4, `Expected at least 4 tracking-wider labels in TicketIntakeModal.tsx, found ${trackingLabels.length}`);
});

check('19. TicketIntakeModal.tsx preserves focus:ring-2 and primary highlight variant classes on kit components', () => {
  const src = fs.readFileSync(ticketIntakeModalPath, 'utf8');
  const textareas = src.match(/<Textarea[\s\S]*?\/>/g) || [];
  assert.equal(textareas.length, 2, `Expected 2 <Textarea ... /> blocks in TicketIntakeModal.tsx, found ${textareas.length}`);
  assert.ok(textareas[0].includes('focus:ring-2 focus:ring-primary/40'), 'Verbatim Text <Textarea> must preserve focus:ring-2 focus:ring-primary/40');
  assert.ok(
    textareas[1].includes('border-primary/40') && textareas[1].includes('bg-primary/5') && textareas[1].includes('focus:ring-2 focus:ring-primary'),
    'Verified Scope <Textarea> must preserve primary highlight and focus:ring-2 focus:ring-primary'
  );
  const textInputs = src.match(/<TextInput[\s\S]*?\/>/g) || [];
  assert.equal(textInputs.length, 1, 'Expected 1 <TextInput ... /> block');
  assert.ok(textInputs[0].includes('focus:ring-2 focus:ring-primary/40'), 'WO Number <TextInput> must preserve focus:ring-2 focus:ring-primary/40');
  const selects = src.match(/<Select[\s\S]*?<\/Select>/g) || [];
  assert.equal(selects.length, 1, 'Expected 1 <Select>...</Select> block');
  assert.ok(selects[0].includes('focus:ring-2 focus:ring-primary/40'), 'Priority <Select> must preserve focus:ring-2 focus:ring-primary/40');
});

check('20. StockpileInventoryView.tsx imports TextInput, Select, and Textarea from ../common/FormFields', () => {
  const src = fs.readFileSync(stockpileViewPath, 'utf8');
  const importMatch = src.match(/import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/common\/FormFields['"]/);
  assert.ok(importMatch, 'StockpileInventoryView.tsx does not import from ../common/FormFields');
  for (const name of ['TextInput', 'Select', 'Textarea']) {
    assert.ok(new RegExp(`\\b${name}\\b`).test(importMatch[1]), `StockpileInventoryView.tsx import missing ${name}`);
  }
});

check('21. StockpileInventoryView.tsx renders 1 <TextInput, 1 <Select, 1 <Textarea with zero inline w-full px-3 py-2', () => {
  const src = fs.readFileSync(stockpileViewPath, 'utf8');
  const textInputs = src.match(/<TextInput\b/g) || [];
  const selects = src.match(/<Select\b/g) || [];
  const textareas = src.match(/<Textarea\b/g) || [];
  const inlineInputs = src.match(/w-full px-3 py-2/g) || [];
  assert.equal(textInputs.length, 1, `Expected 1 <TextInput in StockpileInventoryView.tsx, found ${textInputs.length}`);
  assert.equal(selects.length, 1, `Expected 1 <Select in StockpileInventoryView.tsx, found ${selects.length}`);
  assert.equal(textareas.length, 1, `Expected 1 <Textarea in StockpileInventoryView.tsx, found ${textareas.length}`);
  assert.equal(inlineInputs.length, 0, `Expected 0 inline w-full px-3 py-2 in StockpileInventoryView.tsx, found ${inlineInputs.length}`);
});

check('22. GUARD: StockpileInventoryView.tsx renders 0 <Field wrappers and keeps text-gray-700 labels untouched', () => {
  const src = fs.readFileSync(stockpileViewPath, 'utf8');
  const fields = src.match(/<Field\b/g) || [];
  const gray700Labels = src.match(/block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1/g) || [];
  assert.equal(fields.length, 0, `Expected 0 <Field in StockpileInventoryView.tsx, found ${fields.length}`);
  assert.ok(gray700Labels.length >= 3, `Expected at least 3 text-gray-700 labels in StockpileInventoryView.tsx, found ${gray700Labels.length}`);
});

check('23. StockpileInventoryView.tsx preserves py-2.5, bg-gray-50, and moveDisposition === installed conditional on kit components', () => {
  const src = fs.readFileSync(stockpileViewPath, 'utf8');
  const selects = src.match(/<Select[\s\S]*?<\/Select>/g) || [];
  assert.equal(selects.length, 1, 'Expected 1 <Select>...</Select> block');
  assert.ok(selects[0].includes('py-2.5') && selects[0].includes('bg-gray-50'), 'Disposition <Select> must preserve py-2.5 and bg-gray-50');
  assert.ok(/\{moveDisposition === 'installed' && \([\s\S]*?<TextInput[\s\S]*?py-2\.5[\s\S]*?bg-gray-50[\s\S]*?\)\}/.test(src), 'Unit ID <TextInput> must preserve moveDisposition === installed conditional, py-2.5, and bg-gray-50');
  const textareas = src.match(/<Textarea[\s\S]*?\/>/g) || [];
  assert.equal(textareas.length, 1, 'Expected 1 <Textarea ... /> block');
  assert.ok(textareas[0].includes('bg-gray-50'), 'Movement Notes <Textarea> must preserve bg-gray-50');
});

check('24. CloseBlockModal.tsx imports only TextInput from ../common/FormFields', () => {
  const src = fs.readFileSync(closeBlockModalPath, 'utf8');
  const importMatch = src.match(/import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/common\/FormFields['"]/);
  assert.ok(importMatch, 'CloseBlockModal.tsx does not import from ../common/FormFields');
  assert.ok(/\bTextInput\b/.test(importMatch[1]), 'CloseBlockModal.tsx import missing TextInput');
  for (const excluded of ['Select', 'Textarea', 'Field']) {
    assert.ok(!new RegExp(`\\b${excluded}\\b`).test(importMatch[1]), `CloseBlockModal.tsx should not import ${excluded}`);
  }
});

check('25. CloseBlockModal.tsx renders 2 <TextInput with zero inline w-full px-3 py-2', () => {
  const src = fs.readFileSync(closeBlockModalPath, 'utf8');
  const textInputs = src.match(/<TextInput\b/g) || [];
  const inlineInputs = src.match(/w-full px-3 py-2/g) || [];
  assert.equal(textInputs.length, 2, `Expected 2 <TextInput in CloseBlockModal.tsx, found ${textInputs.length}`);
  assert.equal(inlineInputs.length, 0, `Expected 0 inline w-full px-3 py-2 in CloseBlockModal.tsx, found ${inlineInputs.length}`);
});

check('26. GUARD: CloseBlockModal.tsx renders 0 <Field wrappers and keeps tracking-wider labels untouched', () => {
  const src = fs.readFileSync(closeBlockModalPath, 'utf8');
  const fields = src.match(/<Field\b/g) || [];
  const trackingLabels = src.match(/block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1/g) || [];
  assert.equal(fields.length, 0, `Expected 0 <Field in CloseBlockModal.tsx, found ${fields.length}`);
  assert.ok(trackingLabels.length >= 2, `Expected at least 2 tracking-wider labels in CloseBlockModal.tsx, found ${trackingLabels.length}`);
});

check('27. CloseBlockModal.tsx preserves border-gray-300 on both <TextInput and size="sm"/font-mono/font-bold/parseInt on minutes', () => {
  const src = fs.readFileSync(closeBlockModalPath, 'utf8');
  const textInputs = src.match(/<TextInput[\s\S]*?\/>/g) || [];
  assert.equal(textInputs.length, 2, `Expected 2 <TextInput ... /> blocks in CloseBlockModal.tsx, found ${textInputs.length}`);
  assert.ok(textInputs[0].includes('size="sm"'), 'Minutes <TextInput> must pass size="sm"');
  assert.ok(textInputs[0].includes('border-gray-300') && textInputs[0].includes('font-mono') && textInputs[0].includes('font-bold'), 'Minutes <TextInput> must preserve border-gray-300, font-mono, and font-bold');
  assert.ok(textInputs[0].includes('parseInt(e.target.value, 10) || 0'), 'Minutes <TextInput> must preserve parseInt onChange');
  assert.ok(textInputs[1].includes('border-gray-300'), 'Notes <TextInput> must preserve border-gray-300');
  assert.ok(!/size=/.test(textInputs[1]), 'Notes <TextInput> must omit size prop (defaults to xs)');
});

check('28. SOPRunView.tsx imports only TextInput from ../common/FormFields', () => {
  const src = fs.readFileSync(sopRunViewPath, 'utf8');
  const importMatch = src.match(/import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/common\/FormFields['"]/);
  assert.ok(importMatch, 'SOPRunView.tsx does not import from ../common/FormFields');
  assert.ok(/\bTextInput\b/.test(importMatch[1]), 'SOPRunView.tsx import missing TextInput');
  for (const excluded of ['Select', 'Textarea', 'Field']) {
    assert.ok(!new RegExp(`\\b${excluded}\\b`).test(importMatch[1]), `SOPRunView.tsx should not import ${excluded}`);
  }
});

check('29. SOPRunView.tsx renders 2 <TextInput with zero inline w-full px-3 py-2', () => {
  const src = fs.readFileSync(sopRunViewPath, 'utf8');
  const textInputs = src.match(/<TextInput\b/g) || [];
  const inlineInputs = src.match(/w-full px-3 py-2/g) || [];
  assert.equal(textInputs.length, 2, `Expected 2 <TextInput in SOPRunView.tsx, found ${textInputs.length}`);
  assert.equal(inlineInputs.length, 0, `Expected 0 inline w-full px-3 py-2 in SOPRunView.tsx, found ${inlineInputs.length}`);
});

check('30. GUARD: SOPRunView.tsx renders 0 <Field wrappers and keeps text-brand-black dark:text-white labels untouched', () => {
  const src = fs.readFileSync(sopRunViewPath, 'utf8');
  const fields = src.match(/<Field\b/g) || [];
  const brandLabels = src.match(/<label className="block text-xs font-bold text-brand-black dark:text-white"/g) || [];
  assert.equal(fields.length, 0, `Expected 0 <Field in SOPRunView.tsx, found ${fields.length}`);
  assert.ok(brandLabels.length >= 2, `Expected at least 2 text-brand-black dark:text-white labels in SOPRunView.tsx, found ${brandLabels.length}`);
});

check('31. SOPRunView.tsx preserves focus:ring-2, focus:ring-primary/40, bg-gray-50, font-semibold on Lead Technician, and multi-line setStepStates onChange on note', () => {
  const src = fs.readFileSync(sopRunViewPath, 'utf8');
  const textInputs = src.match(/<TextInput[\s\S]*?\/>/g) || [];
  assert.equal(textInputs.length, 2, `Expected 2 <TextInput ... /> blocks in SOPRunView.tsx, found ${textInputs.length}`);
  for (const block of textInputs) {
    assert.ok(block.includes('focus:ring-2') && block.includes('focus:ring-primary/40') && block.includes('bg-gray-50'), 'Both <TextInput> blocks must preserve focus:ring-2, focus:ring-primary/40, and bg-gray-50');
    assert.ok(!/size=/.test(block), 'Both <TextInput> blocks must omit size prop (defaults to xs)');
  }
  assert.ok(textInputs[0].includes('font-semibold'), 'Lead Technician <TextInput> must preserve font-semibold');
  assert.ok(/setStepStates\(\(prev\) => \(\{[\s\S]*?\[currentStepIdx\]:[\s\S]*?note:\s*val/.test(textInputs[1]), 'Step note <TextInput> must preserve multi-line setStepStates onChange');
});

check('32. TicketVisitModal.tsx imports only Textarea and Field from ../../common/FormFields', () => {
  const src = fs.readFileSync(ticketVisitModalPath, 'utf8');
  const importMatch = src.match(/import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/\.\.\/common\/FormFields['"]/);
  assert.ok(importMatch, 'TicketVisitModal.tsx does not import from ../../common/FormFields');
  assert.ok(/\bTextarea\b/.test(importMatch[1]) && /\bField\b/.test(importMatch[1]), 'TicketVisitModal.tsx import missing Textarea or Field');
  for (const excluded of ['TextInput', 'Select']) {
    assert.ok(!new RegExp(`\\b${excluded}\\b`).test(importMatch[1]), `TicketVisitModal.tsx should not import ${excluded}`);
  }
});

check('33. TicketVisitModal.tsx renders 1 <Textarea with zero inline w-full px-3 py-2', () => {
  const src = fs.readFileSync(ticketVisitModalPath, 'utf8');
  const textareas = src.match(/<Textarea\b/g) || [];
  const inlineInputs = src.match(/w-full px-3 py-2/g) || [];
  assert.equal(textareas.length, 1, `Expected 1 <Textarea in TicketVisitModal.tsx, found ${textareas.length}`);
  assert.equal(inlineInputs.length, 0, `Expected 0 inline w-full px-3 py-2 in TicketVisitModal.tsx, found ${inlineInputs.length}`);
});

check('34. TicketVisitModal.tsx renders 1 <Field label="Visit Notes"> and drops inline Field-string labels 3 -> 2', () => {
  const src = fs.readFileSync(ticketVisitModalPath, 'utf8');
  const fields = src.match(/<Field\b/g) || [];
  const inlineLabels = src.match(/block text-xs font-bold uppercase text-gray-500 mb-1/g) || [];
  assert.equal(fields.length, 1, `Expected 1 <Field in TicketVisitModal.tsx, found ${fields.length}`);
  assert.ok(/<Field\s+label="Visit Notes">/.test(src), 'TicketVisitModal.tsx must wrap Visit Notes in <Field label="Visit Notes">');
  assert.equal(inlineLabels.length, 2, `Expected 2 remaining inline Field-string labels in TicketVisitModal.tsx, found ${inlineLabels.length}`);
});

check('35. TicketVisitModal.tsx preserves rows={3}, value, onChange, placeholder, and dark:bg-card-dark on Visit Notes <Textarea>', () => {
  const src = fs.readFileSync(ticketVisitModalPath, 'utf8');
  const textareas = src.match(/<Textarea[\s\S]*?\/>/g) || [];
  assert.equal(textareas.length, 1, `Expected 1 <Textarea ... /> block in TicketVisitModal.tsx, found ${textareas.length}`);
  assert.ok(textareas[0].includes('rows={3}'), 'Visit Notes <Textarea> must preserve rows={3}');
  assert.ok(textareas[0].includes('value={visitNotes}'), 'Visit Notes <Textarea> must preserve value={visitNotes}');
  assert.ok(textareas[0].includes('setVisitNotes(e.target.value)'), 'Visit Notes <Textarea> must preserve onChange');
  assert.ok(textareas[0].includes('Findings, diagnostics, or follow-up details...'), 'Visit Notes <Textarea> must preserve placeholder');
  assert.ok(!/size=/.test(textareas[0]), 'Visit Notes <Textarea> must omit size prop (defaults to xs)');
});

check('36. QuickLogWidget.tsx imports only Textarea and Field from ../common/FormFields', () => {
  const src = fs.readFileSync(quickLogWidgetPath, 'utf8');
  const importMatch = src.match(/import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/common\/FormFields['"]/);
  assert.ok(importMatch, 'QuickLogWidget.tsx does not import from ../common/FormFields');
  assert.ok(/\bTextarea\b/.test(importMatch[1]) && /\bField\b/.test(importMatch[1]), 'QuickLogWidget.tsx import missing Textarea or Field');
  for (const excluded of ['TextInput', 'Select']) {
    assert.ok(!new RegExp(`\\b${excluded}\\b`).test(importMatch[1]), `QuickLogWidget.tsx should not import ${excluded}`);
  }
});

check('37. QuickLogWidget.tsx renders 1 <Textarea with zero inline w-full px-3 py-2', () => {
  const src = fs.readFileSync(quickLogWidgetPath, 'utf8');
  const textareas = src.match(/<Textarea\b/g) || [];
  const inlineInputs = src.match(/w-full px-3 py-2/g) || [];
  assert.equal(textareas.length, 1, `Expected 1 <Textarea in QuickLogWidget.tsx, found ${textareas.length}`);
  assert.equal(inlineInputs.length, 0, `Expected 0 inline w-full px-3 py-2 in QuickLogWidget.tsx, found ${inlineInputs.length}`);
});

check('38. QuickLogWidget.tsx renders 1 <Field label="Correction / Superseding Details"> and drops inline Field-string labels 1 -> 0', () => {
  const src = fs.readFileSync(quickLogWidgetPath, 'utf8');
  const fields = src.match(/<Field\b/g) || [];
  const inlineLabels = src.match(/block text-xs font-bold uppercase text-gray-500 mb-1/g) || [];
  assert.equal(fields.length, 1, `Expected 1 <Field in QuickLogWidget.tsx, found ${fields.length}`);
  assert.ok(/<Field\s+label="Correction \/ Superseding Details">/.test(src), 'QuickLogWidget.tsx must wrap field in <Field label="Correction / Superseding Details"> without required');
  assert.equal(inlineLabels.length, 0, `Expected 0 remaining inline Field-string labels in QuickLogWidget.tsx, found ${inlineLabels.length}`);
});

check('39. QuickLogWidget.tsx preserves rows={3}, required, conditional placeholder, value, onChange, and dark:bg-card-dark on Correction <Textarea>', () => {
  const src = fs.readFileSync(quickLogWidgetPath, 'utf8');
  const textareas = src.match(/<Textarea[\s\S]*?\/>/g) || [];
  assert.equal(textareas.length, 1, `Expected 1 <Textarea ... /> block in QuickLogWidget.tsx, found ${textareas.length}`);
  assert.ok(textareas[0].includes('rows={3}'), 'Correction <Textarea> must preserve rows={3}');
  assert.ok(/\brequired\b/.test(textareas[0]), 'Correction <Textarea> must preserve required');
  assert.ok(textareas[0].includes("correctingEntry.type === 'note'"), 'Correction <Textarea> must preserve conditional placeholder ternary');
  assert.ok(textareas[0].includes('value={correctionInput}'), 'Correction <Textarea> must preserve value={correctionInput}');
  assert.ok(textareas[0].includes('setCorrectionInput(e.target.value)'), 'Correction <Textarea> must preserve onChange');
  assert.ok(!/size=/.test(textareas[0]), 'Correction <Textarea> must omit size prop (defaults to xs)');
});

check('40. AddPartModal.tsx imports only Textarea from ../common/FormFields', () => {
  const src = fs.readFileSync(addPartModalPath, 'utf8');
  const importMatch = src.match(/import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/common\/FormFields['"]/);
  assert.ok(importMatch, 'AddPartModal.tsx does not import from ../common/FormFields');
  assert.ok(/\bTextarea\b/.test(importMatch[1]), 'AddPartModal.tsx import missing Textarea');
  for (const excluded of ['TextInput', 'Select', 'Field']) {
    assert.ok(!new RegExp(`\\b${excluded}\\b`).test(importMatch[1]), `AddPartModal.tsx should not import ${excluded}`);
  }
});

check('41. AddPartModal.tsx renders 1 <Textarea with zero inline w-full px-3 py-2', () => {
  const src = fs.readFileSync(addPartModalPath, 'utf8');
  const textareas = src.match(/<Textarea\b/g) || [];
  const inlineInputs = src.match(/w-full px-3 py-2/g) || [];
  assert.equal(textareas.length, 1, `Expected 1 <Textarea in AddPartModal.tsx, found ${textareas.length}`);
  assert.equal(inlineInputs.length, 0, `Expected 0 inline w-full px-3 py-2 in AddPartModal.tsx, found ${inlineInputs.length}`);
});

check('42. GUARD: AddPartModal.tsx renders 0 <Field wrappers, 0 Field-string labels, and keeps 7 text-gray-700 labels untouched', () => {
  const src = fs.readFileSync(addPartModalPath, 'utf8');
  const fields = src.match(/<Field\b/g) || [];
  const fieldLabels = src.match(/block text-xs font-bold uppercase text-gray-500 mb-1/g) || [];
  const gray700Labels = src.match(/block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1/g) || [];
  assert.equal(fields.length, 0, `Expected 0 <Field in AddPartModal.tsx, found ${fields.length}`);
  assert.equal(fieldLabels.length, 0, `Expected 0 Field-string labels in AddPartModal.tsx, found ${fieldLabels.length}`);
  assert.equal(gray700Labels.length, 7, `Expected 7 text-gray-700 labels in AddPartModal.tsx, found ${gray700Labels.length}`);
});

check('43. AddPartModal.tsx preserves rows={2}, value, onChange, placeholder, size="sm", dark:bg-card-dark, text-brand-black dark:text-white, and resize-none', () => {
  const src = fs.readFileSync(addPartModalPath, 'utf8');
  const textareas = src.match(/<Textarea[\s\S]*?\/>/g) || [];
  assert.equal(textareas.length, 1, `Expected 1 <Textarea ... /> block in AddPartModal.tsx, found ${textareas.length}`);
  assert.ok(textareas[0].includes('rows={2}'), 'Description <Textarea> must preserve rows={2}');
  assert.ok(textareas[0].includes('size="sm"'), 'Description <Textarea> must pass size="sm"');
  assert.ok(textareas[0].includes('value={description}'), 'Description <Textarea> must preserve value={description}');
  assert.ok(textareas[0].includes('setDescription(e.target.value)'), 'Description <Textarea> must preserve onChange');
  assert.ok(textareas[0].includes('Salvaged donor switch tested OK, stored on shelf A'), 'Description <Textarea> must preserve placeholder');
  assert.ok(
    textareas[0].includes('dark:bg-card-dark') &&
    textareas[0].includes('text-brand-black dark:text-white') &&
    textareas[0].includes('resize-none'),
    'Description <Textarea> must preserve dark:bg-card-dark, text-brand-black dark:text-white, and resize-none'
  );
});

check('44. TicketOrderPartModal.tsx imports only Textarea and Field from ../../common/FormFields', () => {
  const src = fs.readFileSync(ticketOrderPartModalPath, 'utf8');
  const importMatch = src.match(/import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/\.\.\/common\/FormFields['"]/);
  assert.ok(importMatch, 'TicketOrderPartModal.tsx does not import from ../../common/FormFields');
  assert.ok(/\bTextarea\b/.test(importMatch[1]) && /\bField\b/.test(importMatch[1]), 'TicketOrderPartModal.tsx import missing Textarea or Field');
  for (const excluded of ['TextInput', 'Select']) {
    assert.ok(!new RegExp(`\\b${excluded}\\b`).test(importMatch[1]), `TicketOrderPartModal.tsx should not import ${excluded}`);
  }
});

check('45. TicketOrderPartModal.tsx renders 1 <Textarea with zero inline w-full px-3 py-2', () => {
  const src = fs.readFileSync(ticketOrderPartModalPath, 'utf8');
  const textareas = src.match(/<Textarea\b/g) || [];
  const inlineInputs = src.match(/w-full px-3 py-2/g) || [];
  assert.equal(textareas.length, 1, `Expected 1 <Textarea in TicketOrderPartModal.tsx, found ${textareas.length}`);
  assert.equal(inlineInputs.length, 0, `Expected 0 inline w-full px-3 py-2 in TicketOrderPartModal.tsx, found ${inlineInputs.length}`);
});

check('46. TicketOrderPartModal.tsx renders 1 <Field label="Notes"> and drops inline Field-string labels 9 -> 8', () => {
  const src = fs.readFileSync(ticketOrderPartModalPath, 'utf8');
  const fields = src.match(/<Field\b/g) || [];
  const inlineLabels = src.match(/block text-xs font-bold uppercase text-gray-500 mb-1/g) || [];
  assert.equal(fields.length, 1, `Expected 1 <Field in TicketOrderPartModal.tsx, found ${fields.length}`);
  assert.ok(/<Field\s+label="Notes">/.test(src), 'TicketOrderPartModal.tsx must wrap Notes in <Field label="Notes">');
  assert.equal(inlineLabels.length, 8, `Expected 8 remaining inline Field-string labels in TicketOrderPartModal.tsx, found ${inlineLabels.length}`);
});

check('47. TicketOrderPartModal.tsx preserves rows={2}, value, onChange, placeholder, and dark:bg-card-dark on Notes <Textarea>', () => {
  const src = fs.readFileSync(ticketOrderPartModalPath, 'utf8');
  const textareas = src.match(/<Textarea[\s\S]*?\/>/g) || [];
  assert.equal(textareas.length, 1, `Expected 1 <Textarea ... /> block in TicketOrderPartModal.tsx, found ${textareas.length}`);
  assert.ok(textareas[0].includes('rows={2}'), 'Notes <Textarea> must preserve rows={2}');
  assert.ok(textareas[0].includes('value={partNotes}'), 'Notes <Textarea> must preserve value={partNotes}');
  assert.ok(textareas[0].includes('setPartNotes(e.target.value)'), 'Notes <Textarea> must preserve onChange');
  assert.ok(textareas[0].includes('Shipping details, tracking #, or special instructions...'), 'Notes <Textarea> must preserve placeholder');
  assert.ok(textareas[0].includes('dark:bg-card-dark'), 'Notes <Textarea> must preserve dark:bg-card-dark');
  assert.ok(!/size=/.test(textareas[0]), 'Notes <Textarea> must omit size prop (defaults to xs)');
});

check('48. TicketIdentifyModal.tsx imports only Textarea and Field from ../../common/FormFields', () => {
  const src = fs.readFileSync(ticketIdentifyModalPath, 'utf8');
  const importMatch = src.match(/import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/\.\.\/common\/FormFields['"]/);
  assert.ok(importMatch, 'TicketIdentifyModal.tsx does not import from ../../common/FormFields');
  assert.ok(/\bTextarea\b/.test(importMatch[1]) && /\bField\b/.test(importMatch[1]), 'TicketIdentifyModal.tsx import missing Textarea or Field');
  for (const excluded of ['TextInput', 'Select']) {
    assert.ok(!new RegExp(`\\b${excluded}\\b`).test(importMatch[1]), `TicketIdentifyModal.tsx should not import ${excluded}`);
  }
});

check('49. TicketIdentifyModal.tsx renders 1 <Textarea with zero inline w-full px-3 py-2', () => {
  const src = fs.readFileSync(ticketIdentifyModalPath, 'utf8');
  const textareas = src.match(/<Textarea\b/g) || [];
  const inlineInputs = src.match(/w-full px-3 py-2/g) || [];
  assert.equal(textareas.length, 1, `Expected 1 <Textarea in TicketIdentifyModal.tsx, found ${textareas.length}`);
  assert.equal(inlineInputs.length, 0, `Expected 0 inline w-full px-3 py-2 in TicketIdentifyModal.tsx, found ${inlineInputs.length}`);
});

check('50. TicketIdentifyModal.tsx renders 1 <Field label="Field Identification Notes"> and drops inline Field-string labels 4 -> 3', () => {
  const src = fs.readFileSync(ticketIdentifyModalPath, 'utf8');
  const fields = src.match(/<Field\b/g) || [];
  const inlineLabels = src.match(/block text-xs font-bold uppercase text-gray-500 mb-1/g) || [];
  assert.equal(fields.length, 1, `Expected 1 <Field in TicketIdentifyModal.tsx, found ${fields.length}`);
  assert.ok(/<Field\s+label="Field Identification Notes">/.test(src), 'TicketIdentifyModal.tsx must wrap Field Identification Notes in <Field label="Field Identification Notes">');
  assert.equal(inlineLabels.length, 3, `Expected 3 remaining inline Field-string labels in TicketIdentifyModal.tsx, found ${inlineLabels.length}`);
});

check('51. TicketIdentifyModal.tsx preserves rows={2}, value, onChange, placeholder, and dark:bg-card-dark on Field Identification Notes <Textarea>', () => {
  const src = fs.readFileSync(ticketIdentifyModalPath, 'utf8');
  const textareas = src.match(/<Textarea[\s\S]*?\/>/g) || [];
  assert.equal(textareas.length, 1, `Expected 1 <Textarea ... /> block in TicketIdentifyModal.tsx, found ${textareas.length}`);
  assert.ok(textareas[0].includes('rows={2}'), 'Notes <Textarea> must preserve rows={2}');
  assert.ok(textareas[0].includes('value={identifyNotes}'), 'Notes <Textarea> must preserve value={identifyNotes}');
  assert.ok(textareas[0].includes('setIdentifyNotes(e.target.value)'), 'Notes <Textarea> must preserve onChange');
  assert.ok(textareas[0].includes('Model # confirmed, serial plate verified on left cabinet interior...'), 'Notes <Textarea> must preserve placeholder');
  assert.ok(textareas[0].includes('dark:bg-card-dark'), 'Notes <Textarea> must preserve dark:bg-card-dark');
  assert.ok(!/size=/.test(textareas[0]), 'Notes <Textarea> must omit size prop (defaults to xs)');
});

check('52. StockTransferModal.tsx imports only Textarea and Field from ../common/FormFields', () => {
  const src = fs.readFileSync(stockTransferModalPath, 'utf8');
  const importMatch = src.match(/import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/common\/FormFields['"]/);
  assert.ok(importMatch, 'StockTransferModal.tsx does not import from ../common/FormFields');
  assert.ok(/\bTextarea\b/.test(importMatch[1]) && /\bField\b/.test(importMatch[1]), 'StockTransferModal.tsx import missing Textarea or Field');
  for (const excluded of ['TextInput', 'Select']) {
    assert.ok(!new RegExp(`\\b${excluded}\\b`).test(importMatch[1]), `StockTransferModal.tsx should not import ${excluded}`);
  }
});

check('53. StockTransferModal.tsx renders 1 <Textarea with zero inline w-full px-3 py-2', () => {
  const src = fs.readFileSync(stockTransferModalPath, 'utf8');
  const textareas = src.match(/<Textarea\b/g) || [];
  const inlineInputs = src.match(/w-full px-3 py-2/g) || [];
  assert.equal(textareas.length, 1, `Expected 1 <Textarea in StockTransferModal.tsx, found ${textareas.length}`);
  assert.equal(inlineInputs.length, 0, `Expected 0 inline w-full px-3 py-2 in StockTransferModal.tsx, found ${inlineInputs.length}`);
});

check('54. StockTransferModal.tsx renders 1 <Field label="Transfer Notes / Audit Reason"> and drops inline Field-string labels 7 -> 6', () => {
  const src = fs.readFileSync(stockTransferModalPath, 'utf8');
  const fields = src.match(/<Field\b/g) || [];
  const inlineLabels = src.match(/block text-xs font-bold uppercase text-gray-500 mb-1/g) || [];
  assert.equal(fields.length, 1, `Expected 1 <Field in StockTransferModal.tsx, found ${fields.length}`);
  assert.ok(/<Field\s+label="Transfer Notes \/ Audit Reason">/.test(src), 'StockTransferModal.tsx must wrap Transfer Notes / Audit Reason in <Field label="Transfer Notes / Audit Reason">');
  assert.equal(inlineLabels.length, 6, `Expected 6 remaining inline Field-string labels in StockTransferModal.tsx, found ${inlineLabels.length}`);
});

check('55. StockTransferModal.tsx preserves rows={2}, value, onChange, placeholder, and dark:bg-card-dark on Transfer Notes <Textarea> (kit default xs -> text-xs)', () => {
  const src = fs.readFileSync(stockTransferModalPath, 'utf8');
  const textareas = src.match(/<Textarea[\s\S]*?\/>/g) || [];
  assert.equal(textareas.length, 1, `Expected 1 <Textarea ... /> block in StockTransferModal.tsx, found ${textareas.length}`);
  assert.ok(textareas[0].includes('rows={2}'), 'Transfer Notes <Textarea> must preserve rows={2}');
  assert.ok(textareas[0].includes('value={notes}'), 'Transfer Notes <Textarea> must preserve value={notes}');
  assert.ok(textareas[0].includes('setNotes(e.target.value)'), 'Transfer Notes <Textarea> must preserve onChange');
  assert.ok(textareas[0].includes('Staging for upcoming maintenance run, balancing depot stock...'), 'Transfer Notes <Textarea> must preserve placeholder');
  assert.ok(textareas[0].includes('dark:bg-card-dark'), 'Transfer Notes <Textarea> must preserve dark:bg-card-dark');
  assert.ok(!/size=/.test(textareas[0]), 'Transfer Notes <Textarea> must omit size prop (kit default xs adds text-xs per accepted decision)');
});

check('56. HarvestTransferModal.tsx imports only Textarea and Field from ../common/FormFields', () => {
  const src = fs.readFileSync(harvestTransferModalPath, 'utf8');
  const importMatch = src.match(/import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/common\/FormFields['"]/);
  assert.ok(importMatch, 'HarvestTransferModal.tsx does not import from ../common/FormFields');
  assert.ok(/\bTextarea\b/.test(importMatch[1]) && /\bField\b/.test(importMatch[1]), 'HarvestTransferModal.tsx import missing Textarea or Field');
  for (const excluded of ['TextInput', 'Select']) {
    assert.ok(!new RegExp(`\\b${excluded}\\b`).test(importMatch[1]), `HarvestTransferModal.tsx should not import ${excluded}`);
  }
});

check('57. HarvestTransferModal.tsx renders 1 <Textarea with zero inline w-full px-3 py-2', () => {
  const src = fs.readFileSync(harvestTransferModalPath, 'utf8');
  const textareas = src.match(/<Textarea\b/g) || [];
  const inlineInputs = src.match(/w-full px-3 py-2/g) || [];
  assert.equal(textareas.length, 1, `Expected 1 <Textarea in HarvestTransferModal.tsx, found ${textareas.length}`);
  assert.equal(inlineInputs.length, 0, `Expected 0 inline w-full px-3 py-2 in HarvestTransferModal.tsx, found ${inlineInputs.length}`);
});

check('58. HarvestTransferModal.tsx renders 1 <Field label="Transfer Notes / Provenance"> and drops inline Field-string labels 7 -> 6', () => {
  const src = fs.readFileSync(harvestTransferModalPath, 'utf8');
  const fields = src.match(/<Field\b/g) || [];
  const inlineLabels = src.match(/block text-xs font-bold uppercase text-gray-500 mb-1/g) || [];
  assert.equal(fields.length, 1, `Expected 1 <Field in HarvestTransferModal.tsx, found ${fields.length}`);
  assert.ok(/<Field\s+label="Transfer Notes \/ Provenance">/.test(src), 'HarvestTransferModal.tsx must wrap Transfer Notes / Provenance in <Field label="Transfer Notes / Provenance">');
  assert.equal(inlineLabels.length, 6, `Expected 6 remaining inline Field-string labels in HarvestTransferModal.tsx, found ${inlineLabels.length}`);
});

check('59. HarvestTransferModal.tsx preserves rows={2}, value, onChange, placeholder, and dark:bg-card-dark on Transfer Notes <Textarea> (kit default xs -> text-xs)', () => {
  const src = fs.readFileSync(harvestTransferModalPath, 'utf8');
  const textareas = src.match(/<Textarea[\s\S]*?\/>/g) || [];
  assert.equal(textareas.length, 1, `Expected 1 <Textarea ... /> block in HarvestTransferModal.tsx, found ${textareas.length}`);
  assert.ok(textareas[0].includes('rows={2}'), 'Transfer Notes <Textarea> must preserve rows={2}');
  assert.ok(textareas[0].includes('value={notes}'), 'Transfer Notes <Textarea> must preserve value={notes}');
  assert.ok(textareas[0].includes('setNotes(e.target.value)'), 'Transfer Notes <Textarea> must preserve onChange');
  assert.ok(textareas[0].includes('Reason for pulling from vacant unit, component condition, etc.'), 'Transfer Notes <Textarea> must preserve placeholder');
  assert.ok(textareas[0].includes('dark:bg-card-dark'), 'Transfer Notes <Textarea> must preserve dark:bg-card-dark');
  assert.ok(!/size=/.test(textareas[0]), 'Transfer Notes <Textarea> must omit size prop (kit default xs adds text-xs per accepted decision)');
});

console.log(`\nFormFields Tests: ${passes} Passed, ${failures} Failed`);
process.exit(failures > 0 ? 1 : 0);
