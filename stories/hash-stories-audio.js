#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════
 *  PPE Puppetry — Audio Hash + Merkle Tree Builder
 * ──────────────────────────────────────────────────────────────
 *  Hashes all rendered story audio files, builds a Merkle tree,
 *  computes audioEditionRoot = H(editionRoot || audioRoot),
 *  and outputs dist/stories-audio-manifest.json.
 *
 *  Usage:
 *    node stories/hash-stories-audio.js            # Build audio tree
 *    node stories/hash-stories-audio.js --verify   # Verify existing manifest
 *
 *  No API keys required. Pure local computation.
 * ══════════════════════════════════════════════════════════════
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// ── Paths ─────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, "..");
const AUDIO_DIR = path.join(ROOT, "audio", "rendered-stories");
const DIST_DIR = path.join(ROOT, "dist");
const MERKLE_FILE = path.join(DIST_DIR, "stories-merkle.json");
const MANIFEST_FILE = path.join(DIST_DIR, "stories-audio-manifest.json");

const VERIFY_MODE = process.argv.includes("--verify");

// Files in canonical order (matching stories-merkle.js)
const FILES = [
  "00-front-matter.mp3",
  "01-mt799-is-not-money.mp3",
  "02-the-bank-that-didnt-exist.mp3",
  "03-commission-above-supply-depth.mp3",
  "04-the-ghost-monetizer.mp3",
  "05-the-mandate-that-couldnt-sign.mp3",
  "06-vault-without-address.mp3",
  "07-the-compliance-wall.mp3",
  "08-bonded-but-never-seen.mp3",
  "09-the-sovereign-whisper.mp3",
  "10-the-tokenized-mirage.mp3",
  "11-the-initiator-awakening.mp3",
  "12-back-matter.mp3",
];

// ── Crypto helpers ───────────────────────────────────────────

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function buildMerkleTree(leaves) {
  if (leaves.length === 0) return { root: sha256(""), leaves: [], layers: [[]] };
  let current = [...leaves];
  const layers = [current.slice()];
  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = current[i + 1] || left;
      next.push(sha256(left + right));
    }
    current = next;
    layers.push(current.slice());
  }
  return { root: current[0], leaves, layers };
}

// ── Main ──────────────────────────────────────────────────────

function main() {
  console.log("");
  console.log("══════════════════════════════════════════════════");
  console.log("  PPE PUPPETRY — Audio Hash + Merkle Tree");
  console.log("══════════════════════════════════════════════════\n");

  if (!fs.existsSync(AUDIO_DIR)) {
    console.error("✗ Audio directory not found: audio/rendered-stories/");
    console.error("  Run: python stories/narrate-stories-kokoro.py  — first");
    process.exit(1);
  }

  // ── Hash each audio file ───────────────────────────────────
  console.log("── Hashing Audio Files ──\n");
  const blocks = [];
  let totalSize = 0;
  let missing = 0;

  for (const file of FILES) {
    const audioPath = path.join(AUDIO_DIR, file);
    if (!fs.existsSync(audioPath)) {
      console.error(`  ✗ MISSING ${file}`);
      missing++;
      continue;
    }
    const hash = sha256File(audioPath);
    const stats = fs.statSync(audioPath);
    totalSize += stats.size;
    blocks.push({
      file,
      sourceBlock: file.replace(".mp3", ".md"),
      sha256: hash,
      sizeBytes: stats.size,
    });
    console.log(`  ✓ ${file.padEnd(45)} ${hash.slice(0, 16)}… (${(stats.size / 1024).toFixed(0)} KB)`);
  }

  if (missing > 0) {
    console.error(`\n✗ ${missing} audio file(s) missing. Render first: python stories/narrate-stories-kokoro.py`);
    process.exit(1);
  }

  console.log(`\n  ${blocks.length} files · ${(totalSize / 1024 / 1024).toFixed(1)} MB total\n`);

  // ── Build Merkle tree ──────────────────────────────────────
  console.log("── Building Audio Merkle Tree ──\n");
  const leafHashes = blocks.map((b) => b.sha256);
  const audioTree = buildMerkleTree(leafHashes);
  const audioRoot = audioTree.root;
  console.log(`  audioRoot: ${audioRoot}\n`);

  // ── Compute audioEditionRoot ───────────────────────────────
  let editionRoot = null;
  let audioEditionRoot = null;

  if (fs.existsSync(MERKLE_FILE)) {
    const merkle = JSON.parse(fs.readFileSync(MERKLE_FILE, "utf-8"));
    editionRoot = merkle.roots.editionRoot;
    audioEditionRoot = sha256(editionRoot + audioRoot);
    console.log(`  editionRoot:      ${editionRoot}`);
    console.log(`  audioEditionRoot: ${audioEditionRoot}\n`);
  } else {
    console.log("  ⚠ stories-merkle.json not found — audioEditionRoot not computed");
    console.log("    Run: node stories/stories-merkle.js  — first\n");
  }

  // ── Assemble manifest ─────────────────────────────────────
  const manifest = {
    version: "IAPL-1",
    title: "PPE Puppetry",
    generatedAt: new Date().toISOString(),

    voice: {
      id: "bm_george",
      name: "George (Kokoro)",
      model: "hexgrad/Kokoro-82M",
      engine: "Kokoro TTS",
      speed: 0.92,
    },

    audioRoot,
    editionRoot,
    audioEditionRoot,

    blocks,

    tree: {
      root: audioRoot,
      leafCount: leafHashes.length,
      leaves: blocks.map((b) => ({ file: b.file, hash: b.sha256 })),
      algorithm: "sha256",
      merkleScheme: "ordered-concatenation",
      oddLeafRule: "duplicate-last",
    },
  };

  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log(`✓ Written: dist/stories-audio-manifest.json`);
  console.log(`  ${blocks.length} blocks · audioRoot: ${audioRoot.slice(0, 16)}…`);

  // ── Self-verify ────────────────────────────────────────────
  console.log("\n── Self-Verification ──\n");

  const verifyTree = buildMerkleTree(blocks.map((b) => b.sha256));
  if (verifyTree.root === audioRoot) {
    console.log("  ✓ audioRoot verified (tree rebuild matches)");
  } else {
    console.error("  ✗ audioRoot MISMATCH on rebuild");
    process.exit(1);
  }

  let fileVerified = 0;
  for (const block of blocks) {
    const rehash = sha256File(path.join(AUDIO_DIR, block.file));
    if (rehash === block.sha256) fileVerified++;
    else {
      console.error(`  ✗ Hash mismatch: ${block.file}`);
      process.exit(1);
    }
  }
  console.log(`  ✓ ${fileVerified}/${blocks.length} file hashes verified`);

  if (audioEditionRoot) {
    const verifyAER = sha256(editionRoot + audioRoot);
    if (verifyAER === audioEditionRoot) {
      console.log("  ✓ audioEditionRoot verified");
    } else {
      console.error("  ✗ audioEditionRoot MISMATCH");
      process.exit(1);
    }
  }

  console.log("\n✓ Audio Merkle tree built and verified.");
  console.log("  Next: node stories/anchor-stories.js  — Anchor on Polygon\n");
}

