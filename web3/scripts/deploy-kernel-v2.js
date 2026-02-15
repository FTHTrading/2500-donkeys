/**
 * deploy-kernel-v2.js — Deploy PublishingKernelV2 to Polygon
 *
 * Reads genesis.json for IPFS CID and SHA-256 hash,
 * reads merkle.json for Merkle roots,
 * signs the edition root with ECDSA (now verified on-chain),
 * and deploys the hardened PublishingKernelV2 contract.
 *
 * Constructor args:
 *   (title, ipfsCID, sha256Hash, roots, genesisAnchor, predecessorKernel, authorSignature)
 *
 * Usage: npx hardhat run web3/scripts/deploy-kernel-v2.js --network polygon
 */

const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   PUBLISHING KERNEL V2 — HARDENED DEPLOYMENT            ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

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
  const genesisAnchor = genesis.chain?.contract || "0x97f456300817eaE3B40E235857b856dfFE8bba90";
  const predecessorKernel = genesis.chain?.kernelAddress || "0x511c653fC0F450ba41C42A89A3125CcBf2eFE8ae";

  if (!ipfsCID || !sha256Hash) {
    console.error("❌ Missing IPFS CID or SHA-256 hash in genesis.json");
    process.exit(1);
  }

  console.log(`  Title:              ${title}`);
  console.log(`  IPFS CID:           ${ipfsCID}`);
  console.log(`  SHA-256:            ${sha256Hash}`);
  console.log(`  Genesis Anchor:     ${genesisAnchor}`);
  console.log(`  Predecessor (v1):   ${predecessorKernel}`);
  console.log(`  Edition Root:       ${merkle.editionRoot}\n`);

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

  // ── ECDSA Sign the edition root ───────────────────────────────────
  const [deployer] = await hre.ethers.getSigners();
  console.log(`  Deployer:           ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`  Balance:            ${hre.ethers.formatEther(balance)} POL`);

  const editionRootBytes = hre.ethers.getBytes(roots[4]);
  const signature = await deployer.signMessage(editionRootBytes);
  console.log(`  ECDSA Signature:    ${signature.slice(0, 20)}...${signature.slice(-8)}`);

  // ── Verify signature locally before deploying ──────────────────────
  const ethSignedHash = hre.ethers.hashMessage(editionRootBytes);
  const recovered = hre.ethers.recoverAddress(ethSignedHash, signature);
  console.log(`  Recovered Signer:   ${recovered}`);
  if (recovered.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error("❌ ECDSA signature verification failed locally!");
    process.exit(1);
  }
  console.log(`  ✅ Local ECDSA verification passed\n`);

  // ── Deploy ─────────────────────────────────────────────────────────
  console.log("  Deploying PublishingKernelV2...");
  console.log("  (viaIR compilation — this may take a moment)\n");

  const PKV2 = await hre.ethers.getContractFactory("PublishingKernelV2");
  const kernel = await PKV2.deploy(
    title,
    ipfsCID,
    sha256Hash,
    roots,
    genesisAnchor,
    predecessorKernel,
    signature
  );

  await kernel.waitForDeployment();
  const address = await kernel.getAddress();
  const tx = kernel.deploymentTransaction();

  console.log(`  ✅ PublishingKernelV2 deployed!`);
  console.log(`  Contract:           ${address}`);
  console.log(`  TX Hash:            ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`  Block:              ${receipt.blockNumber}`);
  console.log(`  Gas Used:           ${receipt.gasUsed.toString()}`);

  // ── Verify on-chain state ──────────────────────────────────────────
  console.log("\n── On-Chain Verification ──");
  const count = await kernel.editionCount();
  console.log(`  Edition count:      ${count}`);
  const version = await kernel.VERSION();
  console.log(`  Contract version:   ${version}`);
  const genesisEdition = await kernel.genesis();
  console.log(`  Genesis CID:        ${genesisEdition.ipfsCID}`);
  console.log(`  Genesis Root:       ${genesisEdition.roots.editionRoot}`);
  console.log(`  Is Canonical:       ${genesisEdition.isCanonical}`);
  console.log(`  Is Frozen:          ${genesisEdition.isFrozen}`);
  console.log(`  Is Anchored:        ${await kernel.isAnchored(roots[4])}`);
  console.log(`  Canonical ID:       ${await kernel.canonicalEditionId()}`);
  console.log(`  Has Canonical:      ${await kernel.hasCanonical()}`);
  console.log(`  Predecessor:        ${await kernel.predecessorKernel()}`);
  console.log(`  Author:             ${await kernel.author()}`);
  console.log(`  Admin:              ${await kernel.admin()}`);

  // ── Verify signature on-chain ───────────────────────────────────────
  const [valid, signer] = await kernel.verifySignature(roots[4], signature);
  console.log(`  Sig Valid On-Chain: ${valid}`);
  console.log(`  Sig Signer:         ${signer}`);

  // ── Update genesis.json ────────────────────────────────────────────
  genesis.chain = genesis.chain || {};
  genesis.chain.kernelV2Address = address;
  genesis.chain.kernelV2DeployTx = tx.hash;
  genesis.chain.kernelV2DeployBlock = receipt.blockNumber;
  genesis.chain.kernelV2DeployedBy = deployer.address;
  genesis.chain.kernelV2DeployedAt = new Date().toISOString();
  genesis.chain.kernelV2GasUsed = receipt.gasUsed.toString();
  genesis.chain.kernelV2Version = Number(version);

  fs.writeFileSync(genesisPath, JSON.stringify(genesis, null, 2), "utf-8");
  console.log(`\n  ✅ genesis.json updated with v2 kernel address`);

  // ── Update edition.json ────────────────────────────────────────────
  const editionPath = path.resolve(__dirname, "..", "..", "dist", "edition.json");
  if (fs.existsSync(editionPath)) {
    const edition = JSON.parse(fs.readFileSync(editionPath, "utf-8"));
    edition.anchors.polygon.kernel_v2_contract = address;
    edition.anchors.polygon.kernel_v2_tx_hash = tx.hash;
    edition.anchors.polygon.kernel_v2_block = receipt.blockNumber;
    edition.anchors.polygon.kernel_v2_gas_used = receipt.gasUsed.toString();
    edition.schema_version = "2.0.0";
    fs.writeFileSync(editionPath, JSON.stringify(edition, null, 2), "utf-8");
    console.log(`  ✅ edition.json updated with v2 kernel address`);
  }

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  PublishingKernelV2 deployment complete.");
  console.log("  ECDSA enforcement is LIVE.");
  console.log("  The upgraded protocol is on-chain.");
  console.log("══════════════════════════════════════════════════════════");
  console.log(`\n  Next steps:`);
  console.log(`    1. npx hardhat verify --network polygon ${address} <constructor-args>`);
  console.log(`    2. Grant license #0 on v2 kernel`);
  console.log(`    3. Freeze edition #0 for permanent finality`);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
