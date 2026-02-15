/**
 * deploy-kernel.js — Deploy PublishingKernel to Polygon
 *
 * Reads genesis.json for IPFS CID and SHA-256 hash,
 * reads merkle.json for Merkle roots,
 * signs the edition root with the author's key,
 * and deploys the PublishingKernel contract.
 *
 * Usage: npx hardhat run web3/scripts/deploy-kernel.js --network polygon
 */

const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   PUBLISHING KERNEL — DEPLOYMENT                ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // ── Load metadata ───────────────────────────────────────────────────
  const genesisPath = path.resolve(__dirname, "..", "metadata", "genesis.json");
  if (!fs.existsSync(genesisPath)) {
    console.error("❌ genesis.json not found. Run the build pipeline first.");
    process.exit(1);
  }
  const genesis = JSON.parse(fs.readFileSync(genesisPath, "utf-8"));

  const merklePath = path.resolve(__dirname, "..", "..", "dist", "merkle.json");
  if (!fs.existsSync(merklePath)) {
    console.error("❌ merkle.json not found. Run build/merkle.js first.");
    process.exit(1);
  }
  const merkle = JSON.parse(fs.readFileSync(merklePath, "utf-8"));

  // ── Resolve values ─────────────────────────────────────────────────
  const title = genesis.title || "The 2,500 Donkeys";
  const ipfsCID = genesis.ipfs?.cid;
  const sha256Hash = genesis.build?.sha256;
  const genesisAnchor = genesis.chain?.contractAddress || "0x97f456300817eaE3B40E235857b856dfFE8bba90";

  if (!ipfsCID || !sha256Hash) {
    console.error("❌ Missing IPFS CID or SHA-256 hash in genesis.json");
    process.exit(1);
  }

  console.log(`  Title:          ${title}`);
  console.log(`  IPFS CID:       ${ipfsCID}`);
  console.log(`  SHA-256:        ${sha256Hash}`);
  console.log(`  Genesis Anchor: ${genesisAnchor}`);
  console.log(`  Edition Root:   ${merkle.editionRoot}\n`);

  // ── Prepare Merkle roots as bytes32 ─────────────────────────────────
  const roots = [
    "0x" + merkle.trees.manuscript.root,
    "0x" + merkle.trees.artifact.root,
    "0x" + merkle.trees.image.root,
    "0x" + merkle.trees.prompt.root,
    "0x" + merkle.editionRoot
  ];

  console.log("  Merkle Roots:");
  console.log(`    manuscript: ${roots[0]}`);
  console.log(`    artifact:   ${roots[1]}`);
  console.log(`    image:      ${roots[2]}`);
  console.log(`    prompt:     ${roots[3]}`);
  console.log(`    edition:    ${roots[4]}\n`);

  // ── Sign the edition root ──────────────────────────────────────────
  const [deployer] = await hre.ethers.getSigners();
  console.log(`  Deployer:       ${deployer.address}`);

  const editionRootBytes = hre.ethers.getBytes(roots[4]);
  const signature = await deployer.signMessage(editionRootBytes);
  console.log(`  Signature:      ${signature.slice(0, 20)}...`);

  // ── Deploy ─────────────────────────────────────────────────────────
  console.log("\n  Deploying PublishingKernel...");

  const PublishingKernel = await hre.ethers.getContractFactory("PublishingKernel");
  const kernel = await PublishingKernel.deploy(
    title,
    ipfsCID,
    sha256Hash,
    roots,
    genesisAnchor,
    signature
  );

  await kernel.waitForDeployment();
  const address = await kernel.getAddress();
  const tx = kernel.deploymentTransaction();

  console.log(`\n  ✅ PublishingKernel deployed!`);
  console.log(`  Contract:  ${address}`);
  console.log(`  TX Hash:   ${tx.hash}`);
  console.log(`  Block:     (confirming...)`);

  const receipt = await tx.wait();
  console.log(`  Block:     ${receipt.blockNumber}`);
  console.log(`  Gas Used:  ${receipt.gasUsed.toString()}`);

  // ── Verify on-chain state ──────────────────────────────────────────
  console.log("\n── On-Chain Verification ──");
  const count = await kernel.editionCount();
  console.log(`  Edition count: ${count}`);
  const genesisEdition = await kernel.genesis();
  console.log(`  Genesis CID:   ${genesisEdition.ipfsCID}`);
  console.log(`  Genesis Root:  ${genesisEdition.roots.editionRoot}`);
  console.log(`  Is Canonical:  ${genesisEdition.isCanonical}`);
  console.log(`  Is Anchored:   ${await kernel.isAnchored(roots[4])}`);

  // ── Update genesis.json ────────────────────────────────────────────
  genesis.chain = genesis.chain || {};
  genesis.chain.kernelAddress = address;
  genesis.chain.kernelDeployTx = tx.hash;
  genesis.chain.kernelDeployBlock = receipt.blockNumber;
  genesis.chain.kernelDeployedBy = deployer.address;
  genesis.chain.kernelDeployedAt = new Date().toISOString();

  fs.writeFileSync(genesisPath, JSON.stringify(genesis, null, 2), "utf-8");
  console.log(`\n  ✅ genesis.json updated with kernel address`);

  console.log("\n══════════════════════════════════════════════════");
  console.log("  PublishingKernel deployment complete.");
  console.log("  The protocol is live.");
  console.log("══════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