// ── Verify mode ──────────────────────────────────────────────

function verify() {
  console.log("");
  console.log("══════════════════════════════════════════════════");
  console.log("  PPE PUPPETRY — Audio Verification");
  console.log("══════════════════════════════════════════════════\n");

  if (!fs.existsSync(MANIFEST_FILE)) {
    console.error("✗ dist/stories-audio-manifest.json not found");
    console.error("  Run: node stories/hash-stories-audio.js  — first");
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf-8"));
  let pass = 0;
  let fail = 0;

  console.log("── File Integrity ──\n");
  for (const block of manifest.blocks) {
    const audioPath = path.join(AUDIO_DIR, block.file);
    if (!fs.existsSync(audioPath)) {
      console.error(`  ✗ MISSING ${block.file}`);
      fail++;
      continue;
    }
    const hash = sha256File(audioPath);
    if (hash === block.sha256) {
      console.log(`  ✓ ${block.file.padEnd(45)} matches`);
      pass++;
    } else {
      console.error(`  ✗ ${block.file.padEnd(45)} HASH MISMATCH`);
      fail++;
    }
  }

  console.log("\n── Merkle Tree ──\n");
  const tree = buildMerkleTree(manifest.blocks.map((b) => b.sha256));
  if (tree.root === manifest.audioRoot) {
    console.log(`  ✓ audioRoot matches: ${manifest.audioRoot.slice(0, 16)}…`);
    pass++;
  } else {
    console.error(`  ✗ audioRoot MISMATCH`);
    fail++;
  }

  if (manifest.audioEditionRoot && manifest.editionRoot) {
    const expected = sha256(manifest.editionRoot + manifest.audioRoot);
    if (expected === manifest.audioEditionRoot) {
      console.log("  ✓ audioEditionRoot verified");
      pass++;
    } else {
      console.error("  ✗ audioEditionRoot MISMATCH");
      fail++;
    }
  }

  console.log(`\n── Result ──\n`);
  console.log(`  ${pass} PASS  ${fail} FAIL`);
  if (fail > 0) {
    console.error("\n✗ Audio verification FAILED\n");
    process.exit(1);
  } else {
    console.log("\n✓ Audio integrity verified.\n");
  }
}

if (VERIFY_MODE) verify();
else main();
