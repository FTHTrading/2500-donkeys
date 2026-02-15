/**
 * manifest.js — File Manifest Generator
 *
 * Produces a tamper-evident manifest of every source file:
 *   - filename
 *   - size in bytes
 *   - SHA-256 hash
 *   - last modified timestamp
 *
 * Output: dist/manifest.json
 *
 * This allows anyone to verify that no source file was altered
 * after the Genesis build was anchored.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT, "dist");
const MANIFEST_PATH = path.join(DIST_DIR, "manifest.json");

const DIRS_TO_SCAN = [
  { dir: path.join(ROOT, "manuscript"), prefix: "manuscript/" },
  { dir: path.join(ROOT, "artifacts"), prefix: "artifacts/" },
];

function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

function scanDir(dirPath, prefix) {
  const entries = [];
  if (!fs.existsSync(dirPath)) return entries;

  const files = fs.readdirSync(dirPath).sort();
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      entries.push({
        path: prefix + file,
        sizeBytes: stat.size,
        sha256: hashFile(fullPath),
        modified: stat.mtime.toISOString()
      });
    }
  }
  return entries;
}

function generateManifest() {
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  let allFiles = [];
  for (const { dir, prefix } of DIRS_TO_SCAN) {
    allFiles = allFiles.concat(scanDir(dir, prefix));
  }

  // Also include the compiled manuscript if it exists
  const compiledPath = path.join(DIST_DIR, "final-manuscript.md");
  if (fs.existsSync(compiledPath)) {
    const stat = fs.statSync(compiledPath);
    allFiles.push({
      path: "dist/final-manuscript.md",
      sizeBytes: stat.size,
      sha256: hashFile(compiledPath),
      modified: stat.mtime.toISOString()
    });
  }

  const manifest = {
    title: "The 2,500 Donkeys — Genesis Manifest",
    generated: new Date().toISOString(),
    totalFiles: allFiles.length,
    files: allFiles
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");

  console.log(`[MANIFEST] ✅ Manifest generated`);
  console.log(`[MANIFEST]    Files tracked: ${allFiles.length}`);
  console.log(`[MANIFEST]    Output: ${MANIFEST_PATH}`);
}

generateManifest();
