/**
 * hash.js — Genesis Hash Generator
 *
 * Reads the compiled final-manuscript.md and generates SHA-256.
 * Stores the hash in web3/metadata/genesis.json along with
 * build metadata.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT, "dist");
const METADATA_DIR = path.join(ROOT, "web3", "metadata");
const MANUSCRIPT_PATH = path.join(DIST_DIR, "final-manuscript.md");
const GENESIS_PATH = path.join(METADATA_DIR, "genesis.json");

function generateHash() {
  if (!fs.existsSync(MANUSCRIPT_PATH)) {
    console.error("[HASH] ❌ final-manuscript.md not found. Run compile.js first.");
    process.exit(1);
  }

  // Ensure metadata dir exists
  if (!fs.existsSync(METADATA_DIR)) {
    fs.mkdirSync(METADATA_DIR, { recursive: true });
  }

  // Read manuscript
  const content = fs.readFileSync(MANUSCRIPT_PATH, "utf-8");

  // Generate SHA-256
  const sha256 = crypto.createHash("sha256").update(content, "utf-8").digest("hex");

  // Generate MD5 (secondary reference)
  const md5 = crypto.createHash("md5").update(content, "utf-8").digest("hex");

  // Build stats
  const stats = fs.statSync(MANUSCRIPT_PATH);

  // Load existing genesis.json if it exists (preserve CID if already set)
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
    author: "Kidd James",
    edition: "genesis",
    build: {
      timestamp: new Date().toISOString(),
      sha256: sha256,
      md5: md5,
      sizeBytes: stats.size,
      source: "dist/final-manuscript.md"
    },
    ipfs: {
      cid: existing?.ipfs?.cid || null,
      pinnedAt: existing?.ipfs?.pinnedAt || null,
      gateway: existing?.ipfs?.cid
        ? `https://ipfs.io/ipfs/${existing.ipfs.cid}`
        : null
    },
    chain: {
      network: existing?.chain?.network || "polygon",
      contract: existing?.chain?.contract || null,
      txHash: existing?.chain?.txHash || null,
      authorWallet: existing?.chain?.authorWallet || null
    }
  };

  fs.writeFileSync(GENESIS_PATH, JSON.stringify(genesis, null, 2), "utf-8");

  console.log(`[HASH] ✅ Genesis hash generated`);
  console.log(`[HASH]    SHA-256: ${sha256}`);
  console.log(`[HASH]    MD5:     ${md5}`);
  console.log(`[HASH]    Size:    ${stats.size} bytes`);
  console.log(`[HASH]    Stored:  ${GENESIS_PATH}`);
}

generateHash();
