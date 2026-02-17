#!/usr/bin/env node
/**
 * anchor-stories.js — Anchor Private Placement Programs on Polygon
 * ═════════════════════════════════════════════════
 *
 * Anchors the Private Placement Programs stories collection on the existing
 * LiteraryAnchor contract (0x97f4...b890) on Polygon Mainnet.
 *
 * This creates a new edition entry with:
 *   - Combined SHA-256 hash of the full manuscript
 *   - IPFS CID (once pinned — pass via --cid flag or update here)
 *   - Edition note linking to the Merkle tree
 *
 * Also anchors on PublishingKernelV2 (0xca9F...C037) with full
 * Merkle roots and ECDSA signature for maximum provenance.
 *
 * Usage:
 *   node stories/anchor-stories.js                           # Dry run (preview)
 *   node stories/anchor-stories.js --execute                 # Anchor on Polygon
 *   node stories/anchor-stories.js --execute --cid QmXYZ...  # With IPFS CID
 *
 * Requires: PRIVATE_KEY in .env
 */

require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ── Paths ────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT, "dist");
const MERKLE_FILE = path.join(DIST_DIR, "stories-merkle.json");
const AUDIO_MANIFEST = path.join(DIST_DIR, "stories-audio-manifest.json");
const DEPLOYMENT_FILE = path.join(ROOT, "web3", "metadata", "stories-deployment.json");

// ── Contract addresses ───────────────────────────────────────
const LITERARY_ANCHOR = "0x97f456300817eaE3B40E235857b856dfFE8bba90";
const PUBLISHING_KERNEL_V2 = "0xca9F6604A9b498DB31d113836E2957c0a9aAE037";

// ── ABIs ─────────────────────────────────────────────────────
const ANCHOR_ABI = [
  "function anchorEdition(string calldata _ipfsCID, string calldata _sha256Hash, string calldata _note) external",
  "function editionCount() external view returns (uint256)",
  "function latest() external view returns (tuple(string ipfsCID, string sha256Hash, uint256 timestamp, string title, string note))",
];

const KERNEL_V2_ABI = [
  "function anchorEdition(string calldata _ipfsCID, string calldata _sha256Hash, string calldata _note, tuple(bytes32 manuscriptRoot, bytes32 artifactRoot, bytes32 imageRoot, bytes32 promptRoot, bytes32 editionRoot) _roots, bytes calldata _authorSignature) external returns (uint256)",
  "function editionCount() external view returns (uint256)",
  "function getEdition(uint256 _id) external view returns (tuple(string ipfsCID, string sha256Hash, string title, string note, uint256 timestamp, tuple(bytes32 manuscriptRoot, bytes32 artifactRoot, bytes32 imageRoot, bytes32 promptRoot, bytes32 editionRoot) roots, uint256 supersedesEdition, bool isCanonical, bool isRetracted, string retractionReason, string aiModel, bytes32 promptSetHash, bytes authorSignature, bool isFrozen))",
  "function freezeEdition(uint256 _editionId) external",
];

// ── CLI flags ────────────────────────────────────────────────
const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");
const cidIdx = args.indexOf("--cid");
const IPFS_CID = cidIdx >= 0 && args[cidIdx + 1] ? args[cidIdx + 1] : "pending-ipfs-pin";

// ── Helpers ──────────────────────────────────────────────────

