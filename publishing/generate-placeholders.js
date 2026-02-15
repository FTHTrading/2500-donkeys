/**
 * generate-placeholders.js — Create placeholder images for book layout
 *
 * Generates simple SVG placeholder images for each chapter opener
 * and the cover. These are used during typesetting development
 * and will be replaced with real illustrations before final export.
 *
 * Usage: node publishing/generate-placeholders.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const IMAGES_DIR = path.join(ROOT, "images");
const PROMPTS_FILE = path.join(IMAGES_DIR, "image-prompts.json");

function createPlaceholderSVG(title, arc, width, height) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <pattern id="grain" patternUnits="userSpaceOnUse" width="4" height="4">
      <rect width="4" height="4" fill="#1a1a2e"/>
      <rect x="1" y="1" width="1" height="1" fill="#222" opacity="0.3"/>
      <rect x="3" y="0" width="1" height="1" fill="#333" opacity="0.2"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grain)"/>
  <rect x="10%" y="10%" width="80%" height="80%" fill="none" stroke="#c9a84c" stroke-width="2" stroke-dasharray="8,4" opacity="0.4"/>
  <text x="50%" y="40%" text-anchor="middle" font-family="Georgia, serif" font-size="${Math.floor(height / 15)}" fill="#c9a84c" opacity="0.8">${arc}</text>
  <text x="50%" y="55%" text-anchor="middle" font-family="Georgia, serif" font-size="${Math.floor(height / 25)}" fill="#888" opacity="0.6">${title}</text>
  <text x="50%" y="75%" text-anchor="middle" font-family="monospace" font-size="${Math.floor(height / 35)}" fill="#555" opacity="0.4">[PLACEHOLDER — Replace with illustration]</text>
  <text x="50%" y="82%" text-anchor="middle" font-family="monospace" font-size="${Math.floor(height / 40)}" fill="#555" opacity="0.3">${width}×${height}</text>
</svg>`;
}

function generate() {
  const prompts = JSON.parse(fs.readFileSync(PROMPTS_FILE, "utf-8"));

  let count = 0;

  // Generate cover placeholder
  const coverDir = path.join(IMAGES_DIR, "cover");
  if (!fs.existsSync(coverDir)) fs.mkdirSync(coverDir, { recursive: true });

  const coverSVG = createPlaceholderSVG("The 2,500 Donkeys", "COVER", 2550, 3300);
  const coverPath = path.join(coverDir, "cover-front.svg");
  fs.writeFileSync(coverPath, coverSVG, "utf-8");
  console.log(`  ✅ Cover: cover/cover-front.svg (2550×3300)`);
  count++;

  // Generate chapter placeholders
  const chapDir = path.join(IMAGES_DIR, "chapters");
  if (!fs.existsSync(chapDir)) fs.mkdirSync(chapDir, { recursive: true });

  for (const ch of prompts.chapters) {
    const basename = path.basename(ch.file, ".png") + ".svg";
    const svgContent = createPlaceholderSVG(ch.scene.substring(0, 60), ch.arc, 1500, 1000);
    const outputPath = path.join(chapDir, basename);
    fs.writeFileSync(outputPath, svgContent, "utf-8");
    console.log(`  ✅ ${ch.arc}: chapters/${basename}`);
    count++;
  }

  console.log(`\n[PLACEHOLDERS] Generated ${count} placeholder images`);
  console.log(`[PLACEHOLDERS] Replace with real illustrations before final export`);
}

generate();
