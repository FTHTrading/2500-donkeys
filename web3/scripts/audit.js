const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // ── Load deployment receipt ────────────────────────────────────
  const receiptPath = path.join(__dirname, "..", "metadata", "deployment-receipt.json");

  if (!fs.existsSync(receiptPath)) {
    console.error("  ✗ No deployment-receipt.json found. Deploy first.");
    process.exit(1);
  }

  const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));

  console.log("\n══════════════════════════════════════════════════");
  console.log("  POST-DEPLOY AUDIT — LiteraryAnchor");
  console.log("══════════════════════════════════════════════════\n");

  // ── Connect to deployed contract ───────────────────────────────
  const LiteraryAnchor = await hre.ethers.getContractFactory("LiteraryAnchor");
  const anchor = LiteraryAnchor.attach(receipt.contract);

  // ── Read all public state ──────────────────────────────────────
  const title = await anchor.title();
  const author = await anchor.author();
  const editionCount = await anchor.editionCount();
  const genesis = await anchor.genesis();
  const latest = await anchor.latest();

  console.log("  ── Contract State ──\n");
  console.log(`  Title:           ${title}`);
  console.log(`  Author:          ${author}`);
  console.log(`  Edition Count:   ${editionCount}\n`);

  console.log("  ── Genesis Edition ──\n");
  console.log(`  IPFS CID:        ${genesis.ipfsCID}`);
  console.log(`  SHA-256:         ${genesis.sha256Hash}`);
  console.log(`  Timestamp:       ${new Date(Number(genesis.timestamp) * 1000).toISOString()}`);
  console.log(`  Title:           ${genesis.title}`);
  console.log(`  Note:            ${genesis.note}\n`);

  // ── Cross-check against local genesis.json ─────────────────────
  const genesisPath = path.join(__dirname, "..", "metadata", "genesis.json");
  const local = JSON.parse(fs.readFileSync(genesisPath, "utf8"));

  const cidMatch = genesis.ipfsCID === local.ipfs.cid;
  const shaMatch = genesis.sha256Hash === local.build.sha256;

  console.log("  ── Integrity Check ──\n");
  console.log(`  CID matches:     ${cidMatch ? "✓ YES" : "✗ MISMATCH"}`);
  console.log(`  SHA-256 matches:  ${shaMatch ? "✓ YES" : "✗ MISMATCH"}\n`);

  if (cidMatch && shaMatch) {
    console.log("  ✓ All provenance layers aligned.\n");
  } else {
    console.log("  ⚠ WARNING: On-chain data does not match local genesis.json!\n");
  }

  console.log("══════════════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
