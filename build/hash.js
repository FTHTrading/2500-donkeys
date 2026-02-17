/**
 * hash.js — Genesis Hash Generator (LPS-1 upgraded)
 *
 * Reads the compiled final-manuscript.md and generates SHA-256.
 * Also integrates Merkle tree data (edition root, sub-roots) if available.
 * Stores everything in web3/metadata/genesis.json.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT, "dist");
const METADATA_DIR = path.join(ROOT, "web3", "metadata");
const MANUSCRIPT_PATH = path.join(DIST_DIR, "final-manuscript.md");
const GENESIS_PATH = path.join(METADATA_DIR, "genesis.json");
const MERKLE_PATH = path.join(DIST_DIR, "merkle.json");
const REPRODUCIBLE = process.argv.includes("--reproducible");

function generateHash() {
  if (!fs.existsSync(MANUSCRIPT_PATH)) {
    console.error("[HASH] ❌ final-manuscript.md not found. Run compile.js first.");
    process.exit(1);
  }

  // Ensure metadata dir exists
  if (!fs.existsSync(METADATA_DIR)) {
    fs.mkdirSync(METADATA_DIR, { recursive: true });
  }

  // Read manuscript and normalize line endings to CRLF for cross-platform consistency
  const raw = fs.readFileSync(MANUSCRIPT_PATH, "utf-8");
  const content = raw.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');

  // Generate SHA-256
  const sha256 = crypto.createHash("sha256").update(content, "utf-8").digest("hex");

  // Generate MD5 (secondary reference)
  const md5 = crypto.createHash("md5").update(content, "utf-8").digest("hex");

  // Build stats — use actual file size on disk
  const stats = fs.statSync(MANUSCRIPT_PATH);

  // Load Merkle tree data if available
  let merkleData = null;
  if (fs.existsSync(MERKLE_PATH)) {
    try {
      merkleData = JSON.parse(fs.readFileSync(MERKLE_PATH, "utf-8"));
      console.log(`[HASH]    Merkle data loaded — edition root: ${merkleData.editionRoot}`);
    } catch (e) {
      console.warn("[HASH]    ⚠ merkle.json exists but could not be parsed");
    }
  }

  // Load existing genesis.json if it exists (preserve CID/chain if already set)
  let existing = {};
  if (fs.existsSync(GENESIS_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(GENESIS_PATH, "utf-8"));
    } catch (e) {
      // Start fresh if corrupt
    }
  }

  const genesis = {
    title: "The 2,500 Donkeys",
    author: "Kevan Burnzy",
    edition: merkleData?.edition || existing?.edition || "genesis",
    schema: "literary-protocol-standard",
    schemaVersion: "1.0.0",
    build: {
      timestamp: REPRODUCIBLE ? "REPRODUCIBLE" : new Date().toISOString(),
      sha256: sha256,
      md5: md5,
      sizeBytes: stats.size,
      source: "dist/final-manuscript.md"
    },
    // Merkle roots (LPS-1) — preserve audioRoot/audioEditionRoot from existing
    roots: merkleData ? {
      editionRoot: merkleData.editionRoot,
      manuscriptRoot: merkleData.trees.manuscript.root,
      artifactRoot: merkleData.trees.artifact.root,
      imageRoot: merkleData.trees.image.root,
      promptRoot: merkleData.trees.prompt.root,
      ...(existing?.roots?.audioRoot ? {
        audioRoot: existing.roots.audioRoot,
        audioEditionRoot: existing.roots.audioEditionRoot
      } : {})
    } : existing?.roots || null,
    // Original roots frozen on-chain — preserved across builds
    anchoredRoots: existing?.anchoredRoots || null,
    ipfs: {
      cid: existing?.ipfs?.cid || null,
      edition2CID: existing?.ipfs?.edition2CID || null,
      pinnedAt: existing?.ipfs?.pinnedAt || null,
      gateway: existing?.ipfs?.cid
        ? `https://ipfs.io/ipfs/${existing.ipfs.cid}`
        : null
    },
    authorIdentity: existing?.authorIdentity || null,
    chain: existing?.chain || {
      network: "polygon",
      chainId: 137,
      contractAddress: null,
      deployTx: null,
      deployBlock: null,
      deployedBy: null
    }
  };

  fs.writeFileSync(GENESIS_PATH, JSON.stringify(genesis, null, 2), "utf-8");

  console.log(`[HASH] ✅ Genesis hash generated (LPS-1)`);
  console.log(`[HASH]    SHA-256:      ${sha256}`);
  console.log(`[HASH]    MD5:          ${md5}`);
  console.log(`[HASH]    Size:         ${stats.size} bytes`);
  if (merkleData) {
    console.log(`[HASH]    Edition Root: ${merkleData.editionRoot}`);
  }
  console.log(`[HASH]    Stored:       ${GENESIS_PATH}`);
  if (REPRODUCIBLE) {
    console.log(`[HASH]    Mode:         REPRODUCIBLE (timestamp frozen)`);
  }
}

generateHash();
