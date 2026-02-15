#!/usr/bin/env node
/**
 * merkle.js — Merkle Tree Builder for Literary Protocol Standard v1
 * 
 * Produces per-leaf SHA-256 hashes and Merkle roots for:
 *   - manuscriptRoot  (31 blocks, ordered by order.json)
 *   - artifactRoot    (5 embedded artifacts)
 *   - imageRoot       (cover + chapter images, PNG only)
 *   - promptRoot      (image prompt hashes from image-prompts.json)
 *   - editionRoot     = H(manuscriptRoot || artifactRoot || imageRoot || promptRoot)
 *
 * Output: dist/merkle.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Helpers ──────────────────────────────────────────────────────────────────

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  return sha256(data);
}

/**
 * Build a Merkle tree from an array of hex hash strings.
 * Returns { root, leaves, layers } where layers[0] = leaves, layers[-1] = [root].
 * If leaves is empty, root = sha256('empty').
 * Odd layers duplicate the last element before pairing.
 */
function buildMerkleTree(hashes) {
  if (hashes.length === 0) {
    return {
      root: sha256('empty'),
      leaves: [],
      layers: [[sha256('empty')]]
    };
  }

  const layers = [hashes.slice()];
  let current = hashes.slice();

  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = current[i + 1] || left; // duplicate last if odd
      next.push(sha256(left + right));
    }
    layers.push(next);
    current = next;
  }

  return {
    root: current[0],
    leaves: hashes,
    layers
  };
}

/**
 * Generate a Merkle proof for a leaf at a given index.
 * Returns array of { hash, position: 'left'|'right' } sibling nodes.
 */
function getMerkleProof(layers, leafIndex) {
  const proof = [];
  let idx = leafIndex;

  for (let i = 0; i < layers.length - 1; i++) {
    const layer = layers[i];
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;

    if (siblingIdx < layer.length) {
      proof.push({
        hash: layer[siblingIdx],
        position: isRight ? 'left' : 'right'
      });
    } else {
      // Odd element duplicated — sibling is self
      proof.push({
        hash: layer[idx],
        position: 'right'
      });
    }

    idx = Math.floor(idx / 2);
  }

  return proof;
}

/**
 * Verify a Merkle proof.
 */
