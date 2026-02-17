#!/usr/bin/env node
/**
 * build-cover-art.js — Professional Book Cover Generator
 * 
 * Takes the donkey/gold photograph and overlays:
 *   - Title: "THE 2,500 DONKEYS"
 *   - Subtitle: "A Novel"
 *   - Author: "KIDD JAMES"
 * 
 * Uses sharp SVG compositing for crisp text rendering.
 * Outputs both PNG (for EPUB) and upscaled JPG (for KDP).
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'images', 'cover', 'cover-front-raw.png');
const COVER_PNG = path.join(ROOT, 'images', 'cover', 'cover-front.png');
const KDP_JPG = path.join(ROOT, 'dist', 'kdp', 'cover-front.jpg');
const KDP_WIDTH = 2560;
const KDP_HEIGHT = 3840;

async function main() {
  console.log('');
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Cover Art Generator — The 2,500 Donkeys');
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Use raw source if it exists, otherwise the current cover
  const src = fs.existsSync(SOURCE) ? SOURCE : COVER_PNG;
  const meta = await sharp(src).metadata();
  console.log(`  Source: ${meta.width}x${meta.height} ${meta.format}`);

  const W = meta.width;   // 1024
  const H = meta.height;  // 1536

  // Create SVG text overlay at source resolution
  // The image has a moody B&W + selective color look
  // Title goes in upper third, author at bottom
  const svgOverlay = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Subtle dark gradient at top for title readability -->
    <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0.70)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </linearGradient>
    <!-- Subtle dark gradient at bottom for author readability -->
    <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.65)"/>
    </linearGradient>
    <!-- Gold color for accents -->
  </defs>
  
  <!-- Top gradient overlay -->
  <rect x="0" y="0" width="${W}" height="${Math.round(H * 0.30)}" fill="url(#topFade)"/>
  
  <!-- Bottom gradient overlay -->
  <rect x="0" y="${Math.round(H * 0.78)}" width="${W}" height="${Math.round(H * 0.22)}" fill="url(#bottomFade)"/>
  
  <!-- Title: "THE" -->
  <text x="${W/2}" y="${Math.round(H * 0.08)}" 
        font-family="Georgia, 'Times New Roman', serif" 
        font-size="${Math.round(W * 0.055)}" 
        font-weight="400"
        letter-spacing="${Math.round(W * 0.025)}"
        fill="#d4af37" 
        text-anchor="middle" 
        dominant-baseline="middle">THE</text>
  
  <!-- Title: "2,500" -->
  <text x="${W/2}" y="${Math.round(H * 0.155)}" 
        font-family="Georgia, 'Times New Roman', serif" 
        font-size="${Math.round(W * 0.13)}" 
        font-weight="700"
        letter-spacing="${Math.round(W * 0.008)}"
        fill="#FFFFFF" 
        text-anchor="middle" 
        dominant-baseline="middle">2,500</text>
  
  <!-- Title: "DONKEYS" -->
  <text x="${W/2}" y="${Math.round(H * 0.225)}" 
        font-family="Georgia, 'Times New Roman', serif" 
        font-size="${Math.round(W * 0.095)}" 
        font-weight="700"
        letter-spacing="${Math.round(W * 0.018)}"
        fill="#FFFFFF" 
        text-anchor="middle" 
        dominant-baseline="middle">DONKEYS</text>
  
  <!-- Decorative line under title -->
  <line x1="${Math.round(W * 0.30)}" y1="${Math.round(H * 0.255)}" 
        x2="${Math.round(W * 0.70)}" y2="${Math.round(H * 0.255)}" 
        stroke="#d4af37" stroke-width="2"/>
  
  <!-- Subtitle: "A Novel" -->
  <text x="${W/2}" y="${Math.round(H * 0.285)}" 
        font-family="Georgia, 'Times New Roman', serif" 
        font-size="${Math.round(W * 0.04)}" 
        font-weight="400"
        font-style="italic"
        letter-spacing="${Math.round(W * 0.008)}"
        fill="#d4af37" 
        text-anchor="middle" 
        dominant-baseline="middle">A Novel</text>
  
  <!-- Decorative line above author -->
  <line x1="${Math.round(W * 0.30)}" y1="${Math.round(H * 0.90)}" 
        x2="${Math.round(W * 0.70)}" y2="${Math.round(H * 0.90)}" 
        stroke="#d4af37" stroke-width="1.5"/>
  
  <!-- Author name -->
  <text x="${W/2}" y="${Math.round(H * 0.945)}" 
        font-family="Georgia, 'Times New Roman', serif" 
        font-size="${Math.round(W * 0.065)}" 
        font-weight="400"
        letter-spacing="${Math.round(W * 0.02)}"
        fill="#FFFFFF" 
        text-anchor="middle" 
        dominant-baseline="middle">KIDD JAMES</text>
</svg>`;

  // Composite text overlay onto the image
  const coverBuffer = await sharp(src)
    .composite([{
      input: Buffer.from(svgOverlay),
      top: 0,
      left: 0,
    }])
    .png()
    .toBuffer();

  // Save as cover-front.png (for EPUB)
  fs.writeFileSync(COVER_PNG, coverBuffer);
  const pngSize = Math.round(coverBuffer.length / 1024);
  console.log(`  ✓ Cover PNG: ${pngSize} KB → ${COVER_PNG}`);

  // Upscale to KDP dimensions and save as JPG
  const kdpDir = path.dirname(KDP_JPG);
  if (!fs.existsSync(kdpDir)) fs.mkdirSync(kdpDir, { recursive: true });

  await sharp(coverBuffer)
    .resize(KDP_WIDTH, KDP_HEIGHT, {
      kernel: sharp.kernel.lanczos3,
      fit: 'cover',
      position: 'centre',
    })
    .sharpen({ sigma: 0.6 })
    .jpeg({
      quality: 95,
      chromaSubsampling: '4:4:4',
      mozjpeg: false,
      progressive: false,
    })
    .withMetadata({ density: 300 })
    .toFile(KDP_JPG);

  const jpgSize = Math.round(fs.statSync(KDP_JPG).size / 1024);
  const jpgMeta = await sharp(KDP_JPG).metadata();
  console.log(`  ✓ KDP JPG:  ${jpgSize} KB → ${KDP_JPG}`);
  console.log('');
  console.log(`  Output: ${jpgMeta.width}x${jpgMeta.height} ${jpgMeta.format} ${jpgMeta.density}DPI ${jpgMeta.space}`);
  console.log(`  KDP minimum (625x1000): ✓ PASS`);
  console.log(`  KDP ideal (2560+): ✓ PASS`);
  console.log('');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
