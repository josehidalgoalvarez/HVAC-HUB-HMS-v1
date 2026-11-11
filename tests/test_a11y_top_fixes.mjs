/**
 * Test Suite: Accessibility Fixes Verification
 * Covers:
 * 1. Viewport meta tag allows pinch-zoom (no maximum-scale=1.0 or user-scalable=no).
 * 2. Reduced motion media query exists in index.html.
 * 3. Modal component has role="dialog", aria-modal="true", and wires aria-labelledby to title.
 * 4. Zero material-symbols glyph spans without aria-hidden="true".
 * 5. All 32 Modal call sites provide an accessible title prop.
 * 6. Zero icon-only buttons without an accessible label (aria-label).
 */

import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition, desc) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${desc}`);
  } else {
    failed++;
    console.error(`[FAIL] ${desc}`);
  }
}

console.log("=== Testing Accessibility Top Fixes ===\n");

// 1. Viewport in index.html
const indexHtml = fs.readFileSync('index.html', 'utf8');
assert(
  indexHtml.includes('content="width=device-width, initial-scale=1, viewport-fit=cover"'),
  '1.1 Viewport tag matches exact required unconstrained specification'
);
assert(
  !indexHtml.includes('user-scalable=no') && !indexHtml.includes('maximum-scale=1.0'),
  '1.2 Viewport tag has completely removed user-scalable=no and maximum-scale=1.0'
);

// 2. Reduced motion rule in index.html
assert(
  indexHtml.includes('@media (prefers-reduced-motion: reduce)'),
  '2.1 index.html contains @media (prefers-reduced-motion: reduce) block'
);
assert(
  indexHtml.includes('animation-duration: 0.01ms !important;') &&
  indexHtml.includes('transition-duration: 0.01ms !important;'),
  '2.2 Reduced motion block resets animation-duration and transition-duration to 0.01ms'
);

// 3. Modal component semantics
const modalTsx = fs.readFileSync('components/ui/Modal.tsx', 'utf8');
assert(
  modalTsx.includes('role="dialog"') && modalTsx.includes('aria-modal="true"'),
  '3.1 Modal has role="dialog" and aria-modal="true"'
);
assert(
  modalTsx.includes('aria-labelledby={title ? titleId : undefined}'),
  '3.2 Modal links aria-labelledby to titleId'
);
assert(
  modalTsx.includes("if (e.key === 'Escape')"),
  '3.3 Modal listens for Escape key to close dialog'
);
assert(
  modalTsx.includes("if (e.key === 'Tab'"),
  '3.4 Modal contains focus trap cycling inside dialog on Tab'
);

// 4. Modal call sites audit
function walkFiles(dir, exts = ['.tsx', '.jsx']) {
  let res = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist'].includes(item)) {
        res = res.concat(walkFiles(full, exts));
      }
    } else if (exts.some(e => item.endsWith(e))) {
      res.push(full);
    }
  }
  return res;
}

const allTsx = walkFiles('.');
let totalModalCallSites = 0;
let modalSitesWithTitle = 0;

for (const fpath of allTsx) {
  if (fpath.endsWith('components/ui/Modal.tsx')) continue;
  const content = fs.readFileSync(fpath, 'utf8');
  let pos = 0;
  while (true) {
    const idx = content.indexOf('<Modal', pos);
    if (idx === -1) break;

    // Find the end of this JSX tag accounting for braces/quotes
    let i = idx + 6;
    let braceDepth = 0;
    let inQuote = null;
    let tagEnd = -1;
    while (i < content.length) {
      const char = content[i];
      if (inQuote) {
        if (char === inQuote && content[i - 1] !== '\\') inQuote = null;
      } else if (char === '"' || char === "'") {
        inQuote = char;
      } else if (char === '{') {
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
      } else if (char === '>' && braceDepth === 0) {
        tagEnd = i;
        break;
      }
      i++;
    }

    if (tagEnd === -1) {
      pos = idx + 6;
      continue;
    }

    const modalTag = content.substring(idx, tagEnd + 1);
    totalModalCallSites++;
    if (modalTag.includes('title=')) {
      modalSitesWithTitle++;
    }
    pos = tagEnd + 1;
  }
}

assert(
  totalModalCallSites === 32,
  `4.1 Found exactly 32 Modal usage call sites (got ${totalModalCallSites})`
);
assert(
  modalSitesWithTitle === 32,
  `4.2 All 32 Modal usage call sites provide an accessible title prop (${modalSitesWithTitle}/32)`
);

// 5. Glyph spans without aria-hidden
let totalGlyphSpans = 0;
let glyphSpansWithoutAria = 0;

for (const fpath of allTsx) {
  const content = fs.readFileSync(fpath, 'utf8');
  const spans = content.match(/<span\s+[^>]*material-symbols[^>]*>/g) || [];
  for (const s of spans) {
    totalGlyphSpans++;
    if (!s.includes('aria-hidden')) {
      glyphSpansWithoutAria++;
    }
  }
}

assert(
  totalGlyphSpans >= 680,
  `5.1 Checked material-symbols glyph spans across codebase (total: ${totalGlyphSpans})`
);
assert(
  glyphSpansWithoutAria === 0,
  `5.2 Exactly 0 glyph spans without aria-hidden (got ${glyphSpansWithoutAria})`
);

// 6. Icon-only buttons audit
let totalButtons = 0;
let iconOnlyButtons = 0;
let unlabelledButtons = 0;

for (const fpath of allTsx) {
  const content = fs.readFileSync(fpath, 'utf8');
  let pos = 0;
  while (true) {
    const btnStart = content.indexOf('<button', pos);
    if (btnStart === -1) break;

    let i = btnStart + 7;
    let inQuote = null;
    let braceDepth = 0;
    let tagEnd = -1;
    while (i < content.length) {
      const char = content[i];
      if (inQuote) {
        if (char === inQuote && content[i - 1] !== '\\') inQuote = null;
      } else if (char === '"' || char === "'") {
        inQuote = char;
      } else if (char === '{') {
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
      } else if (char === '>' && braceDepth === 0) {
        tagEnd = i;
        break;
      }
      i++;
    }

    if (tagEnd === -1) {
      pos = btnStart + 7;
      continue;
    }

    const openTag = content.substring(btnStart, tagEnd + 1);
    const closeBtn = content.indexOf('</button>', tagEnd);
    if (closeBtn === -1) {
      pos = tagEnd + 1;
      continue;
    }

    const inner = content.substring(tagEnd + 1, closeBtn);
    pos = closeBtn + 9;
    totalButtons++;

    // Check if icon-only
    let withoutGlyphs = inner.replace(/<span[^>]*material-symbols[^>]*>.*?<\/span>/gs, '');
    withoutGlyphs = withoutGlyphs.replace(/{\s*\/\*.*?\*\/\s*}/gs, '');
    let noTags = withoutGlyphs.replace(/<[^>]+>/g, '').trim();
    noTags = noTags.replace(/\{[^{}]*\}/g, '').trim();

    if (inner.includes('material-symbols') && !noTags) {
      iconOnlyButtons++;
      const hasLabel = openTag.includes('aria-label=') || openTag.includes('aria-labelledby=') || openTag.includes('title=');
      if (!hasLabel) {
        unlabelledButtons++;
      }
    }
  }
}

assert(
  totalButtons >= 371,
  `6.1 Total buttons parsed across codebase matches expected >= 371 (got ${totalButtons})`
);
assert(
  iconOnlyButtons === 129,
  `6.2 Identified all 129 icon-only buttons`
);
assert(
  unlabelledButtons === 0,
  `6.3 Exactly 0 unlabelled icon-only buttons remain (all 129 have accessible names)`
);

// 7. Accessibility Second Pass: Contrast Ratios, Text Floor, and Camera Row Button
function relLum(hex) {
  hex = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.substr(i, 2), 16) / 255);
  const f = val => val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(h1, h2) {
  const l1 = relLum(h1);
  const l2 = relLum(h2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const redMatch = indexHtml.match(/"brand-red":\s*"(#?[0-9A-Fa-f]+)"/);
const orangeMatch = indexHtml.match(/"brand-orange":\s*"(#?[0-9A-Fa-f]+)"/);

const redHex = redMatch ? redMatch[1] : '';
const orangeHex = orangeMatch ? orangeMatch[1] : '';

const redContrast = contrast(redHex, '#FFFFFF');
const orangeContrast = contrast(orangeHex, '#FFFFFF');

assert(
  redContrast >= 4.5,
  `7.1 brand-red (${redHex}) contrast on white is >= 4.5:1 (got ${redContrast.toFixed(2)}:1)`
);
assert(
  orangeContrast >= 4.5,
  `7.2 brand-orange (${orangeHex}) contrast on white is >= 4.5:1 (got ${orangeContrast.toFixed(2)}:1)`
);

// 8. RatingPlateForm camera row is a <button type="button">
const ratingPlateSrc = fs.readFileSync('components/appliances/common/RatingPlateForm.tsx', 'utf8');
assert(
  ratingPlateSrc.includes('<button type="button" onClick={handleCameraClick}'),
  '8.1 RatingPlateForm camera row is converted from div to button type="button"'
);
assert(
  ratingPlateSrc.includes('Rating Plate Image'),
  '8.2 RatingPlateForm camera button contains visible text label Rating Plate Image'
);

// 9. Sub-12px text floor: exactly 0 text-[10px] remain across components
let remainingP10 = 0;
for (const f of allTsx) {
  const fileContent = fs.readFileSync(f, 'utf8');
  const matches = fileContent.match(/text-\[10px\]/g);
  if (matches) remainingP10 += matches.length;
}
assert(
  remainingP10 === 0,
  `9.1 Zero sub-12px text-[10px] classes remain across components (got ${remainingP10})`
);

console.log(`\n=========================================`);
console.log(`Accessibility Tests: ${passed} Passed, ${failed} Failed`);
console.log(`=========================================`);

if (failed > 0) {
  process.exit(1);
}