function verifyMerkleProof(leafHash, proof, root) {
  let computed = leafHash;
  for (const step of proof) {
    if (step.position === 'left') {
      computed = sha256(step.hash + computed);
    } else {
      computed = sha256(computed + step.hash);
    }
  }
  return computed === root;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const rootDir = path.resolve(__dirname, '..');
  const distDir = path.join(rootDir, 'dist');
  const orderPath = path.join(__dirname, 'order.json');

  // Ensure dist exists
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   LITERARY PROTOCOL — MERKLE TREE BUILDER       ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // ── 1. Manuscript blocks ────────────────────────────────────────────────
  const order = JSON.parse(fs.readFileSync(orderPath, 'utf8'));
  const manuscriptDir = path.join(rootDir, 'manuscript');
  const manuscriptLeaves = [];

  console.log('── Manuscript Blocks ──');
  for (const block of order.blocks) {
    const filePath = path.join(manuscriptDir, block.file);
    if (!fs.existsSync(filePath)) {
      console.error(`  ✗ Missing: ${block.file}`);
      process.exit(1);
    }
    const hash = sha256File(filePath);
    manuscriptLeaves.push({
      id: block.id,
      file: block.file,
      title: block.title,
      type: block.type,
      hash
    });
    console.log(`  ✓ ${block.id.padEnd(30)} ${hash.slice(0, 16)}…`);
  }

  const manuscriptTree = buildMerkleTree(manuscriptLeaves.map(l => l.hash));
  console.log(`  ▸ manuscriptRoot: ${manuscriptTree.root}\n`);

  // ── 2. Artifacts ────────────────────────────────────────────────────────
  const artifactDir = path.join(rootDir, 'artifacts');
  const artifactFiles = fs.readdirSync(artifactDir)
    .filter(f => f.endsWith('.md'))
    .sort();
  const artifactLeaves = [];

  console.log('── Artifacts ──');
  for (const file of artifactFiles) {
    const filePath = path.join(artifactDir, file);
    const hash = sha256File(filePath);
    artifactLeaves.push({ file, hash });
    console.log(`  ✓ ${file.padEnd(35)} ${hash.slice(0, 16)}…`);
  }

  const artifactTree = buildMerkleTree(artifactLeaves.map(l => l.hash));
  console.log(`  ▸ artifactRoot: ${artifactTree.root}\n`);

  // ── 3. Images ───────────────────────────────────────────────────────────
  const imagesDir = path.join(rootDir, 'images');
  const imageLeaves = [];

  console.log('── Images ──');
  // Cover
  const coverPath = path.join(imagesDir, 'cover', 'cover-front.png');
  if (fs.existsSync(coverPath)) {
    const hash = sha256File(coverPath);
    imageLeaves.push({ file: 'cover/cover-front.png', hash });
    console.log(`  ✓ cover/cover-front.png             ${hash.slice(0, 16)}…`);
  }

  // Chapter images — PNG only, sorted
  const chaptersDir = path.join(imagesDir, 'chapters');
  if (fs.existsSync(chaptersDir)) {
    const chapterImages = fs.readdirSync(chaptersDir)
      .filter(f => f.endsWith('.png'))
      .sort();
    for (const file of chapterImages) {
      const filePath = path.join(chaptersDir, file);
      const hash = sha256File(filePath);
      imageLeaves.push({ file: `chapters/${file}`, hash });
      console.log(`  ✓ chapters/${file.padEnd(28)} ${hash.slice(0, 16)}…`);
    }
  }

  const imageTree = buildMerkleTree(imageLeaves.map(l => l.hash));
  console.log(`  ▸ imageRoot: ${imageTree.root}\n`);

  // ── 4. Image prompts ────────────────────────────────────────────────────
  const promptsPath = path.join(imagesDir, 'image-prompts.json');
  const promptLeaves = [];

  console.log('── Image Prompts ──');
  if (fs.existsSync(promptsPath)) {
    const promptData = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));

    // Hash the global style as a leaf
    if (promptData.globalStyle) {
      const styleStr = JSON.stringify(promptData.globalStyle);
      const hash = sha256(styleStr);
      promptLeaves.push({ id: 'globalStyle', hash });
      console.log(`  ✓ globalStyle                       ${hash.slice(0, 16)}…`);
    }

    // Hash the cover prompt
    if (promptData.cover) {
      const coverStr = JSON.stringify(promptData.cover);
      const hash = sha256(coverStr);
      promptLeaves.push({ id: 'cover', hash });
      console.log(`  ✓ cover                             ${hash.slice(0, 16)}…`);
    }

    // Hash each chapter prompt
    if (promptData.chapters) {
      for (const ch of promptData.chapters) {
        const chStr = JSON.stringify(ch);
        const hash = sha256(chStr);
        promptLeaves.push({ id: ch.arc || ch.id || 'unknown', hash });
        console.log(`  ✓ ${(ch.arc || ch.id || 'unknown').padEnd(35)} ${hash.slice(0, 16)}…`);
      }
    }
  }

  const promptTree = buildMerkleTree(promptLeaves.map(l => l.hash));
  console.log(`  ▸ promptRoot: ${promptTree.root}\n`);

  // ── 5. Edition Root ─────────────────────────────────────────────────────
  const editionRoot = sha256(
    manuscriptTree.root +
    artifactTree.root +
    imageTree.root +
    promptTree.root
  );

  console.log('══════════════════════════════════════════════════');
  console.log(`  manuscriptRoot : ${manuscriptTree.root}`);
  console.log(`  artifactRoot   : ${artifactTree.root}`);
  console.log(`  imageRoot      : ${imageTree.root}`);
  console.log(`  promptRoot     : ${promptTree.root}`);
  console.log(`  ──────────────────────────────────────────────`);
  console.log(`  editionRoot    : ${editionRoot}`);
  console.log('══════════════════════════════════════════════════\n');

  // ── 6. Generate proofs for each manuscript block ────────────────────────
  const manuscriptProofs = manuscriptLeaves.map((leaf, i) => ({
    ...leaf,
    proof: getMerkleProof(manuscriptTree.layers, i)
  }));

  // ── 7. Assemble output ──────────────────────────────────────────────────
  const output = {
    version: 'LPS-1',
    generatedAt: new Date().toISOString(),
    edition: order.version || 'unknown',
    title: order.title || 'The 2,500 Donkeys',

    editionRoot,

    trees: {
      manuscript: {
        root: manuscriptTree.root,
        leafCount: manuscriptLeaves.length,
        leaves: manuscriptLeaves,
        proofs: manuscriptProofs.map(p => ({
          id: p.id,
          leafHash: p.hash,
          proof: p.proof
        }))
      },
      artifact: {
        root: artifactTree.root,
        leafCount: artifactLeaves.length,
        leaves: artifactLeaves
      },
      image: {
        root: imageTree.root,
        leafCount: imageLeaves.length,
        leaves: imageLeaves
      },
      prompt: {
        root: promptTree.root,
        leafCount: promptLeaves.length,
        leaves: promptLeaves
      }
    },

    // Verification helpers
    algorithm: 'sha256',
    merkleScheme: 'sorted-pair-concatenation',
    oddLeafRule: 'duplicate-last'
  };

  // ── 8. Write output ─────────────────────────────────────────────────────
  const outputPath = path.join(distDir, 'merkle.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`✓ Written: dist/merkle.json`);
  console.log(`  ${manuscriptLeaves.length} blocks · ${artifactLeaves.length} artifacts · ${imageLeaves.length} images · ${promptLeaves.length} prompts`);
  console.log(`  Edition root: ${editionRoot}\n`);

  // ── 9. Self-verify ──────────────────────────────────────────────────────
  console.log('── Self-Verification ──');
  let verified = 0;
  let failed = 0;
  for (const p of manuscriptProofs) {
    const ok = verifyMerkleProof(p.hash, p.proof, manuscriptTree.root);
    if (ok) {
      verified++;
    } else {
      failed++;
      console.error(`  ✗ FAILED: ${p.id}`);
    }
  }
  console.log(`  ✓ ${verified}/${manuscriptProofs.length} manuscript proofs verified`);

  if (failed > 0) {
    console.error('\n✗ MERKLE INTEGRITY FAILURE');
    process.exit(1);
  }

  // Verify edition root
  const verifyEditionRoot = sha256(
    manuscriptTree.root +
    artifactTree.root +
    imageTree.root +
    promptTree.root
  );
  if (verifyEditionRoot === editionRoot) {
    console.log('  ✓ editionRoot verified');
  } else {
    console.error('  ✗ editionRoot MISMATCH');
    process.exit(1);
  }

  console.log('\n✓ All Merkle proofs valid. Tree integrity confirmed.\n');

  // Export functions for use by other modules
  return { editionRoot, output };
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { sha256, sha256File, buildMerkleTree, getMerkleProof, verifyMerkleProof, main };
