const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const outDir = path.resolve(__dirname, '../public/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// CRC32 implementation
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * Generate a clean, crisp PNG icon for HVACHome
 * Base color: Technician Blue #0077B6 (0, 119, 182)
 * Features: Outer rounded squircle/circle, HVAC flame/cooling cross-flow crest & gear emblem
 */
function generatePng(size, isMaskable = false) {
  const width = size;
  const height = size;
  const buffer = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;

  const bgR = 0, bgG = 119, bgB = 182; // #0077B6 Technician Blue
  const center = size / 2;
  const scale = isMaskable ? 0.72 : 0.88; // Maskable requires 10-20% safe zone padding

  for (let y = 0; y < height; y++) {
    buffer[offset++] = 0; // Filter byte: None
    for (let x = 0; x < width; x++) {
      const dx = (x - center) / (size / 2);
      const dy = (y - center) / (size / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = bgR, g = bgG, b = bgB, a = 255;

      if (!isMaskable) {
        // Squircle / rounded rectangle with radius 0.22
        const cornerRadius = 0.35;
        const qx = Math.max(0, Math.abs(dx) - (1 - cornerRadius));
        const qy = Math.max(0, Math.abs(dy) - (1 - cornerRadius));
        const cornerDist = Math.sqrt(qx * qx + qy * qy);
        if (cornerDist > cornerRadius) {
          a = 0; // Transparent outside rounded corner
        }
      }

      if (a > 0) {
        // Internal icon graphics:
        // Central HVAC Home crest:
        // Outer circular ring
        const ringDist = Math.abs(dist - (0.68 * scale));
        const inOuterRing = ringDist < (0.04 * scale);

        // House roof peak: triangle pointing up at top
        const roofY = dy / scale;
        const roofX = dx / scale;
        const inRoof = roofY > -0.55 && roofY < -0.15 && Math.abs(roofX) < (roofY + 0.55) * 0.9 && Math.abs(roofX) > (roofY + 0.55) * 0.7;

        // Snowflake & flame stylized HVAC emblem:
        // Left pillar (cool): vertical bar
        const inLeftCol = Math.abs(dx - (-0.26 * scale)) < (0.06 * scale) && Math.abs(dy) < (0.32 * scale);
        // Right pillar (heat): vertical bar
        const inRightCol = Math.abs(dx - (0.26 * scale)) < (0.06 * scale) && Math.abs(dy) < (0.32 * scale);
        // Center cross beam
        const inCrossBar = Math.abs(dy) < (0.055 * scale) && Math.abs(dx) < (0.26 * scale);

        // Center cooling star / snowflake hub
        const inCenterHub = dist < (0.13 * scale);
        // Diagonals for snowflake
        const inDiag1 = Math.abs(dx - dy) < (0.04 * scale) && dist < (0.35 * scale);
        const inDiag2 = Math.abs(dx + dy) < (0.04 * scale) && dist < (0.35 * scale);

        if (inOuterRing || inRoof || inLeftCol || inRightCol || inCrossBar || inCenterHub || inDiag1 || inDiag2) {
          r = 255; g = 255; b = 255; // Crisp White
        }
      }

      buffer[offset++] = r;
      buffer[offset++] = g;
      buffer[offset++] = b;
      buffer[offset++] = a;
    }
  }

  const deflated = zlib.deflateSync(buffer, { level: 9 });

  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflated),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// Generate PWA icons
console.log('Generating PWA Icons...');

const sizes = [
  { file: 'pwa-192x192.png', size: 192, maskable: false },
  { file: 'pwa-512x512.png', size: 512, maskable: false },
  { file: 'maskable-icon-512x512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon-180x180.png', size: 180, maskable: false },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
];

for (const s of sizes) {
  const png = generatePng(s.size, s.maskable);
  const target = path.join(outDir, s.file);
  fs.writeFileSync(target, png);
  console.log(`✓ Created ${s.file} (${s.size}x${s.size}) - ${png.length} bytes`);
}

// Also create vector SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <rect width="512" height="512" rx="128" fill="#0077B6"/>
  <!-- Outer Crest Ring -->
  <circle cx="256" cy="256" r="180" fill="none" stroke="#FFFFFF" stroke-width="24" stroke-opacity="0.95"/>
  <!-- Roof / House Gable -->
  <path d="M 170 190 L 256 115 L 342 190" fill="none" stroke="#FFFFFF" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- HVAC Snowflake / Flame Cross Structure -->
  <line x1="180" y1="180" x2="180" y2="340" stroke="#FFFFFF" stroke-width="32" stroke-linecap="round"/>
  <line x1="332" y1="180" x2="332" y2="340" stroke="#FFFFFF" stroke-width="32" stroke-linecap="round"/>
  <line x1="180" y1="260" x2="332" y2="260" stroke="#FFFFFF" stroke-width="30" stroke-linecap="round"/>
  <line x1="200" y1="200" x2="312" y2="312" stroke="#FFFFFF" stroke-width="20" stroke-linecap="round"/>
  <line x1="312" y1="200" x2="200" y2="312" stroke="#FFFFFF" stroke-width="20" stroke-linecap="round"/>
  <circle cx="256" cy="260" r="32" fill="#FFFFFF"/>
  <circle cx="256" cy="260" r="14" fill="#0077B6"/>
</svg>`;

fs.writeFileSync(path.join(outDir, 'favicon.svg'), svgContent, 'utf8');
fs.writeFileSync(path.resolve(__dirname, '../public/favicon.svg'), svgContent, 'utf8');
console.log('✓ Created favicon.svg in public/ and public/icons/');
