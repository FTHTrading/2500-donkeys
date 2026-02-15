/**
 * manifest.js — Manifest v2 Generator (Literary Protocol Standard v1)
 *
 * Produces a tamper-evident manifest combining:
 *   - Per-file SHA-256 hashes (manuscript, artifacts, images, prompts)
 *   - Merkle tree roots from merkle.json
 *   - Edition root (composite hash of all trees)
 *   - IPFS CIDs and contract data from genesis.json
 *   - Compiled manuscript hash
 *
 * Output: dist/manifest.json (v2 schema)
 *
 * This is the single source of truth for verification —
 * everything a verifier needs to prove the edition is intact.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT, "dist");
const MANIFEST_PATH = path.join(DIST_DIR, "manifest.json");

const DIRS_TO_SCAN = [
  { dir: path.join(ROOT, "manuscript"), prefix: "manuscript/", category: "manuscript" },
  { dir: path.join(ROOT, "artifacts"), prefix: "artifacts/", category: "artifact" },
];

function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

function scanDir(dirPath, prefix, category) {
  const entries = [];
  if (!fs.existsSync(dirPath)) return entries;

  const files = fs.readdirSync(dirPath).sort();
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      entries.push({
        path: prefix + file,
        category,
        sizeBytes: stat.size,
        sha256: hashFile(fullPath),
        modified: stat.mtime.toISOString()
      });
    }
  }
  return entries;
}

function scanImages(imagesDir) {
  const entries = [];

  // Cover
  const coverPath = path.join(imagesDir, "cover", "cover-front.png");
  if (fs.existsSync(coverPath)) {
    const stat = fs.statSync(coverPath);
    entries.push({
      path: "images/cover/cover-front.png",
      category: "image",
      sizeBytes: stat.size,
      sha256: hashFile(coverPath),
      modified: stat.mtime.toISOString()
    });
  }

  // Chapter images
  const chaptersDir = path.join(imagesDir, "chapters");
  if (fs.existsSync(chaptersDir)) {
    const files = fs.readdirSync(chaptersDir).filter(f => f.endsWith('.png')).sort();
    for (const file of files) {
      const fullPath = path.join(chaptersDir, file);
      const stat = fs.statSync(fullPath);
      entries.push({
        path: `images/chapters/${file}`,
        category: "image",
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

  // ── Scan all source files ───────────────────────────────────────────────
  let allFiles = [];
  for (const { dir, prefix, category } of DIRS_TO_SCAN) {
    allFiles = allFiles.concat(scanDir(dir, prefix, category));
  }

  // Images
  const imagesDir = path.join(ROOT, "images");
  allFiles = allFiles.concat(scanImages(imagesDir));

  // Compiled manuscript
  const compiledPath = path.join(DIST_DIR, "final-manuscript.md");
  if (fs.existsSync(compiledPath)) {
    const stat = fs.statSync(compiledPath);
    allFiles.push({
      path: "dist/final-manuscript.md",
      category: "compiled",
      sizeBytes: stat.size,
      sha256: hashFile(compiledPath),
      modified: stat.mtime.toISOString()
    });
  }

  // ── Load Merkle tree data ───────────────────────────────────────────────
  const merklePath = path.join(DIST_DIR, "merkle.json");
  let merkleData = null;
  if (fs.existsSync(merklePath)) {
    merkleData = JSON.parse(fs.readFileSync(merklePath, "utf-8"));
  }

  // ── Load genesis.json for IPFS/chain data ───────────────────────────────
  const genesisPath = path.join(ROOT, "web3", "metadata", "genesis.json");
  let genesisData = null;
  if (fs.existsSync(genesisPath)) {
    genesisData = JSON.parse(fs.readFileSync(genesisPath, "utf-8"));
  }

  // ── Assemble manifest v2 ───────────────────────────────────────────────
  const manifest = {
    // Schema
    schema: "literary-protocol-standard",
    schemaVersion: "1.0.0",
    manifestVersion: 2,

    // Identity
    title: "The 2,500 Donkeys",
    author: "Kevan Burnzy",
    edition: merkleData?.edition || "unknown",
    generated: new Date().toISOString(),

    // Merkle roots (the on-chain anchors)
    roots: merkleData ? {
      editionRoot: merkleData.editionRoot,
      manuscriptRoot: merkleData.trees.manuscript.root,
      artifactRoot: merkleData.trees.artifact.root,
      imageRoot: merkleData.trees.image.root,
      promptRoot: merkleData.trees.prompt.root,
      algorithm: merkleData.algorithm,
      merkleScheme: merkleData.merkleScheme,
      oddLeafRule: merkleData.oddLeafRule
    } : null,

    // Chain anchors
    chain: genesisData ? {
      network: genesisData.chain?.network || "polygon",
      chainId: genesisData.chain?.chainId || 137,
      contract: genesisData.chain?.contractAddress || null,
      deployTx: genesisData.chain?.deployTx || null,
      deployBlock: genesisData.chain?.deployBlock || null,
      author: genesisData.chain?.deployedBy || null
    } : null,

    // IPFS
    ipfs: genesisData ? {
      genesisCID: genesisData.ipfs?.cid || null,
      edition2CID: genesisData.ipfs?.edition2CID || null,
      gateway: "https://ipfs.io/ipfs/"
    } : null,

    // File inventory with categories
    files: {
      total: allFiles.length,
      byCategory: {
        manuscript: allFiles.filter(f => f.category === "manuscript").length,
        artifact: allFiles.filter(f => f.category === "artifact").length,
        image: allFiles.filter(f => f.category === "image").length,
        compiled: allFiles.filter(f => f.category === "compiled").length
      },
      entries: allFiles
    }
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");

  console.log(`[MANIFEST v2] ✅ Generated`);
  console.log(`  Schema:     literary-protocol-standard v1.0.0`);
  console.log(`  Files:      ${allFiles.length} total`);
  console.log(`  Manuscript: ${manifest.files.byCategory.manuscript} blocks`);
  console.log(`  Artifacts:  ${manifest.files.byCategory.artifact} files`);
  console.log(`  Images:     ${manifest.files.byCategory.image} files`);
  if (merkleData) {
    console.log(`  Edition Root: ${merkleData.editionRoot}`);
  }
  console.log(`  Output:     ${MANIFEST_PATH}`);
}

generateManifest();
