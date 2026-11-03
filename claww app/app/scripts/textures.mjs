// Generates the two tiling textures for the NG design system (build plan 5.3):
//   assets/textures/noise-256.png  white grain, 256 x 256, low alpha (Surface, TintTile)
//   assets/textures/lines-64.png   thin diagonal lines, 64 x 64 (Hero)
// Deterministic (seeded), dependency-free (Node's zlib), and small: budget is 60 KB for both.
// Run: node scripts/textures.mjs

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'textures');

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Grey + alpha PNG (colour type 4, 8-bit). `pixel(x, y)` returns [grey, alpha]. */
function png(width, height, pixel) {
  const raw = Buffer.alloc((width * 2 + 1) * height);
  let i = 0;
  for (let y = 0; y < height; y++) {
    raw[i++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [g, a] = pixel(x, y);
      raw[i++] = g;
      raw[i++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 4; // grey + alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// mulberry32: tiny seeded PRNG so the grain is identical on every run.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Grain: four alpha levels averaging about 8 %, so it compresses well. The component
// sets the overall strength with `opacity`, so this only needs to be the pattern.
const ALPHA_LEVELS = [0, 10, 22, 40];
const rand = rng(20261103);
const noise = png(256, 256, () => {
  const r = rand();
  const level = r < 0.5 ? 0 : r < 0.8 ? 1 : r < 0.95 ? 2 : 3;
  return [255, ALPHA_LEVELS[level]];
});

// Lines: a 1 px diagonal every 8 px (top-left to bottom-right), tiles seamlessly at 64.
const lines = png(64, 64, (x, y) => [255, (x + y) % 8 === 0 ? 70 : 0]);

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'noise-256.png'), noise);
writeFileSync(join(OUT, 'lines-64.png'), lines);

const sizes = ['noise-256.png', 'lines-64.png'].map((f) => [f, statSync(join(OUT, f)).size]);
const total = sizes.reduce((s, [, n]) => s + n, 0);
for (const [f, n] of sizes) console.log(`${f}: ${(n / 1024).toFixed(1)} KB`);
console.log(`total: ${(total / 1024).toFixed(1)} KB (budget 60 KB)`);
if (total > 60 * 1024) {
  console.error('Over the 60 KB texture budget.');
  process.exit(1);
}
