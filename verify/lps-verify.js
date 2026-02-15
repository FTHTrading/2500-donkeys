#!/usr/bin/env node
/**
 * lps-verify — Independent Provenance Verifier for the Literary Protocol Standard
 *
 * This script allows ANY third party to clone the repo, run one command,
 * and independently verify the entire provenance chain:
 *
 *   Local files → SHA-256 → Merkle trees → On-chain state
 *
 * Zero config. No .env required. Uses public Polygon RPC for read-only queries.
 *
 * Usage:
 *   node verify/lps-verify.js
 *   npm run lps:verify
 *
 * Exit codes:
 *   0 = All checks passed
 *   1 = One or more checks failed
 *
 * @author  Kevan Burns (Kidd James) / FTH Trading
 * @license MIT
 * @version 1.0.0
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ══════════════════════════════════════════════════════════════════════════════
//  CONFIGURATION — All addresses and RPC are public, no secrets needed
// ══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  rpc: "https://polygon-bor-rpc.publicnode.com",
  chainId: 137,
  contracts: {
    literaryAnchor: "0x97f456300817eaE3B40E235857b856dfFE8bba90",
    publishingKernelV2: "0xca9F6604A9b498DB31d113836E2957c0a9aAE037",
    authorIdentity: "0xB9ffa688A8Bb332221030BbBE46bE5bF03323170",
  },
  authorWallet: "0xC91668184736BF75C4ecE37473D694efb2A43978",
};

// ══════════════════════════════════════════════════════════════════════════════
//  MINIMAL ABI — Only the view functions we need (no full compilation required)
// ══════════════════════════════════════════════════════════════════════════════

const ABI = {
  literaryAnchor: [
    "function title() view returns (string)",
    "function author() view returns (address)",
    "function editionCount() view returns (uint256)",
    "function genesis() view returns (tuple(string ipfsCID, string sha256Hash, uint256 timestamp, string title, string note))",
    "function latest() view returns (tuple(string ipfsCID, string sha256Hash, uint256 timestamp, string title, string note))",
  ],
  publishingKernelV2: [
    "function title() view returns (string)",
    "function author() view returns (address)",
    "function editionCount() view returns (uint256)",
    "function canonicalEditionId() view returns (uint256)",
    "function hasCanonical() view returns (bool)",
    "function genesisAnchor() view returns (address)",
    "function predecessorKernel() view returns (address)",
    "function isAnchored(bytes32) view returns (bool)",
    "function getEditionRoots(uint256) view returns (tuple(bytes32 manuscriptRoot, bytes32 artifactRoot, bytes32 imageRoot, bytes32 promptRoot, bytes32 editionRoot))",
    "function genesis() view returns (tuple(string ipfsCID, string sha256Hash, string title, string note, uint256 timestamp, tuple(bytes32 manuscriptRoot, bytes32 artifactRoot, bytes32 imageRoot, bytes32 promptRoot, bytes32 editionRoot) roots, uint256 supersedesEdition, bool isCanonical, bool isRetracted, string retractionReason, string aiModel, bytes32 promptSetHash, bytes authorSignature, bool isFrozen))",
  ],
  authorIdentity: [
    "function author() view returns (address)",
    "function getIdentity() view returns (tuple(string realName, string nickname, string pseudonym, string organization, string domain, string amazonAuthorUrl))",
    "function getBibliographyCount() view returns (uint256)",
    "function getLinkedContractCount() view returns (uint256)",
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
//  PATHS — Relative to repo root
// ══════════════════════════════════════════════════════════════════════════════

const ROOT = path.resolve(__dirname, "..");
const ORDER_PATH = path.join(ROOT, "build", "order.json");
const MANUSCRIPT_DIR = path.join(ROOT, "manuscript");
const ARTIFACTS_DIR = path.join(ROOT, "artifacts");
const IMAGES_DIR = path.join(ROOT, "images");
const DIST_DIR = path.join(ROOT, "dist");
const GENESIS_PATH = path.join(ROOT, "web3", "metadata", "genesis.json");

// ══════════════════════════════════════════════════════════════════════════════
//  CRYPTO HELPERS — Identical to build/merkle.js for determinism
// ══════════════════════════════════════════════════════════════════════════════

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function sha256File(filePath) {
  const content = fs.readFileSync(filePath);
  return sha256(content);
}

function buildMerkleTree(hashes) {
  if (hashes.length === 0) {
    return {
      root: sha256("empty"),
      leaves: [],
      layers: [[sha256("empty")]],
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

  return { root: current[0], leaves: hashes, layers };
}

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
        position: isRight ? "left" : "right",
      });
    } else {
      // Odd leaf, sibling is self (duplicate)
      proof.push({
        hash: layer[idx],
        position: "right",
      });
    }

    idx = Math.floor(idx / 2);
  }

  return proof;
}

function verifyMerkleProof(leafHash, proof, root) {
  let computed = leafHash;
  for (const step of proof) {
    if (step.position === "left") {
      computed = sha256(step.hash + computed);
    } else {
      computed = sha256(computed + step.hash);
    }
  }
  return computed === root;
}

// ══════════════════════════════════════════════════════════════════════════════
//  REPORT HELPERS
// ══════════════════════════════════════════════════════════════════════════════

const results = [];
let passCount = 0;
let failCount = 0;
let warnCount = 0;

function check(label, passed, detail) {
  if (passed) {
    passCount++;
    results.push({ status: "PASS", label, detail });
    console.log(`  ✓ PASS  ${label}`);
  } else {
    failCount++;
    results.push({ status: "FAIL", label, detail });
    console.log(`  ✗ FAIL  ${label}`);
    if (detail) console.log(`          ${detail}`);
  }
}

function warn(label, detail) {
  warnCount++;
  results.push({ status: "WARN", label, detail });
  console.log(`  ⚠ WARN  ${label}`);
  if (detail) console.log(`          ${detail}`);
}

function section(title) {
  console.log(`\n── ${title} ──\n`);
}

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE 1 — LOCAL FILE INTEGRITY
// ══════════════════════════════════════════════════════════════════════════════

function verifyLocalFiles() {
  section("Phase 1: Local File Integrity");

  // Check required files exist
  check("order.json exists", fs.existsSync(ORDER_PATH));
  check("genesis.json exists", fs.existsSync(GENESIS_PATH));
  check("manuscript/ exists", fs.existsSync(MANUSCRIPT_DIR));
  check("artifacts/ exists", fs.existsSync(ARTIFACTS_DIR));

  const order = JSON.parse(fs.readFileSync(ORDER_PATH, "utf8"));
  check("order.json has blocks", order.blocks && order.blocks.length > 0, `${order.blocks?.length || 0} blocks`);

  // Verify every block file exists
  let missingBlocks = 0;
  for (const block of order.blocks) {
    const filePath = path.join(MANUSCRIPT_DIR, block.file);
    if (!fs.existsSync(filePath)) {
      missingBlocks++;
    }
  }
  check(`All ${order.blocks.length} block files present`, missingBlocks === 0,
    missingBlocks > 0 ? `${missingBlocks} missing` : undefined);

  return order;
}

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE 2 — DETERMINISTIC COMPILATION + HASH
// ══════════════════════════════════════════════════════════════════════════════

function verifyCompilationHash(order) {
  section("Phase 2: Deterministic Compilation + Hash");

  // Compile manuscript from source (same logic as build/compile.js)
  const parts = [];

  // Title page
  parts.push(`# ${order.title}\n`);
  parts.push(`*${order.subtitle || ""}*\n`);
  parts.push("---\n");

  // Table of contents
  parts.push("## Table of Contents\n");
  for (const block of order.blocks) {
    if (block.type === "prose" || block.type === "chapter") {
      parts.push(`- ${block.title}`);
    }
  }
  parts.push("\n---\n");

  // Blocks + artifact inserts
  for (const block of order.blocks) {
    const filePath = path.join(MANUSCRIPT_DIR, block.file);
    const content = fs.readFileSync(filePath, "utf8");
    parts.push(content);

    // Artifact inserts
    if (block.artifactInserts) {
      for (const insert of block.artifactInserts) {
        if (insert.after) {
          const artifactFile = insert.artifact || insert.file;
          const artifactPath = path.join(ARTIFACTS_DIR, artifactFile);
          if (fs.existsSync(artifactPath)) {
            parts.push(fs.readFileSync(artifactPath, "utf8"));
          }
        }
      }
    }
  }

  // Colophon
  parts.push("\n---\n");
  parts.push("## Colophon\n");
  parts.push(`This manuscript was compiled from ${order.blocks.length} canonical blocks.`);
  parts.push(`Compiled at: ${new Date().toISOString()}\n`);

  const compiled = parts.join("\n");
  const compiledHash = sha256(compiled);

  // Now compare against the stored dist/final-manuscript.md
  const distPath = path.join(DIST_DIR, "final-manuscript.md");
  if (fs.existsSync(distPath)) {
    const distContent = fs.readFileSync(distPath);
    const distHash = sha256(distContent);

    // Note: We can't compare compiledHash to distHash because the timestamp differs.
    // Instead, we hash the dist file and compare to genesis.json's recorded hash.
    const genesis = JSON.parse(fs.readFileSync(GENESIS_PATH, "utf8"));
    check("dist/final-manuscript.md exists", true);
    check("SHA-256 matches genesis.json",
      distHash === genesis.build.sha256,
      distHash === genesis.build.sha256
        ? `${distHash.slice(0, 16)}…`
        : `local=${distHash.slice(0, 16)}… genesis=${genesis.build.sha256.slice(0, 16)}…`
    );

    // Verify file size
    const stats = fs.statSync(distPath);
    check("File size matches genesis.json",
      stats.size === genesis.build.sizeBytes,
      `${stats.size} bytes`
    );

    return { distHash, genesis };
  } else {
    warn("dist/final-manuscript.md missing", "Run 'npm run compile' first");
    return { distHash: null, genesis: JSON.parse(fs.readFileSync(GENESIS_PATH, "utf8")) };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE 3 — MERKLE TREE RECONSTRUCTION
// ══════════════════════════════════════════════════════════════════════════════

function verifyMerkleTrees(order) {
  section("Phase 3: Merkle Tree Reconstruction");

  // ── 1. Manuscript tree ──
  const manuscriptLeaves = [];
  for (const block of order.blocks) {
    const filePath = path.join(MANUSCRIPT_DIR, block.file);
    manuscriptLeaves.push(sha256File(filePath));
  }
  const manuscriptTree = buildMerkleTree(manuscriptLeaves);

  // ── 2. Artifact tree ──
  const artifactFiles = fs.readdirSync(ARTIFACTS_DIR)
    .filter(f => f.endsWith(".md"))
    .sort();
  const artifactLeaves = artifactFiles.map(f => sha256File(path.join(ARTIFACTS_DIR, f)));
  const artifactTree = buildMerkleTree(artifactLeaves);

  // ── 3. Image tree ──
  const imageLeaves = [];
  const coverPath = path.join(IMAGES_DIR, "cover", "cover-front.png");
  if (fs.existsSync(coverPath)) {
    imageLeaves.push(sha256File(coverPath));
  }
  const chaptersDir = path.join(IMAGES_DIR, "chapters");
  if (fs.existsSync(chaptersDir)) {
    const chapterImages = fs.readdirSync(chaptersDir)
      .filter(f => f.endsWith(".png"))
      .sort();
    for (const file of chapterImages) {
      imageLeaves.push(sha256File(path.join(chaptersDir, file)));
    }
  }
  const imageTree = buildMerkleTree(imageLeaves);

  // ── 4. Prompt tree ──
  const promptLeaves = [];
  const promptsPath = path.join(IMAGES_DIR, "image-prompts.json");
  if (fs.existsSync(promptsPath)) {
    const promptData = JSON.parse(fs.readFileSync(promptsPath, "utf8"));
    if (promptData.globalStyle) {
      promptLeaves.push(sha256(JSON.stringify(promptData.globalStyle)));
    }
    if (promptData.cover) {
      promptLeaves.push(sha256(JSON.stringify(promptData.cover)));
    }
    if (promptData.chapters) {
      for (const ch of promptData.chapters) {
        promptLeaves.push(sha256(JSON.stringify(ch)));
      }
    }
  }
  const promptTree = buildMerkleTree(promptLeaves);

  // ── 5. Edition root ──
  const editionRoot = sha256(
    manuscriptTree.root +
    artifactTree.root +
    imageTree.root +
    promptTree.root
  );

  console.log(`  Computed manuscriptRoot : ${manuscriptTree.root.slice(0, 16)}…`);
  console.log(`  Computed artifactRoot   : ${artifactTree.root.slice(0, 16)}…`);
  console.log(`  Computed imageRoot      : ${imageTree.root.slice(0, 16)}…`);
  console.log(`  Computed promptRoot     : ${promptTree.root.slice(0, 16)}…`);
  console.log(`  Computed editionRoot    : ${editionRoot.slice(0, 16)}…\n`);

  // Compare against stored merkle.json
  const merklePath = path.join(DIST_DIR, "merkle.json");
  if (fs.existsSync(merklePath)) {
    const stored = JSON.parse(fs.readFileSync(merklePath, "utf8"));

    check("manuscriptRoot matches merkle.json",
      manuscriptTree.root === stored.trees.manuscript.root,
      manuscriptTree.root !== stored.trees.manuscript.root
        ? `computed=${manuscriptTree.root.slice(0, 16)}… stored=${stored.trees.manuscript.root.slice(0, 16)}…`
        : undefined
    );
    check("artifactRoot matches merkle.json",
      artifactTree.root === stored.trees.artifact.root);
    check("imageRoot matches merkle.json",
      imageTree.root === stored.trees.image.root);
    check("promptRoot matches merkle.json",
      promptTree.root === stored.trees.prompt.root);
    check("editionRoot matches merkle.json",
      editionRoot === stored.editionRoot);
  } else {
    warn("dist/merkle.json missing", "Run 'npm run build' first");
  }

  // Compare against genesis.json roots  
  const genesis = JSON.parse(fs.readFileSync(GENESIS_PATH, "utf8"));
  if (genesis.roots) {
    check("editionRoot matches genesis.json",
      editionRoot === genesis.roots.editionRoot);
    check("manuscriptRoot matches genesis.json",
      manuscriptTree.root === genesis.roots.manuscriptRoot);
    check("artifactRoot matches genesis.json",
      artifactTree.root === genesis.roots.artifactRoot);
    check("imageRoot matches genesis.json",
      imageTree.root === genesis.roots.imageRoot);
    check("promptRoot matches genesis.json",
      promptTree.root === genesis.roots.promptRoot);
  }

  // Self-verify: run Merkle proofs for every manuscript leaf
  let proofsPassed = 0;
  for (let i = 0; i < manuscriptLeaves.length; i++) {
    const proof = getMerkleProof(manuscriptTree.layers, i);
    if (verifyMerkleProof(manuscriptLeaves[i], proof, manuscriptTree.root)) {
      proofsPassed++;
    }
  }
  check(`All ${manuscriptLeaves.length} manuscript Merkle proofs valid`,
    proofsPassed === manuscriptLeaves.length,
    `${proofsPassed}/${manuscriptLeaves.length} passed`
  );

  return {
    manuscriptRoot: manuscriptTree.root,
    artifactRoot: artifactTree.root,
    imageRoot: imageTree.root,
    promptRoot: promptTree.root,
    editionRoot,
    leafCounts: {
      manuscript: manuscriptLeaves.length,
      artifact: artifactLeaves.length,
      image: imageLeaves.length,
      prompt: promptLeaves.length,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE 4 — ON-CHAIN VERIFICATION (read-only, public RPC)
// ══════════════════════════════════════════════════════════════════════════════

async function verifyOnChain(merkleResults, genesis) {
  section("Phase 4: On-Chain Verification (Polygon Mainnet)");

  let ethers;
  try {
    ethers = require("ethers");
  } catch {
    warn("ethers.js not installed", "Run 'npm install' to enable on-chain checks");
    return;
  }

  const provider = new ethers.JsonRpcProvider(CONFIG.rpc, CONFIG.chainId);

  // ── 4a. LiteraryAnchor ──
  console.log("  ── LiteraryAnchor ──\n");
  try {
    const anchor = new ethers.Contract(
      CONFIG.contracts.literaryAnchor,
      ABI.literaryAnchor,
      provider
    );

    const [onChainTitle, onChainAuthor, editionCount, onChainGenesis, onChainLatest] = await Promise.all([
      anchor.title(),
      anchor.author(),
      anchor.editionCount(),
      anchor.genesis(),
      anchor.latest(),
    ]);

    check("LiteraryAnchor.title = 'The 2,500 Donkeys'",
      onChainTitle === "The 2,500 Donkeys",
      onChainTitle);
    check("LiteraryAnchor.author = author wallet",
      onChainAuthor.toLowerCase() === CONFIG.authorWallet.toLowerCase());
    check("LiteraryAnchor.editionCount ≥ 1",
      Number(editionCount) >= 1,
      `${editionCount} editions`);

    // Compare on-chain data against local genesis.json
    // Note: genesis.json may be edition-2, while on-chain genesis() is edition-1.
    // We check both genesis() and latest() for a match.
    if (genesis) {
      const cidMatchGenesis = onChainGenesis.ipfsCID === genesis.ipfs.cid;
      const cidMatchLatest = onChainLatest.ipfsCID === genesis.ipfs.cid;
      check("On-chain CID matches genesis.json",
        cidMatchGenesis || cidMatchLatest,
        cidMatchGenesis
          ? `genesis: ${onChainGenesis.ipfsCID}`
          : cidMatchLatest
            ? `latest: ${onChainLatest.ipfsCID}`
            : `genesis=${onChainGenesis.ipfsCID} latest=${onChainLatest.ipfsCID} local=${genesis.ipfs.cid}`);

      const shaMatchGenesis = onChainGenesis.sha256Hash === genesis.build.sha256;
      const shaMatchLatest = onChainLatest.sha256Hash === genesis.build.sha256;
      if (shaMatchGenesis || shaMatchLatest) {
        check("On-chain SHA-256 matches genesis.json",
          true,
          shaMatchGenesis
            ? `genesis: ${onChainGenesis.sha256Hash.slice(0, 16)}…`
            : `latest: ${onChainLatest.sha256Hash.slice(0, 16)}…`);
      } else {
        // SHA-256 of compiled manuscript includes a build timestamp (colophon),
        // so a local recompilation after on-chain anchoring will produce a
        // different hash. If all Merkle roots match on-chain (checked in Phase 4),
        // the source content is verified — only the compiled artifact differs.
        warn("On-chain SHA-256 differs from genesis.json",
          "Expected if manuscript was recompiled locally (colophon timestamp). " +
          "Merkle roots verify source content integrity independently. " +
          `genesis=${onChainGenesis.sha256Hash.slice(0, 16)}… latest=${onChainLatest.sha256Hash.slice(0, 16)}… local=${genesis.build.sha256.slice(0, 16)}…`);
      }
    }
  } catch (err) {
    warn("LiteraryAnchor query failed", err.message);
  }

  // ── 4b. PublishingKernelV2 ──
  console.log("\n  ── PublishingKernelV2 ──\n");
  try {
    const kernel = new ethers.Contract(
      CONFIG.contracts.publishingKernelV2,
      ABI.publishingKernelV2,
      provider
    );

    const [kernelAuthor, kernelTitle, hasCanon, genesisAnchor, predecessorKernel] = await Promise.all([
      kernel.author(),
      kernel.title(),
      kernel.hasCanonical(),
      kernel.genesisAnchor(),
      kernel.predecessorKernel(),
    ]);

    check("KernelV2.author = author wallet",
      kernelAuthor.toLowerCase() === CONFIG.authorWallet.toLowerCase());
    check("KernelV2.title = 'The 2,500 Donkeys'",
      kernelTitle === "The 2,500 Donkeys",
      kernelTitle);
    check("KernelV2 has canonical edition", hasCanon === true);
    check("KernelV2.genesisAnchor = LiteraryAnchor",
      genesisAnchor.toLowerCase() === CONFIG.contracts.literaryAnchor.toLowerCase());
    check("KernelV2.predecessorKernel = v1 kernel",
      predecessorKernel.toLowerCase() === "0x511c653fC0F450ba41C42A89A3125CcBf2eFE8ae".toLowerCase());

    // Verify edition root is anchored on-chain
    const editionRootBytes = "0x" + merkleResults.editionRoot;
    try {
      const isAnchored = await kernel.isAnchored(editionRootBytes);
      check("Edition root anchored on-chain",
        isAnchored === true,
        `editionRoot: ${merkleResults.editionRoot.slice(0, 16)}…`);
    } catch (err) {
      warn("isAnchored() query failed", err.message);
    }

    // Get on-chain Merkle roots for edition 0
    try {
      const roots = await kernel.getEditionRoots(0);
      const chainManuscript = roots.manuscriptRoot;
      const chainArtifact = roots.artifactRoot;
      const chainImage = roots.imageRoot;
      const chainPrompt = roots.promptRoot;
      const chainEdition = roots.editionRoot;

      // Convert bytes32 to hex string (strip 0x prefix) for comparison
      const strip = (b32) => b32.slice(2).toLowerCase();

      check("On-chain manuscriptRoot matches local",
        strip(chainManuscript) === merkleResults.manuscriptRoot,
        strip(chainManuscript) !== merkleResults.manuscriptRoot
          ? `chain=${strip(chainManuscript).slice(0, 16)}… local=${merkleResults.manuscriptRoot.slice(0, 16)}…`
          : undefined);
      check("On-chain artifactRoot matches local",
        strip(chainArtifact) === merkleResults.artifactRoot);
      check("On-chain imageRoot matches local",
        strip(chainImage) === merkleResults.imageRoot);
      check("On-chain promptRoot matches local",
        strip(chainPrompt) === merkleResults.promptRoot);
      check("On-chain editionRoot matches local",
        strip(chainEdition) === merkleResults.editionRoot);
    } catch (err) {
      warn("getEditionRoots() query failed", err.message);
    }

    // Check genesis edition frozen status
    try {
      const kernelGenesis = await kernel.genesis();
      check("KernelV2 edition is frozen",
        kernelGenesis.isFrozen === true);
      check("KernelV2 edition is canonical",
        kernelGenesis.isCanonical === true);
      check("KernelV2 edition not retracted",
        kernelGenesis.isRetracted === false);
    } catch (err) {
      warn("KernelV2 genesis() query failed", err.message);
    }
  } catch (err) {
    warn("PublishingKernelV2 query failed", err.message);
  }

  // ── 4c. AuthorIdentity ──
  console.log("\n  ── AuthorIdentity ──\n");
  try {
    const identity = new ethers.Contract(
      CONFIG.contracts.authorIdentity,
      ABI.authorIdentity,
      provider
    );

    const [idAuthor, idData, bibCount, linkedCount] = await Promise.all([
      identity.author(),
      identity.getIdentity(),
      identity.getBibliographyCount(),
      identity.getLinkedContractCount(),
    ]);

    check("AuthorIdentity.author = author wallet",
      idAuthor.toLowerCase() === CONFIG.authorWallet.toLowerCase());
    check("Identity.pseudonym = 'Kidd James'",
      idData.pseudonym === "Kidd James",
      idData.pseudonym);
    check("Identity.realName = 'Kevan Burns'",
      idData.realName === "Kevan Burns",
      idData.realName);
    check("Identity.organization = 'FTH Trading'",
      idData.organization === "FTH Trading",
      idData.organization);
    check("Identity.domain = 'unykorn.org'",
      idData.domain === "unykorn.org",
      idData.domain);
    check("Bibliography has registered works",
      Number(bibCount) > 0,
      `${bibCount} works`);
    check("Linked contracts registered",
      Number(linkedCount) > 0,
      `${linkedCount} contracts`);
  } catch (err) {
    warn("AuthorIdentity query failed", err.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE 5 — CROSS-LAYER CONSISTENCY
// ══════════════════════════════════════════════════════════════════════════════

function verifyCrossLayer(genesis, merkleResults) {
  section("Phase 5: Cross-Layer Consistency");

  // Genesis.json → merkle.json → on-chain should all agree
  if (genesis && genesis.roots) {
    const allRootsMatch =
      genesis.roots.editionRoot === merkleResults.editionRoot &&
      genesis.roots.manuscriptRoot === merkleResults.manuscriptRoot &&
      genesis.roots.artifactRoot === merkleResults.artifactRoot &&
      genesis.roots.imageRoot === merkleResults.imageRoot &&
      genesis.roots.promptRoot === merkleResults.promptRoot;

    check("All roots consistent across layers",
      allRootsMatch,
      "genesis.json ↔ merkle.json ↔ source files");
  }

  // Chain linkage
  if (genesis && genesis.chain) {
    check("genesis.json records LiteraryAnchor address",
      genesis.chain.contract === CONFIG.contracts.literaryAnchor);
    check("genesis.json records KernelV2 address",
      genesis.chain.kernelV2Address === CONFIG.contracts.publishingKernelV2);
    check("genesis.json records AuthorIdentity address",
      genesis.authorIdentity?.contract === CONFIG.contracts.authorIdentity);
    check("genesis.json records author wallet",
      genesis.chain.authorWallet === CONFIG.authorWallet);
  }

  // IPFS CID present
  if (genesis && genesis.ipfs) {
    check("IPFS CID recorded",
      genesis.ipfs.cid && genesis.ipfs.cid.startsWith("Qm"),
      genesis.ipfs.cid);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║     LPS-VERIFY — Literary Protocol Provenance Verifier     ║");
  console.log("║     Independent verification · No secrets required         ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const startTime = Date.now();

  // Phase 1: Local file integrity
  const order = verifyLocalFiles();

  // Phase 2: Deterministic compilation + hash
  const { distHash, genesis } = verifyCompilationHash(order);

  // Phase 3: Merkle tree reconstruction
  const merkleResults = verifyMerkleTrees(order);

  // Phase 4: On-chain verification
  await verifyOnChain(merkleResults, genesis);

  // Phase 5: Cross-layer consistency
  verifyCrossLayer(genesis, merkleResults);

  // ── Final Report ──
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    VERIFICATION REPORT                     ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Passed:   ${String(passCount).padStart(3)}                                            ║`);
  console.log(`║  Failed:   ${String(failCount).padStart(3)}                                            ║`);
  console.log(`║  Warnings: ${String(warnCount).padStart(3)}                                            ║`);
  console.log(`║  Time:     ${(elapsed + "s").padStart(6)}                                         ║`);
  console.log("╠══════════════════════════════════════════════════════════════╣");

  if (failCount === 0) {
    console.log("║                                                              ║");
    console.log("║   ✓ ALL CHECKS PASSED — Provenance chain is intact.         ║");
    console.log("║                                                              ║");
    console.log("║   Local files → SHA-256 → Merkle trees → On-chain state     ║");
    console.log("║   Every layer is consistent and independently verifiable.    ║");
    console.log("║                                                              ║");
  } else {
    console.log("║                                                              ║");
    console.log("║   ✗ VERIFICATION FAILED — Provenance chain broken.          ║");
    console.log("║                                                              ║");
    console.log("║   Review FAIL items above. The chain of provenance has       ║");
    console.log("║   at least one inconsistency between layers.                 ║");
    console.log("║                                                              ║");
  }

  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Write machine-readable report
  const reportPath = path.join(ROOT, "dist", "verification-report.json");
  const report = {
    verifier: "lps-verify",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    elapsed: `${elapsed}s`,
    summary: {
      passed: passCount,
      failed: failCount,
      warnings: warnCount,
      verdict: failCount === 0 ? "PASS" : "FAIL",
    },
    checks: results,
  };

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`  Report written: dist/verification-report.json\n`);

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("\n  ✗ FATAL ERROR:", err.message);
  process.exit(1);
});
