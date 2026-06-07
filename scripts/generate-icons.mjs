// Generates PWA icons (192, 512, 512 maskable, 180 apple-touch) from
// public/favicon.svg. Run with: npm run generate:icons
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const srcSvg = readFileSync(resolve(root, 'public/favicon.svg'), 'utf8');
const iconsDir = resolve(root, 'public/icons');
mkdirSync(iconsDir, { recursive: true });

// Maskable variant: solid background fills full canvas (no rounded corners),
// content sits inside a ~80% safe zone so iOS / Android can crop freely.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6366f1"/>
      <stop offset="1" stop-color="#4338ca"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(64 64) scale(0.75)">
    <path d="M150 270l70 70 145-160" stroke="#fff" stroke-width="56" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
</svg>`;

function render(svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
  });
  return resvg.render().asPng();
}

const targets = [
  { name: 'icon-192.png', size: 192, svg: srcSvg },
  { name: 'icon-512.png', size: 512, svg: srcSvg },
  { name: 'icon-512-maskable.png', size: 512, svg: maskableSvg },
  { name: 'apple-touch-icon.png', size: 180, svg: srcSvg },
];

for (const t of targets) {
  const out = render(t.svg, t.size);
  writeFileSync(resolve(iconsDir, t.name), out);
  console.log(`✓ ${t.name} (${t.size}×${t.size}, ${out.length} bytes)`);
}
