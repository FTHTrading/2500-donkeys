#!/usr/bin/env node
/**
 * protocol.js — Literary Protocol Standard v1 — Unified Build CLI
 *
 * One command that:
 *   1. Compiles manuscript (compile.js)
 *   2. Computes Merkle trees (merkle.js)
 *   3. Generates genesis hash (hash.js)
 *   4. Builds manifest v2 (manifest.js)
 *   5. Generates edition.json (cross-chain truth file)
 *
 * Usage:
 *   node build/protocol.js              # full build
 *   node build/protocol.js --skip-compile  # skip compilation (use existing)
 *
 * Output:
 *   dist/final-manuscript.md   — compiled manuscript
 *   dist/merkle.json           — Merkle trees + proofs
 *   dist/manifest.json         — manifest v2
 *   dist/edition.json          — cross-chain edition state (THE truth file)
 *   web3/metadata/genesis.json — updated with roots
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const BUILD = __dirname;

const skipCompile = process.argv.includes('--skip-compile');

// ══════════════════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════════════════

function main() {
  const startTime = Date.now();

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   LITERARY PROTOCOL STANDARD v1 — BUILD                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Ensure dist exists
  if (!fs.existsSync(DIST)) {
    fs.mkdirSync(DIST, { recursive: true });
  }

  // ── Step 1: Compile ──────────────────────────────────────────────────
  if (skipCompile) {
    console.log('  [1/5] COMPILE — skipped (--skip-compile)\n');
  } else {
    console.log('  [1/5] COMPILE');
    execSync(`node "${path.join(BUILD, 'compile.js')}"`, { stdio: 'inherit', cwd: ROOT });
    console.log('');
  }

  // ── Step 2: Merkle Trees ─────────────────────────────────────────────
  console.log('  [2/5] MERKLE TREES');
  execSync(`node "${path.join(BUILD, 'merkle.js')}"`, { stdio: 'inherit', cwd: ROOT });
  console.log('');

  // ── Step 3: Genesis Hash ─────────────────────────────────────────────
  console.log('  [3/5] GENESIS HASH');
  execSync(`node "${path.join(BUILD, 'hash.js')}"`, { stdio: 'inherit', cwd: ROOT });
  console.log('');

  // ── Step 4: Manifest v2 ─────────────────────────────────────────────
  console.log('  [4/5] MANIFEST v2');
  execSync(`node "${path.join(BUILD, 'manifest.js')}"`, { stdio: 'inherit', cwd: ROOT });
  console.log('');

  // ── Step 5: Edition.json ─────────────────────────────────────────────
  console.log('  [5/5] EDITION STATE');
  generateEditionJson();
  console.log('');

  // ── Summary ─────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Load the edition for summary
  const edition = JSON.parse(fs.readFileSync(path.join(DIST, 'edition.json'), 'utf-8'));

  console.log('══════════════════════════════════════════════════════════════');
  console.log('  BUILD COMPLETE');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Title:           ${edition.title}`);
  console.log(`  Edition:         ${edition.edition}`);
  console.log(`  Compiled At:     ${edition.compiled_at}`);
  console.log('');
  console.log(`  manuscript_root: ${edition.manuscript_root}`);
  console.log(`  artifact_root:   ${edition.artifact_root}`);
  console.log(`  image_root:      ${edition.image_root}`);
  console.log(`  prompt_root:     ${edition.prompt_root}`);
  console.log('');
  console.log(`  edition_root:    ${edition.edition_root}`);
  console.log('');
  console.log(`  IPFS CID:        ${edition.ipfs_cid || '(not yet pinned)'}`);
  console.log(`  SHA-256:         ${edition.sha256}`);
  console.log('');

  // Anchor status
  const anchors = edition.anchors;
  const polyStatus = anchors.polygon.tx_hash ? '✓ ANCHORED' : '○ READY';
  const ethStatus = anchors.ethereum.tx_hash ? '✓ ANCHORED' : '○ READY';
  const btcStatus = anchors.bitcoin.op_return_tx ? '✓ ANCHORED' : '○ READY';

  console.log(`  Polygon:         ${polyStatus}`);
  console.log(`  Ethereum:        ${ethStatus}`);
  console.log(`  Bitcoin:         ${btcStatus}`);
  console.log('');
  console.log(`  Time:            ${elapsed}s`);
  console.log('');
  console.log('  Outputs:');
  console.log('    dist/final-manuscript.md');
  console.log('    dist/merkle.json');
  console.log('    dist/manifest.json');
  console.log('    dist/edition.json          ← TRUTH FILE');
  console.log('    web3/metadata/genesis.json');
  console.log('');
  console.log('  Next: anchor to chain');
  console.log('    npx hardhat run web3/scripts/deploy-kernel.js --network polygon');
  console.log('    node web3/scripts/anchor-ethereum.js');
  console.log('    node web3/scripts/anchor-bitcoin.js');
  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
}

// ══════════════════════════════════════════════════════════════════════════
//  EDITION.JSON GENERATOR
// ══════════════════════════════════════════════════════════════════════════

function generateEditionJson() {
  // Load data from pipeline outputs
  const merklePath = path.join(DIST, 'merkle.json');
  const genesisPath = path.join(ROOT, 'web3', 'metadata', 'genesis.json');

  if (!fs.existsSync(merklePath)) {
    console.error('    ❌ merkle.json not found');
    process.exit(1);
  }

  const merkle = JSON.parse(fs.readFileSync(merklePath, 'utf-8'));
  const genesis = fs.existsSync(genesisPath)
    ? JSON.parse(fs.readFileSync(genesisPath, 'utf-8'))
    : {};

  // Load existing edition.json if it exists (preserve anchors)
  const editionPath = path.join(DIST, 'edition.json');
  let existing = {};
  if (fs.existsSync(editionPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(editionPath, 'utf-8'));
    } catch (e) { /* start fresh */ }
  }

  const edition = {
    // Identity
    title: genesis.title || "The 2,500 Donkeys",
    author: genesis.author || "Kevan Burnzy",
    edition: merkle.edition || genesis.edition || "genesis",
    compiled_at: new Date().toISOString(),

    // Merkle roots (the cryptographic spine)
    manuscript_root: `sha256:${merkle.trees.manuscript.root}`,
    artifact_root: `sha256:${merkle.trees.artifact.root}`,
    image_root: `sha256:${merkle.trees.image.root}`,
    prompt_root: `sha256:${merkle.trees.prompt.root}`,

    // Edition root = H(manuscript || artifact || image || prompt)
    edition_root: `sha256:${merkle.editionRoot}`,

    // Content hash
    sha256: genesis.build?.sha256 || null,
    size_bytes: genesis.build?.sizeBytes || null,

    // IPFS
    ipfs_cid: genesis.ipfs?.cid || null,

    // Multi-chain anchors
    anchors: {
      polygon: {
        network: "polygon-mainnet",
        chain_id: 137,
        contract: existing?.anchors?.polygon?.contract
          || genesis.chain?.contract
          || genesis.chain?.contractAddress
          || "0x97f456300817eaE3B40E235857b856dfFE8bba90",
        kernel_contract: existing?.anchors?.polygon?.kernel_contract
          || genesis.chain?.kernelAddress
          || null,
        tx_hash: existing?.anchors?.polygon?.tx_hash
          || genesis.chain?.txHash
          || null,
        kernel_tx_hash: existing?.anchors?.polygon?.kernel_tx_hash
          || genesis.chain?.kernelDeployTx
          || null,
        block: existing?.anchors?.polygon?.block
          || genesis.chain?.deployBlock
          || null,
        deployer: existing?.anchors?.polygon?.deployer
          || genesis.chain?.authorWallet
          || genesis.chain?.deployedBy
          || null
      },
      ethereum: {
        network: "ethereum-mainnet",
        chain_id: 1,
        tx_hash: existing?.anchors?.ethereum?.tx_hash || null,
        block: existing?.anchors?.ethereum?.block || null,
        method: "calldata",     // 0-value tx with edition_root in calldata
        cost_estimate: "~$0.50–$2.00"
      },
      bitcoin: {
        network: "bitcoin-mainnet",
        op_return_tx: existing?.anchors?.bitcoin?.op_return_tx || null,
        ots_proof: existing?.anchors?.bitcoin?.ots_proof || null,
        method: "opentimestamps", // free, merkle-aggregated
        cost_estimate: "free"
      }
    },

    // Schema
    schema: "literary-protocol-standard",
    schema_version: "1.0.0",

    // Build metadata
    build: {
      pipeline: "compile → merkle → hash → manifest → edition",
      merkle_scheme: "sorted-pair-concatenation",
      odd_leaf_rule: "duplicate-last",
      algorithm: "sha256",
      leaf_counts: {
        manuscript: merkle.trees.manuscript.leafCount,
        artifact: merkle.trees.artifact.leafCount,
        image: merkle.trees.image.leafCount,
        prompt: merkle.trees.prompt.leafCount
      }
    }
  };

  fs.writeFileSync(editionPath, JSON.stringify(edition, null, 2), 'utf-8');

  console.log(`    ✅ edition.json generated`);
  console.log(`    Edition Root: ${edition.edition_root}`);
  console.log(`    Output: dist/edition.json`);
}

// ── Run ───────────────────────────────────────────────────────────────────
main();
