/**
 * deploy-royalty-router.js — Deploy RoyaltyRouter to Polygon
 *
 * Deploys a revenue split contract for a specific edition.
 * Configure payees and basis points below before deploying.
 *
 * Usage: npx hardhat run web3/scripts/deploy-royalty-router.js --network polygon
 */

const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   ROYALTY ROUTER — DEPLOYMENT                   ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`  Deployer: ${deployer.address}\n`);

  // ══════════════════════════════════════════════════════════════════════
  //  CONFIGURE SPLITS HERE
  // ══════════════════════════════════════════════════════════════════════

  const EDITION_REF = "edition-2";

  // NOTE: Replace these addresses with actual payee wallets before mainnet deploy
  const PAYEES = [
    { wallet: deployer.address, role: "author",      bps: 7000 },  // 70%
    { wallet: deployer.address, role: "illustrator",  bps: 1500 },  // 15%
    { wallet: deployer.address, role: "editor",       bps: 1000 },  // 10%
    { wallet: deployer.address, role: "treasury",     bps: 500  },  //  5%
  ];

  // ══════════════════════════════════════════════════════════════════════

  const wallets = PAYEES.map(p => p.wallet);
  const roles = PAYEES.map(p => p.role);
  const bps = PAYEES.map(p => p.bps);

  console.log("  Revenue Splits:");
  for (const p of PAYEES) {
    console.log(`    ${p.role.padEnd(15)} ${(p.bps / 100).toFixed(1)}%  → ${p.wallet}`);
  }
  console.log(`    ${"TOTAL".padEnd(15)} ${(bps.reduce((a, b) => a + b, 0) / 100).toFixed(1)}%\n`);

  // ── Deploy ─────────────────────────────────────────────────────────
  console.log("  Deploying RoyaltyRouter...");

  const RoyaltyRouter = await hre.ethers.getContractFactory("RoyaltyRouter");
  const router = await RoyaltyRouter.deploy(EDITION_REF, wallets, roles, bps);
  await router.waitForDeployment();

  const address = await router.getAddress();
  const tx = router.deploymentTransaction();
  const receipt = await tx.wait();

  console.log(`\n  ✅ RoyaltyRouter deployed!`);
  console.log(`  Contract:  ${address}`);
  console.log(`  TX Hash:   ${tx.hash}`);
  console.log(`  Block:     ${receipt.blockNumber}`);
  console.log(`  Gas Used:  ${receipt.gasUsed.toString()}`);

  // ── Verify on-chain state ──────────────────────────────────────────
  console.log("\n── On-Chain Verification ──");
  const count = await router.payeeCount();
  console.log(`  Payee count:    ${count}`);
  console.log(`  Edition ref:    ${await router.editionRef()}`);
  console.log(`  Has recoupment: ${await router.hasRecoupment()}`);

  // ── Update genesis.json ────────────────────────────────────────────
  const genesisPath = path.resolve(__dirname, "..", "metadata", "genesis.json");
  if (fs.existsSync(genesisPath)) {
    const genesis = JSON.parse(fs.readFileSync(genesisPath, "utf-8"));
    genesis.chain = genesis.chain || {};
    genesis.chain.royaltyRouterAddress = address;
    genesis.chain.royaltyRouterDeployTx = tx.hash;
    genesis.chain.royaltyRouterDeployedAt = new Date().toISOString();
    fs.writeFileSync(genesisPath, JSON.stringify(genesis, null, 2), "utf-8");
    console.log(`\n  ✅ genesis.json updated with router address`);
  }

  // ── Update edition.json ────────────────────────────────────────────
  const editionPath = path.resolve(__dirname, "..", "..", "dist", "edition.json");
  if (fs.existsSync(editionPath)) {
    const edition = JSON.parse(fs.readFileSync(editionPath, "utf-8"));
    edition.anchors.polygon.royalty_router = address;
    edition.anchors.polygon.royalty_router_tx = tx.hash;
    edition.anchors.polygon.royalty_router_block = receipt.blockNumber;
    edition.royalty_splits = PAYEES.map(p => ({
      role: p.role,
      bps: p.bps,
      pct: `${(p.bps / 100).toFixed(1)}%`,
      wallet: p.wallet,
    }));
    fs.writeFileSync(editionPath, JSON.stringify(edition, null, 2), "utf-8");
    console.log(`  ✅ edition.json updated with router address`);
  }

  console.log("\n══════════════════════════════════════════════════");
  console.log("  RoyaltyRouter deployment complete.");
  console.log("  Revenue routing is live.");
  console.log("══════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
