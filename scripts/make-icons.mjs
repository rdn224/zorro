// Generates the app icons (a simple pizza on a red background) as PNG files.
import { deflateSync, crc32 } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const outDir = new URL('../public/icons/', import.meta.url);
mkdirSync(outDir, { recursive: true });

const BG = [192, 57, 43];
const CRUST = [222, 160, 70];
const CHEESE = [250, 214, 110];
const PEPPERONI = [170, 35, 30];
const DOTS = [
  [0, 0], [0.17, -0.13], [-0.16, -0.15], [-0.19, 0.11], [0.05, 0.2], [0.21, 0.1], [0.0, -0.24],
];

function pixel(x, y) {
  // x, y in [-0.5, 0.5]
  const r = Math.hypot(x, y);
  if (r > 0.4) return BG;
  if (r > 0.34) return CRUST;
  for (const [dx, dy] of DOTS) if (Math.hypot(x - dx, y - dy) < 0.055) return PEPPERONI;
  return CHEESE;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

function png(size) {
  const ss = 3; // supersampling for smooth edges
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let py = 0; py < size; py++) {
    const row = py * (size * 3 + 1);
    for (let px = 0; px < size; px++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < ss; sy++)
        for (let sx = 0; sx < ss; sx++) {
          const c = pixel((px + (sx + 0.5) / ss) / size - 0.5, (py + (sy + 0.5) / ss) / size - 0.5);
          acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
        }
      for (let i = 0; i < 3; i++) raw[row + 1 + px * 3 + i] = Math.round(acc[i] / (ss * ss));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(new URL(name, outDir), png(size));
  console.log('wrote', name);
}
