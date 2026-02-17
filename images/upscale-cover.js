#!/usr/bin/env node
/**
 * Upscale cover to KDP dimensions and convert to JPG
 * 
 * KDP Kindle eBook cover requirements:
 *   - Format: JPG or TIFF
 *   - Minimum: 625 x 1000 pixels
 *   - Ideal: 2560 x 1600 pixels  
 *   - Maximum: 10,000 x 10,000 pixels
 *   - Aspect ratio: 1.6:1 (height:width)
 *   - DPI: 300 recommended
 *   - Color: sRGB
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = path.resolve(__dirname, 'cover', 'cover-front.png');
const DEST_DIR = path.resolve(__dirname, '..', 'dist', 'kdp');
const DEST_JPG = path.join(DEST_DIR, 'cover-front.jpg');
const DEST_PNG_UPSCALED = path.join(__dirname, 'cover', 'cover-front-hd.png');

// KDP ideal cover dimensions (1.6:1 ratio)
const TARGET_WIDTH = 2560;
const TARGET_HEIGHT = Math.round(TARGET_WIDTH * 1.6); // 4096

async function main() {
  console.log('');
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Cover Upscaler — KDP Ready');
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  if (!fs.existsSync(SOURCE)) {
    console.error(`  ✗ Source not found: ${SOURCE}`);
    process.exit(1);
  }

  const meta = await sharp(SOURCE).metadata();
  console.log(`  Source: ${meta.width}×${meta.height} ${meta.format}`);
  console.log(`  Target: ${TARGET_WIDTH}×${TARGET_HEIGHT} JPG`);
  console.log('');

  // Ensure output dirs exist
  if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
  }

  // Upscale using Lanczos3 (best quality for upscaling)
  // First resize to target, then apply mild sharpening to compensate for upscale softness
  const pipeline = sharp(SOURCE)
    .resize(TARGET_WIDTH, TARGET_HEIGHT, {
      kernel: sharp.kernel.lanczos3,
      fit: 'cover',
      position: 'centre',
    })
    .sharpen({
      sigma: 1.2,
      m1: 1.0,
      m2: 0.5,
    });

  // Save upscaled PNG (archive copy)
  await pipeline.clone().png().toFile(DEST_PNG_UPSCALED);
  const pngSize = fs.statSync(DEST_PNG_UPSCALED).size;
  console.log(`  ✓ HD PNG: ${(pngSize / 1024).toFixed(0)} KB → ${DEST_PNG_UPSCALED}`);

  // Save JPG for KDP (high quality, sRGB)
  await pipeline.clone()
    .jpeg({
      quality: 95,
      chromaSubsampling: '4:4:4',
      mozjpeg: true,
    })
    .withMetadata({
      density: 300, // 300 DPI
    })
    .toFile(DEST_JPG);

  const jpgSize = fs.statSync(DEST_JPG).size;
  console.log(`  ✓ KDP JPG: ${(jpgSize / 1024).toFixed(0)} KB → ${DEST_JPG}`);

  // Verify output
  const outMeta = await sharp(DEST_JPG).metadata();
  console.log('');
  console.log(`  Output: ${outMeta.width}×${outMeta.height} ${outMeta.format}`);
  console.log(`  DPI: ${outMeta.density || 'default'}`);
  console.log(`  Color: ${outMeta.space}`);
  console.log('');

  // KDP validation
  const ok = outMeta.width >= 625 && outMeta.height >= 1000;
  const ideal = outMeta.width >= 2560;
  console.log(`  KDP minimum (625×1000): ${ok ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  KDP ideal (2560+): ${ideal ? '✓ PASS' : '○ Below ideal'}`);
  console.log('');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
