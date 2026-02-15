#!/usr/bin/env node
/**
 * build-audio-manifest.js
 * Generates dist/audio-manifest.json in IAPL-1 format
 * Expected by verify/lps-verify.js Phase 6
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const ORDER_PATH = path.join(ROOT, 'build', 'order.json');
const CONFIG_PATH = path.join(ROOT, 'audio', 'audio-config.json');
const GENESIS_PATH = path.join(ROOT, 'web3', 'metadata', 'genesis.json');
const MERKLE_PATH = path.join(ROOT, 'dist', 'merkle.json');

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function buildMerkleTree(leaves) {
  if (leaves.length === 0) return { root: sha256(''), layers: [[]] };
  let layer = leaves.map(h => h);
  const layers = [layer.slice()];
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      if (i + 1 < layer.length) {
        const pair = [layer[i], layer[i + 1]].sort();
        next.push(sha256(pair[0] + pair[1]));
      } else {
        next.push(layer[i]);
      }
    }
    layer = next;
    layers.push(layer.slice());
  }
  return { root: layer[0], layers };
}

// ── Load order.json ──
const order = JSON.parse(fs.readFileSync(ORDER_PATH, 'utf-8'));
const blocks = order.blocks;

// ── Load audio config ──
const audioConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
const audioDir = path.join(ROOT, audioConfig.outputDir);

// ── Load edition root ──
const genesis = JSON.parse(fs.readFileSync(GENESIS_PATH, 'utf-8'));
const merkle = JSON.parse(fs.readFileSync(MERKLE_PATH, 'utf-8'));
const editionRoot = merkle.editionRoot;

// ── Map block IDs to audio files ──
const audioFiles = fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3'));

// Build a mapping from block id to actual filename
function findAudioFile(blockId, blockFile) {
  // Try common naming patterns
  const baseName = path.basename(blockFile, path.extname(blockFile));
  const patterns = [
    `${blockId}.mp3`,
    `${baseName}.mp3`,
  ];
  
  // Also search for files that start with the block id
  for (const f of audioFiles) {
    if (f.startsWith(blockId + '-') || f.startsWith(blockId + '.')) return f;
  }
  
  // Check artifact inserts
  if (blockId.startsWith('artifact-') || blockFile.includes('artifact')) {
    const artName = blockFile.replace('manuscript/', '').replace('artifacts/', '').replace('.md', '.mp3');
    for (const f of audioFiles) {
      if (f === artName) return f;
    }
  }
  
  return null;
}

// ── Build block entries ──
const manifestBlocks = [];
let found = 0;
let missing = 0;

for (const block of blocks) {
  const audioFile = findAudioFile(block.id, block.file);
  
  if (audioFile) {
    const audioPath = path.join(audioDir, audioFile);
    const hash = sha256File(audioPath);
    const stat = fs.statSync(audioPath);
    
    manifestBlocks.push({
      id: block.id,
      title: block.title,
      file: audioFile,
      sha256: hash,
      sizeBytes: stat.size,
    });
    found++;
    console.log(`  ✔ ${block.id} → ${audioFile} (${(stat.size / 1024).toFixed(0)} KB)`);
  } else {
    // Still need an entry for the Merkle tree — use a placeholder hash
    const placeholder = sha256(`MISSING:${block.id}`);
    manifestBlocks.push({
      id: block.id,
      title: block.title,
      file: `${block.id}.mp3`,
      sha256: placeholder,
      sizeBytes: 0,
      missing: true,
    });
    missing++;
    console.log(`  ✗ ${block.id} — not rendered`);
  }
}

// ── Build audio Merkle tree ──
const leafHashes = manifestBlocks.map(b => b.sha256);
const audioTree = buildMerkleTree(leafHashes);
const audioRoot = audioTree.root;

// ── Compute audioEditionRoot ──
const audioEditionRoot = sha256(editionRoot + audioRoot);

// ── Build manifest ──
const manifest = {
  version: "IAPL-1",
  title: "The 2,500 Donkeys — Audio Edition",
  author: "Kidd James",
  narrator: "George (ElevenLabs)",
  voiceModel: "eleven_multilingual_v2",
  format: "mp3_44100_128",
  generatedAt: new Date().toISOString(),
  editionRoot,
  audioRoot,
  audioEditionRoot,
  blocks: manifestBlocks,
  stats: {
    totalBlocks: blocks.length,
    rendered: found,
    missing: missing,
    totalSizeBytes: manifestBlocks.reduce((s, b) => s + b.sizeBytes, 0),
  }
};

// ── Write manifest ──
const outPath = path.join(DIST, 'audio-manifest.json');
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));

console.log(`\n[AUDIO-MANIFEST] ✔ Generated`);
console.log(`  Version:     IAPL-1`);
console.log(`  Blocks:      ${blocks.length} (${found} rendered, ${missing} missing)`);
console.log(`  Audio Root:  ${audioRoot.slice(0, 16)}…`);
console.log(`  Edition Root: ${editionRoot.slice(0, 16)}…`);
console.log(`  AER:         ${audioEditionRoot.slice(0, 16)}…`);
console.log(`  Output:      ${outPath}`);
