// Regenerates raster brand assets from public/logo.svg and public/icon.svg.
// Run with: bun scripts/generate-brand-assets.ts
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const logo = readFileSync('public/logo.svg');
const icon = readFileSync('public/icon.svg');

const render = (svg: Buffer, size: number, background?: string) => {
  const image = sharp(svg, { density: 384 }).resize(size, size);
  return (background ? image.flatten({ background }) : image).png().toBuffer();
};

// ICO container holding PNG frames (supported by every modern browser).
const toIco = (frames: { size: number; data: Buffer }[]) => {
  const header = Buffer.alloc(6 + frames.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  for (const [i, { size, data }] of frames.entries()) {
    const entry = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  }
  return Buffer.concat([header, ...frames.map((f) => f.data)]);
};

const outputs: [string, Promise<Buffer>][] = [
  ['public/logo.png', render(logo, 512)],
  ['public/android-chrome-512x512.png', render(logo, 512)],
  ['public/android-chrome-192x192.png', render(logo, 192)],
  // iOS fills transparency with black, so give it a white tile.
  ['public/apple-touch-icon.png', render(logo, 180, '#ffffff')],
  ['public/favicon-32x32.png', render(icon, 32)],
  ['public/favicon-16x16.png', render(icon, 16)],
];

for (const [path, buffer] of outputs) {
  writeFileSync(path, await buffer);
}

const frames = await Promise.all(
  [16, 32, 48].map(async (size) => ({ size, data: await render(icon, size) }))
);
writeFileSync('public/favicon.ico', toIco(frames));

