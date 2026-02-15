#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════
 *  IAPL-1 Audio Hash + Merkle Tree Builder
 * ──────────────────────────────────────────────────────────────
 *  Hashes all rendered audio files, builds a Merkle tree
 *  (matching LPS-1 ordered concatenation scheme), and outputs
 *  dist/audio-manifest.json.
 *
 *  Usage:
 *    node audio/hash-audio.js            # Build audio tree
 *    node audio/hash-audio.js --verify   # Verify existing manifest
 *
 *  No API keys required. Pure local computation.
 * ══════════════════════════════════════════════════════════════
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ── Paths ─────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const CONFIG_FILE = path.join(__dirname, 'audio-config.json');
const ORDER_FILE = path.join(ROOT, 'build', 'order.json');
const DIST_DIR = path.join(ROOT, 'dist');
const MERKLE_FILE = path.join(DIST_DIR, 'merkle.json');
const GENESIS_FILE = path.join(ROOT, 'web3', 'metadata', 'genesis.json');
const MANIFEST_FILE = path.join(DIST_DIR, 'audio-manifest.json');

const VERIFY_MODE = process.argv.includes('--verify');

// ── Crypto helpers (matching build/merkle.js exactly) ─────────

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Build Merkle tree from leaf hashes.
 * Uses ORDERED concatenation: sha256(left + right)
 * Odd leaf rule: duplicate last leaf.
 * Matches build/merkle.js implementation exactly.
 */
function buildMerkleTree(leaves) {
  if (leaves.length === 0) return { root: sha256(''), leaves: [], layers: [[]] };

  let current = [...leaves];
  const layers = [current.slice()];

  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = current[i + 1] || left; // odd leaf: duplicate last
      next.push(sha256(left + right));
    }
    current = next;
    layers.push(current.slice());
  }

  return { root: current[0], leaves, layers };
}

// ── Main ──────────────────────────────────────────────────────

function main() {
  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('  IAPL-1 Audio Hash + Merkle Tree');
  console.log('══════════════════════════════════════════════════\n');

  // Load config
  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  const order = JSON.parse(fs.readFileSync(ORDER_FILE, 'utf-8'));
  const audioDir = path.join(ROOT, config.outputDir);

  // Check audio directory exists
  if (!fs.existsSync(audioDir)) {
    console.error('✗ Audio directory not found:', config.outputDir);
    console.error('  Run: npm run audio:render  — first');
    process.exit(1);
  }

  // ── Hash each block's audio file ────────────────────────────
  console.log('── Hashing Audio Blocks ──\n');
  const blocks = [];
  let totalSize = 0;
  let missing = 0;

  for (const block of order.blocks) {
    const audioFile = block.file.replace(/\.md$/, '.mp3');
    const audioPath = path.join(audioDir, audioFile);

    if (!fs.existsSync(audioPath)) {
      console.error(`  ✗ MISSING ${audioFile}`);
      missing++;
      continue;
    }

    const hash = sha256File(audioPath);
    const stats = fs.statSync(audioPath);
    totalSize += stats.size;

    blocks.push({
      id: block.id,
      file: audioFile,
      sourceBlock: block.file,
      title: block.title,
      sha256: hash,
      sizeBytes: stats.size
    });

    console.log(`  ✓ ${audioFile.padEnd(40)} ${hash.slice(0, 16)}… (${(stats.size / 1024).toFixed(0)} KB)`);
  }

  if (missing > 0) {
    console.error(`\n✗ ${missing} audio file(s) missing. Render first: npm run audio:render`);
    process.exit(1);
  }

  console.log(`\n  ${blocks.length} files · ${(totalSize / 1024 / 1024).toFixed(1)} MB total\n`);

  // ── Build Merkle tree ───────────────────────────────────────
  console.log('── Building Audio Merkle Tree ──\n');
  const leafHashes = blocks.map(b => b.sha256);
  const audioTree = buildMerkleTree(leafHashes);
  const audioRoot = audioTree.root;

  console.log(`  audioRoot: ${audioRoot}\n`);

  // ── Compute audioEditionRoot ────────────────────────────────
  // Binds audio layer to text edition
  let editionRoot = null;
  let audioEditionRoot = null;

  if (fs.existsSync(MERKLE_FILE)) {
    const merkle = JSON.parse(fs.readFileSync(MERKLE_FILE, 'utf-8'));
    editionRoot = merkle.editionRoot;
    audioEditionRoot = sha256(editionRoot + audioRoot);
    console.log(`  editionRoot:      ${editionRoot}`);
    console.log(`  audioEditionRoot: ${audioEditionRoot}\n`);
  } else {
    console.log('  ⚠ merkle.json not found — audioEditionRoot not computed');
    console.log('    Run: npm run build  — first\n');
  }

  // ── Assemble manifest ──────────────────────────────────────
  const manifest = {
    version: 'IAPL-1',
    generatedAt: new Date().toISOString(),
    edition: order.version || 'unknown',
    title: order.title || 'The 2,500 Donkeys',

    voice: {
      id: config.voice.id,
      name: config.voice.name,
      model: config.voice.model
    },

    audioRoot,
    editionRoot,
    audioEditionRoot,

    blocks,

    tree: {
      root: audioRoot,
      leafCount: leafHashes.length,
      leaves: blocks.map(b => ({
        id: b.id,
        file: b.file,
        hash: b.sha256
      })),
      algorithm: 'sha256',
      merkleScheme: 'ordered-concatenation',
      oddLeafRule: 'duplicate-last'
    }
  };

  // ── Write manifest ─────────────────────────────────────────
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log(`✓ Written: dist/audio-manifest.json`);
  console.log(`  ${blocks.length} blocks · audioRoot: ${audioRoot.slice(0, 16)}…`);

  // ── Update genesis.json with audioRoot ─────────────────────
  if (fs.existsSync(GENESIS_FILE)) {
    const genesis = JSON.parse(fs.readFileSync(GENESIS_FILE, 'utf-8'));

    // Add audioRoot to roots
    genesis.roots.audioRoot = audioRoot;
    if (audioEditionRoot) {
      genesis.roots.audioEditionRoot = audioEditionRoot;
    }

    // Add audio section
    genesis.audio = {
      version: 'IAPL-1',
      voice: manifest.voice,
      blockCount: blocks.length,
      totalSizeBytes: totalSize,
      manifest: 'dist/audio-manifest.json'
    };

    fs.writeFileSync(GENESIS_FILE, JSON.stringify(genesis, null, 2));
    console.log(`✓ Updated: web3/metadata/genesis.json (audioRoot added)`);
  }

  // ── Self-verify ────────────────────────────────────────────
  console.log('\n── Self-Verification ──\n');

  // Rebuild tree and verify
  const verifyTree = buildMerkleTree(blocks.map(b => b.sha256));
  if (verifyTree.root === audioRoot) {
    console.log('  ✓ audioRoot verified (tree rebuild matches)');
  } else {
    console.error('  ✗ audioRoot MISMATCH on rebuild');
    process.exit(1);
  }

  // Verify each file hash
  let fileVerified = 0;
  for (const block of blocks) {
    const audioPath = path.join(audioDir, block.file);
    const rehash = sha256File(audioPath);
    if (rehash === block.sha256) {
      fileVerified++;
    } else {
      console.error(`  ✗ Hash mismatch: ${block.file}`);
      process.exit(1);
    }
  }
  console.log(`  ✓ ${fileVerified}/${blocks.length} file hashes verified`);

  if (audioEditionRoot) {
    const verifyAER = sha256(editionRoot + audioRoot);
    if (verifyAER === audioEditionRoot) {
      console.log('  ✓ audioEditionRoot verified');
    } else {
      console.error('  ✗ audioEditionRoot MISMATCH');
      process.exit(1);
    }
  }

  console.log('\n✓ Audio Merkle tree built and verified.\n');
  console.log('  Next: npm run lps:verify  — Full provenance check\n');
}

