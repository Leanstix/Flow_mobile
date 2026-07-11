import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SIZE = 1024;
const COLORS = {
  navy: [11, 20, 55, 255],
  blue: [48, 87, 213, 255],
  violet: [122, 90, 248, 255],
  white: [255, 255, 255, 255],
  transparent: [0, 0, 0, 0],
};

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function createCanvas(background) {
  const pixels = new Uint8Array(SIZE * SIZE * 4);
  for (let offset = 0; offset < pixels.length; offset += 4) pixels.set(background, offset);
  return pixels;
}

function setPixel(pixels, x, y, color) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  pixels.set(color, (y * SIZE + x) * 4);
}

function fillRect(pixels, x, y, width, height, color) {
  const minX = Math.max(0, Math.floor(x));
  const minY = Math.max(0, Math.floor(y));
  const maxX = Math.min(SIZE, Math.ceil(x + width));
  const maxY = Math.min(SIZE, Math.ceil(y + height));
  for (let py = minY; py < maxY; py += 1) {
    for (let px = minX; px < maxX; px += 1) setPixel(pixels, px, py, color);
  }
}

function fillCircle(pixels, centerX, centerY, radius, color) {
  const radiusSquared = radius * radius;
  for (let y = Math.max(0, centerY - radius); y < Math.min(SIZE, centerY + radius); y += 1) {
    for (let x = Math.max(0, centerX - radius); x < Math.min(SIZE, centerX + radius); x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      if (dx * dx + dy * dy <= radiusSquared) setPixel(pixels, x, y, color);
    }
  }
}

function fillRoundedRect(pixels, x, y, width, height, radius, color) {
  fillRect(pixels, x + radius, y, width - radius * 2, height, color);
  fillRect(pixels, x, y + radius, width, height - radius * 2, color);
  fillCircle(pixels, x + radius, y + radius, radius, color);
  fillCircle(pixels, x + width - radius, y + radius, radius, color);
  fillCircle(pixels, x + radius, y + height - radius, radius, color);
  fillCircle(pixels, x + width - radius, y + height - radius, radius, color);
}

function drawFlowMark(pixels, scale = 1, offsetX = 0, offsetY = 0) {
  const sx = (value) => Math.round(offsetX + value * scale);
  const sy = (value) => Math.round(offsetY + value * scale);
  const ss = (value) => Math.round(value * scale);

  fillRoundedRect(pixels, sx(212), sy(172), ss(600), ss(600), ss(150), COLORS.blue);
  fillCircle(pixels, sx(735), sy(245), ss(95), COLORS.violet);

  // Speech-bubble tail.
  for (let row = 0; row < ss(130); row += 1) {
    const width = Math.max(1, Math.round(ss(180) * (1 - row / ss(130))));
    fillRect(pixels, sx(335), sy(740) + row, width, 1, COLORS.blue);
  }

  // Geometric F avoids font-dependent rendering in CI.
  fillRoundedRect(pixels, sx(390), sy(292), ss(92), ss(350), ss(24), COLORS.white);
  fillRoundedRect(pixels, sx(430), sy(292), ss(230), ss(92), ss(24), COLORS.white);
  fillRoundedRect(pixels, sx(430), sy(438), ss(178), ss(82), ss(22), COLORS.white);
}

function encodePng(pixels, filePath) {
  const scanlines = Buffer.alloc((SIZE * 4 + 1) * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    const rowStart = y * (SIZE * 4 + 1);
    scanlines[rowStart] = 0; // PNG filter type 0: None.
    Buffer.from(pixels.buffer, pixels.byteOffset + y * SIZE * 4, SIZE * 4).copy(scanlines, rowStart + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // no interlace

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(scanlines, { level: 9 })),
    chunk('IEND'),
  ]);

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, png);
}

const assetDirectory = resolve('assets/images');

const icon = createCanvas(COLORS.navy);
drawFlowMark(icon);
encodePng(icon, resolve(assetDirectory, 'icon.png'));

const adaptiveForeground = createCanvas(COLORS.transparent);
drawFlowMark(adaptiveForeground);
encodePng(adaptiveForeground, resolve(assetDirectory, 'android-icon-foreground.png'));

const splash = createCanvas(COLORS.transparent);
drawFlowMark(splash, 0.82, 92, 88);
encodePng(splash, resolve(assetDirectory, 'splash-icon.png'));

console.log('Generated 1024x1024 RGBA, non-interlaced PNG assets using filter type 0.');
