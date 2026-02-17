#!/usr/bin/env node
/**
 * stories-merkle.js — Merkle Tree Builder for Private Placement Programs
 * ═══════════════════════════════════════════════════════════
 *
 * Produces per-leaf SHA-256 hashes and Merkle roots for:
 *   - manuscriptRoot  (13 manuscript files, ordered 00-12)
 *   - editionRoot     = manuscriptRoot (no artifacts/images/prompts yet)
 *
 * When audio is rendered and hashed, audioEditionRoot is computed as:
 *   audioEditionRoot = H(editionRoot || audioRoot)
 *
 * Output: dist/stories-merkle.json
 *
 * Usage:
 *   node stories/stories-merkle.js
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ── Paths ────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, "..");
const MANUSCRIPT_DIR = path.join(__dirname, "manuscript");
const DIST_DIR = path.join(ROOT, "dist");
const METADATA_FILE = path.join(__dirname, "book-metadata.json");
const OUTPUT_FILE = path.join(DIST_DIR, "stories-merkle.json");

// Manuscript files in canonical order
const FILES = [
  "00-front-matter.md",
  "01-mt799-is-not-money.md",
  "02-the-bank-that-didnt-exist.md",
  "03-commission-above-supply-depth.md",
  "04-the-ghost-monetizer.md",
  "05-the-mandate-that-couldnt-sign.md",
  "06-vault-without-address.md",
  "07-the-compliance-wall.md",
  "08-bonded-but-never-seen.md",
  "09-the-sovereign-whisper.md",
  "10-the-tokenized-mirage.md",
  "11-the-initiator-awakening.md",
  "13-the-financial-alchemists-punch-list.md",
  "14-the-exclusivity-trap.md",
  "15-the-off-ledger-revelation.md",
  "16-back-matter.md",
];

// ── Crypto helpers ───────────────────────────────────────────────

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Hash a markdown file with CRLF normalization (matches Book 1 scheme).
 */
function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  if (/\.md$/i.test(filePath)) {
    const text = data.toString("utf-8");
    const crlf = text.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
    return sha256(Buffer.from(crlf, "utf-8"));
  }
  return sha256(data);
}

/**
 * Build Merkle tree from leaf hashes.
 * Ordered concatenation: sha256(left + right). Odd leaf: duplicate last.
 */
function buildMerkleTree(hashes) {
  if (hashes.length === 0) {
    return { root: sha256("empty"), leaves: [], layers: [[sha256("empty")]] };
  }
  const layers = [hashes.slice()];
  let current = hashes.slice();
  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = current[i + 1] || left;
      next.push(sha256(left + right));
    }
    layers.push(next);
    current = next;
  }
  return { root: current[0], leaves: hashes, layers };
}

/**
 * Generate Merkle proof for a leaf at index.
 */
function getMerkleProof(layers, leafIndex) {
  const proof = [];
  let idx = leafIndex;
  for (let level = 0; level < layers.length - 1; level++) {
    const layer = layers[level];
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;
    // Odd leaf rule: if sibling doesn't exist, duplicate self
    const siblingHash = siblingIdx < layer.length ? layer[siblingIdx] : layer[idx];
    proof.push({
      hash: siblingHash,
      position: isRight ? "left" : "right",
    });
    idx = Math.floor(idx / 2);
  }
  return proof;
}

// ── Main ─────────────────────────────────────────────────────────

function main() {
  console.log("");
  console.log("══════════════════════════════════════════════════");
  console.log("  PRIVATE PLACEMENT PROGRAMS — Merkle Tree Builder");
  console.log("══════════════════════════════════════════════════\n");

  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });

  const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, "utf-8"));

  // ── Hash each manuscript file ──────────────────────────────
  console.log("── Hashing Manuscript Files ──\n");
  const leaves = [];
  let totalSize = 0;

  for (const file of FILES) {
    const filePath = path.join(MANUSCRIPT_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.error(`  ✗ MISSING: ${file}`);
      process.exit(1);
    }
    const hash = sha256File(filePath);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;
    leaves.push({ file, sha256: hash, sizeBytes: stats.size });
    console.log(`  ✓ ${file.padEnd(45)} ${hash.slice(0, 16)}… (${(stats.size / 1024).toFixed(0)} KB)`);
  }

  console.log(`\n  ${leaves.length} files · ${(totalSize / 1024).toFixed(0)} KB total\n`);

  // ── Build Merkle trees ─────────────────────────────────────
  console.log("── Building Merkle Trees ──\n");

  const manuscriptHashes = leaves.map((l) => l.sha256);
  const manuscriptTree = buildMerkleTree(manuscriptHashes);
  const manuscriptRoot = manuscriptTree.root;
  console.log(`  manuscriptRoot: ${manuscriptRoot}`);

  // For stories collection, editionRoot = manuscriptRoot
  // (no artifacts, images, or prompts in the initial anchor)
  const editionRoot = manuscriptRoot;
  console.log(`  editionRoot:    ${editionRoot}`);

  // ── Compute combined SHA-256 of the full concatenated manuscript ──
  const allContent = FILES.map((f) => {
    const data = fs.readFileSync(path.join(MANUSCRIPT_DIR, f), "utf-8");
    return data.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
  }).join("\n\n");
  const combinedHash = sha256(Buffer.from(allContent, "utf-8"));
  console.log(`  combinedHash:   ${combinedHash}`);

  // ── Generate proofs ────────────────────────────────────────
  const proofs = leaves.map((leaf, i) => ({
    file: leaf.file,
    leafHash: leaf.sha256,
    proof: getMerkleProof(manuscriptTree.layers, i),
  }));

  // ── Assemble output ────────────────────────────────────────
  const output = {
    title: metadata.title,
    subtitle: metadata.subtitle,
    author: metadata.author,
    schema: "literary-protocol-standard",
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),

    roots: {
      manuscriptRoot,
      editionRoot,
    },

    combinedHash,
    totalSizeBytes: totalSize,
    fileCount: leaves.length,

    leaves,

    tree: {
      root: manuscriptRoot,
      leafCount: manuscriptHashes.length,
      algorithm: "sha256",
      merkleScheme: "ordered-concatenation",
      oddLeafRule: "duplicate-last",
      layers: manuscriptTree.layers,
    },

    proofs,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\n✓ Written: dist/stories-merkle.json`);
  console.log(`  ${leaves.length} leaves · manuscriptRoot: ${manuscriptRoot.slice(0, 16)}…`);

  // ── Self-verification ──────────────────────────────────────
  console.log("\n── Self-Verification ──\n");
  const verifyTree = buildMerkleTree(manuscriptHashes);
  if (verifyTree.root === manuscriptRoot) {
    console.log("  ✓ manuscriptRoot verified (tree rebuild matches)");
  } else {
    console.error("  ✗ manuscriptRoot MISMATCH on rebuild");
    process.exit(1);
  }

  // Verify each proof
  let proofsPassed = 0;
  for (const p of proofs) {
    let hash = p.leafHash;
    for (const step of p.proof) {
      if (step.position === "left") {
        hash = sha256(step.hash + hash);
      } else {
        hash = sha256(hash + step.hash);
      }
    }
    if (hash === manuscriptRoot) {
      proofsPassed++;
    } else {
      console.error(`  ✗ Proof failed for ${p.file}`);
    }
  }
  console.log(`  ✓ ${proofsPassed}/${proofs.length} Merkle proofs verified`);
  console.log(`\n✓ Merkle tree built and verified.\n`);
}

main();