// ── Verify mode: check existing manifest against files ───────

function verify() {
  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('  IAPL-1 Audio Verification');
  console.log('══════════════════════════════════════════════════\n');

  if (!fs.existsSync(MANIFEST_FILE)) {
    console.error('✗ dist/audio-manifest.json not found');
    console.error('  Run: npm run audio:hash  — first');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'));
  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  const audioDir = path.join(ROOT, config.outputDir);

  let pass = 0;
  let fail = 0;

  // Check each file
  console.log('── File Integrity ──\n');
  for (const block of manifest.blocks) {
    const audioPath = path.join(audioDir, block.file);

    if (!fs.existsSync(audioPath)) {
      console.error(`  ✗ MISSING ${block.file}`);
      fail++;
      continue;
    }

    const hash = sha256File(audioPath);
    if (hash === block.sha256) {
      console.log(`  ✓ ${block.file.padEnd(40)} matches`);
      pass++;
    } else {
      console.error(`  ✗ ${block.file.padEnd(40)} HASH MISMATCH`);
      console.error(`    Expected: ${block.sha256}`);
      console.error(`    Got:      ${hash}`);
      fail++;
    }
  }

  // Rebuild tree
  console.log('\n── Merkle Tree ──\n');
  const leafHashes = manifest.blocks.map(b => b.sha256);
  const tree = buildMerkleTree(leafHashes);

  if (tree.root === manifest.audioRoot) {
    console.log(`  ✓ audioRoot matches: ${manifest.audioRoot.slice(0, 16)}…`);
    pass++;
  } else {
    console.error(`  ✗ audioRoot MISMATCH`);
    console.error(`    Stored:  ${manifest.audioRoot}`);
    console.error(`    Rebuilt: ${tree.root}`);
    fail++;
  }

  // Check audioEditionRoot
  if (manifest.audioEditionRoot && manifest.editionRoot) {
    const expected = sha256(manifest.editionRoot + manifest.audioRoot);
    if (expected === manifest.audioEditionRoot) {
      console.log(`  ✓ audioEditionRoot verified`);
      pass++;
    } else {
      console.error(`  ✗ audioEditionRoot MISMATCH`);
      fail++;
    }
  }

  // Summary
  console.log(`\n── Result ──\n`);
  console.log(`  ${pass} PASS  ${fail} FAIL`);

  if (fail > 0) {
    console.error('\n✗ Audio verification FAILED\n');
    process.exit(1);
  } else {
    console.log('\n✓ Audio integrity verified.\n');
  }
}

// ── Entry point ──────────────────────────────────────────────

if (VERIFY_MODE) {
  verify();
} else {
  main();
}
