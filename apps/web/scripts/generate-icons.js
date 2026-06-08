const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const BLUE = '#2563eb';
const BLUE_DARK = '#1d4ed8';

function createPlaceholderPNG(size) {
  const canvasModule = (() => {
    try { return require('canvas'); } catch {}
    try { return require('@napi-rs/canvas'); } catch {}
    return null;
  })();

  if (canvasModule) {
    const { createCanvas } = canvasModule;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, BLUE);
    gradient.addColorStop(1, BLUE_DARK);
    ctx.fillStyle = gradient;
    const radius = size * 0.1875;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();

    const cx = size / 2;
    const cy = size * 0.55;

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = size * 0.047;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.12, size * 0.135, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.12, size * 0.07, 0, Math.PI * 2);
    ctx.fill();

    return canvas.toBuffer('image/png');
  }

  return null;
}

function createMaskablePNG(size) {
  const canvasModule = (() => {
    try { return require('canvas'); } catch {}
    try { return require('@napi-rs/canvas'); } catch {}
    return null;
  })();

  if (!canvasModule) return null;

  const { createCanvas } = canvasModule;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const safeZone = size * 0.8;
  const offset = (size - safeZone) / 2;

  const gradient = ctx.createLinearGradient(offset, offset, offset + safeZone, offset + safeZone);
  gradient.addColorStop(0, BLUE);
  gradient.addColorStop(1, BLUE_DARK);
  ctx.fillStyle = gradient;
  const radius = safeZone * 0.1875;
  ctx.beginPath();
  ctx.moveTo(offset + radius, offset);
  ctx.lineTo(offset + safeZone - radius, offset);
  ctx.quadraticCurveTo(offset + safeZone, offset, offset + safeZone, offset + radius);
  ctx.lineTo(offset + safeZone, offset + safeZone - radius);
  ctx.quadraticCurveTo(offset + safeZone, offset + safeZone, offset + safeZone - radius, offset + safeZone);
  ctx.lineTo(offset + radius, offset + safeZone);
  ctx.quadraticCurveTo(offset, offset + safeZone, offset, offset + safeZone - radius);
  ctx.lineTo(offset, offset + radius);
  ctx.quadraticCurveTo(offset, offset, offset + radius, offset);
  ctx.closePath();
  ctx.fill();

  const cx = size / 2;
  const cy = size * 0.52;

  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = safeZone * 0.047;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy - safeZone * 0.08, safeZone * 0.135, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy - safeZone * 0.08, safeZone * 0.07, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toBuffer('image/png');
}

const icons = [
  { name: 'icon-192.png', generator: createPlaceholderPNG, size: 192 },
  { name: 'icon-512.png', generator: createPlaceholderPNG, size: 512 },
  { name: 'icon-maskable-192.png', generator: createMaskablePNG, size: 192 },
  { name: 'icon-maskable-512.png', generator: createMaskablePNG, size: 512 },
];

const generated = [];
const skipped = [];

for (const icon of icons) {
  const filePath = path.join(ICONS_DIR, icon.name);
  const buffer = icon.generator(icon.size);

  if (buffer) {
    fs.writeFileSync(filePath, buffer);
    generated.push(icon.name);
  } else {
    skipped.push(icon.name);
  }
}

if (generated.length > 0) {
  console.log(`Generated PNG icons: ${generated.join(', ')}`);
}

if (skipped.length > 0) {
  console.log(`Skipped (no canvas module available): ${skipped.join(', ')}`);
  console.log('Install a canvas module to generate PNG icons:');
  console.log('  npm install canvas');
  console.log('  OR');
  console.log('  npm install @napi-rs/canvas');
  console.log('');
  console.log('For now, the SVG icon at public/icons/icon.svg will be used as a fallback.');
}

console.log('Done.');