function sha256hex(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function bytes32(hexStr) {
  return "0x" + hexStr;
}

async function getProvider() {
  const rpcs = [
    "https://rpc.ankr.com/polygon",
    "https://1rpc.io/matic",
    "https://polygon-bor-rpc.publicnode.com",
    "https://polygon.llamarpc.com",
  ];
  const network = new ethers.Network("polygon", 137);

  for (const rpc of rpcs) {
    try {
      const p = new ethers.JsonRpcProvider(rpc, network, { staticNetwork: network });
      await p.getBlockNumber();
      return p;
    } catch (e) {
      // try next
    }
  }
  throw new Error("All Polygon RPCs failed");
}

async function main() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("  PRIVATE PLACEMENT PROGRAMS — Polygon Anchor");
  console.log("══════════════════════════════════════════════════\n");

  // ── Load Merkle data ───────────────────────────────────────
  if (!fs.existsSync(MERKLE_FILE)) {
    console.error("✗ stories-merkle.json not found. Run: node stories/stories-merkle.js");
    process.exit(1);
  }

  const merkle = JSON.parse(fs.readFileSync(MERKLE_FILE, "utf-8"));
  const manuscriptRoot = merkle.roots.manuscriptRoot;
  const editionRoot = merkle.roots.editionRoot;
  const combinedHash = merkle.combinedHash;

  // Check for audio manifest
  let audioRoot = null;
  let audioEditionRoot = null;
  if (fs.existsSync(AUDIO_MANIFEST)) {
    const audioManifest = JSON.parse(fs.readFileSync(AUDIO_MANIFEST, "utf-8"));
    audioRoot = audioManifest.audioRoot;
    audioEditionRoot = audioManifest.audioEditionRoot;
  }

  console.log("  Merkle Data:");
  console.log(`    manuscriptRoot:   ${manuscriptRoot}`);
  console.log(`    editionRoot:      ${editionRoot}`);
  console.log(`    combinedHash:     ${combinedHash}`);
  if (audioRoot) {
    console.log(`    audioRoot:        ${audioRoot}`);
    console.log(`    audioEditionRoot: ${audioEditionRoot}`);
  }
  console.log(`    IPFS CID:         ${IPFS_CID}`);
  console.log(`    Files:            ${merkle.fileCount}`);
  console.log(`    Size:             ${(merkle.totalSizeBytes / 1024).toFixed(0)} KB`);
  console.log();

  // ── Edition note ───────────────────────────────────────────
  const note = `Private Placement Programs — ${merkle.fileCount} files, ${merkle.totalSizeBytes} bytes. Stories collection.${audioRoot ? " Audio rendered via Kokoro TTS." : ""}`;

  if (!EXECUTE) {
    console.log("  [DRY RUN] Would anchor:");
    console.log(`    Contract 1: LiteraryAnchor ${LITERARY_ANCHOR}`);
    console.log(`    Contract 2: PublishingKernelV2 ${PUBLISHING_KERNEL_V2}`);
    console.log(`    CID:        ${IPFS_CID}`);
    console.log(`    Hash:       ${combinedHash}`);
    console.log(`    Note:       ${note}`);
    console.log();
    console.log("  To execute: node stories/anchor-stories.js --execute");
    console.log("  With CID:   node stories/anchor-stories.js --execute --cid QmXYZ...\n");
    return;
  }

  // ── Connect to Polygon ─────────────────────────────────────
  if (!process.env.PRIVATE_KEY) {
    console.error("✗ PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  console.log("  Connecting to Polygon...");
  const provider = await getProvider();
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const balance = await provider.getBalance(wallet.address);
  console.log(`  Author:  ${wallet.address}`);
  console.log(`  Balance: ${ethers.formatEther(balance)} POL\n`);

  // ── 1. Anchor on LiteraryAnchor ────────────────────────────
  console.log("── Step 1: LiteraryAnchor ──\n");

  const anchor = new ethers.Contract(LITERARY_ANCHOR, ANCHOR_ABI, wallet);
  const countBefore = await anchor.editionCount();
  console.log(`  Editions on-chain: ${countBefore}`);
  console.log(`  Anchoring stories collection...`);

  const gasPriceHex = await provider.send("eth_gasPrice", []);
  const gasPrice = BigInt(gasPriceHex) * 120n / 100n;

  const tx1 = await anchor.anchorEdition(IPFS_CID, combinedHash, note, { gasPrice });
  console.log(`  TX sent: ${tx1.hash}`);
  console.log(`  Waiting for confirmation...`);

  const receipt1 = await tx1.wait();
  console.log(`  ✓ Confirmed in block ${receipt1.blockNumber}`);
  console.log(`  Gas used: ${receipt1.gasUsed.toString()}`);
  console.log(`  Polygonscan: https://polygonscan.com/tx/${tx1.hash}\n`);

  // ── 2. Anchor on PublishingKernelV2 ────────────────────────
  console.log("── Step 2: PublishingKernelV2 ──\n");

  const kernel = new ethers.Contract(PUBLISHING_KERNEL_V2, KERNEL_V2_ABI, wallet);

  // Build MerkleRoots struct
  // For stories: manuscriptRoot is the main root, others are zeroed
  // since we don't have separate artifact/image/prompt trees yet
  const emptyRoot = "0x" + "0".repeat(64);
  const roots = {
    manuscriptRoot: bytes32(manuscriptRoot),
    artifactRoot: emptyRoot,
    imageRoot: emptyRoot,
    promptRoot: emptyRoot,
    editionRoot: bytes32(editionRoot),
  };

  // Sign the editionRoot with author wallet (EIP-191 personal_sign)
  const editionRootBytes32 = bytes32(editionRoot);
  const signature = await wallet.signMessage(ethers.getBytes(editionRootBytes32));
  console.log(`  Signed editionRoot: ${editionRootBytes32}`);
  console.log(`  Signature: ${signature.slice(0, 20)}...`);

  const kernelCountBefore = await kernel.editionCount();
  console.log(`  Kernel editions: ${kernelCountBefore}`);
  console.log(`  Anchoring with ECDSA signature...`);

  const tx2 = await kernel.anchorEdition(IPFS_CID, combinedHash, note, roots, signature, { gasPrice });
  console.log(`  TX sent: ${tx2.hash}`);
  console.log(`  Waiting for confirmation...`);

  const receipt2 = await tx2.wait();
  const kernelCountAfter = await kernel.editionCount();
  const newEditionId = Number(kernelCountAfter) - 1;

  console.log(`  ✓ Confirmed in block ${receipt2.blockNumber}`);
  console.log(`  Gas used: ${receipt2.gasUsed.toString()}`);
  console.log(`  Edition ID: ${newEditionId}`);
  console.log(`  Polygonscan: https://polygonscan.com/tx/${tx2.hash}\n`);

  // ── 3. Freeze the edition ──────────────────────────────────
  console.log("── Step 3: Freeze Edition ──\n");
  console.log(`  Freezing edition ${newEditionId}...`);

  const tx3 = await kernel.freezeEdition(newEditionId, { gasPrice });
  console.log(`  TX sent: ${tx3.hash}`);
  const receipt3 = await tx3.wait();
  console.log(`  ✓ Edition ${newEditionId} frozen in block ${receipt3.blockNumber}`);
  console.log(`  Polygonscan: https://polygonscan.com/tx/${tx3.hash}\n`);

  // ── 4. Save deployment receipt ─────────────────────────────
  const deployment = {
    title: "Private Placement Programs",
    subtitle: "Thirteen Stories from the War Room",
    author: "Kidd James",
    anchoredAt: new Date().toISOString(),

    literaryAnchor: {
      contract: LITERARY_ANCHOR,
      txHash: tx1.hash,
      blockNumber: receipt1.blockNumber,
      gasUsed: receipt1.gasUsed.toString(),
    },

    publishingKernelV2: {
      contract: PUBLISHING_KERNEL_V2,
      txHash: tx2.hash,
      blockNumber: receipt2.blockNumber,
      gasUsed: receipt2.gasUsed.toString(),
      editionId: newEditionId,
      frozen: true,
      freezeTxHash: tx3.hash,
      freezeBlockNumber: receipt3.blockNumber,
    },

    merkle: {
      manuscriptRoot,
      editionRoot,
      audioRoot,
      audioEditionRoot,
    },

    manuscript: {
      combinedHash,
      fileCount: merkle.fileCount,
      totalSizeBytes: merkle.totalSizeBytes,
    },

    ipfs: {
      cid: IPFS_CID,
    },

    authorWallet: wallet.address,
    network: "polygon-mainnet",
    chainId: 137,

    explorer: {
      anchor: `https://polygonscan.com/tx/${tx1.hash}`,
      kernel: `https://polygonscan.com/tx/${tx2.hash}`,
      freeze: `https://polygonscan.com/tx/${tx3.hash}`,
    },
  };

  fs.writeFileSync(DEPLOYMENT_FILE, JSON.stringify(deployment, null, 2));
  console.log(`✓ Deployment receipt: web3/metadata/stories-deployment.json`);

  // ── Summary ────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════");
  console.log("  PRIVATE PLACEMENT PROGRAMS — Anchored on Polygon ✓");
  console.log("══════════════════════════════════════════════════");
  console.log(`  LiteraryAnchor TX:  ${tx1.hash}`);
  console.log(`  KernelV2 TX:        ${tx2.hash}`);
  console.log(`  Freeze TX:          ${tx3.hash}`);
  console.log(`  Edition ID:         ${newEditionId} (FROZEN)`);
  console.log(`  manuscriptRoot:     ${manuscriptRoot.slice(0, 16)}…`);
  console.log(`  editionRoot:        ${editionRoot.slice(0, 16)}…`);
  console.log(`  IPFS CID:           ${IPFS_CID}`);
  console.log("══════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
