/**
 * grant-license.js — Grant a license on PublishingKernel, wired to RoyaltyRouter
 *
 * This completes the on-chain pipeline:
 *   Edition → License → RoyaltyRouter → Payees
 *
 * Credentials:
 *   - PRIVATE_KEY from .env (author wallet, loaded by hardhat.config.js)
 *   - POLYGONSCAN_API_KEY from .env (for verification if needed)
 *   - POLYGON_RPC from .env (network endpoint)
 *
 * Usage:
 *   DRY_RUN=1 npx hardhat run web3/scripts/grant-license.js --network polygon
 *   npx hardhat run web3/scripts/grant-license.js --network polygon
 */

const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

// ═══════════════════════════════════════════════════════════════════════
//  CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

const KERNEL_ADDRESS = "0x511c653fC0F450ba41C42A89A3125CcBf2eFE8ae";
const ROUTER_ADDRESS = "0x44169829489d70aaecbf845870652871C65fC461";

const LICENSE_CONFIG = {
  editionId:     0,                      // Genesis edition
  grantee:       "0xC91668184736BF75C4ecE37473D694efb2A43978", // Author (self-grant for sovereign rights)
  templateId:    "LPS1-SOVEREIGN",       // Literary Protocol Standard v1 — full sovereign rights
  territory:     "GLOBAL",               // No territorial restriction
  termStart:     0,                      // Effective immediately (block.timestamp used on-chain)
  termEnd:       0,                      // 0 = perpetual
  fieldsOfUse:   "all",                  // print, digital, audio, derivative — all rights
  royaltyRouter: ROUTER_ADDRESS          // Wire to deployed RoyaltyRouter
};

async function main() {
  const isDryRun = process.env.DRY_RUN === "1";
  const [signer] = await hre.ethers.getSigners();

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   LICENSE GRANT — Wire Kernel → Router           ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // ── Credential verification ──────────────────────────────────────
  console.log("── Credentials ─────────────────────────────");
  console.log(`Signer:          ${signer.address}`);
  console.log(`Private key:     ${"*".repeat(60)}...${process.env.PRIVATE_KEY?.slice(-4) || "NOT SET"}`);
  console.log(`Network:         ${hre.network.name} (chainId: ${(await hre.ethers.provider.getNetwork()).chainId})`);
  console.log(`RPC:             ${process.env.POLYGON_RPC ? "custom" : "default public"}`);

  if (!process.env.PRIVATE_KEY) {
    console.error("\n❌ PRIVATE_KEY not found in .env — cannot sign transactions");
    process.exit(1);
  }

  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log(`Balance:         ${hre.ethers.formatEther(balance)} POL`);

  if (balance === 0n) {
    console.error("\n❌ Wallet has zero balance — cannot pay gas");
    process.exit(1);
  }

  // ── Connect to contracts ─────────────────────────────────────────
  console.log("\n── Contracts ───────────────────────────────");
  const Kernel = await hre.ethers.getContractAt("PublishingKernel", KERNEL_ADDRESS);
  const Router = await hre.ethers.getContractAt("RoyaltyRouter", ROUTER_ADDRESS);

  // Verify signer is the author
  const kernelAuthor = await Kernel.author();
  console.log(`Kernel author:   ${kernelAuthor}`);
  console.log(`Signer match:    ${kernelAuthor.toLowerCase() === signer.address.toLowerCase() ? "✅ YES" : "❌ NO"}`);

  if (kernelAuthor.toLowerCase() !== signer.address.toLowerCase()) {
    console.error("\n❌ Signer is not the kernel author — cannot grant license");
    process.exit(1);
  }

  // Verify edition exists
  const editionCount = await Kernel.editionCount();
  console.log(`Edition count:   ${editionCount}`);

  if (LICENSE_CONFIG.editionId >= Number(editionCount)) {
    console.error(`\n❌ Edition ${LICENSE_CONFIG.editionId} does not exist`);
    process.exit(1);
  }

  // Read the edition details
  const edition = await Kernel.getEdition(LICENSE_CONFIG.editionId);
  console.log(`Edition title:   ${edition.title}`);
  console.log(`Edition CID:     ${edition.ipfsCID}`);
  console.log(`Is canonical:    ${edition.isCanonical}`);
  console.log(`Is retracted:    ${edition.isRetracted}`);

  if (edition.isRetracted) {
    console.error("\n❌ Cannot license a retracted edition");
    process.exit(1);
  }

  // Verify router
  const routerOwner = await Router.owner();
  const payeeCount = await Router.payeeCount();
  console.log(`\nRouter owner:    ${routerOwner}`);
  console.log(`Router payees:   ${payeeCount}`);

  // Check existing licenses
  const licenseCount = await Kernel.licenseCount();
  console.log(`\nExisting licenses: ${licenseCount}`);

  // ── License details ──────────────────────────────────────────────
  console.log("\n── License Configuration ───────────────────");
  console.log(`Edition:         #${LICENSE_CONFIG.editionId}`);
  console.log(`Grantee:         ${LICENSE_CONFIG.grantee}`);
  console.log(`Template:        ${LICENSE_CONFIG.templateId}`);
  console.log(`Territory:       ${LICENSE_CONFIG.territory}`);
  console.log(`Term:            ${LICENSE_CONFIG.termEnd === 0 ? "PERPETUAL" : `${LICENSE_CONFIG.termStart} → ${LICENSE_CONFIG.termEnd}`}`);
  console.log(`Fields of Use:   ${LICENSE_CONFIG.fieldsOfUse}`);
  console.log(`Royalty Router:  ${LICENSE_CONFIG.royaltyRouter}`);

  if (isDryRun) {
    console.log("\n── DRY RUN ─────────────────────────────────");
    console.log("Would call: PublishingKernel.grantLicense(");
    console.log(`  editionId:     ${LICENSE_CONFIG.editionId}`);
    console.log(`  grantee:       ${LICENSE_CONFIG.grantee}`);
    console.log(`  templateId:    "${LICENSE_CONFIG.templateId}"`);
    console.log(`  territory:     "${LICENSE_CONFIG.territory}"`);
    console.log(`  termStart:     ${LICENSE_CONFIG.termStart}`);
    console.log(`  termEnd:       ${LICENSE_CONFIG.termEnd}`);
    console.log(`  fieldsOfUse:   "${LICENSE_CONFIG.fieldsOfUse}"`);
    console.log(`  royaltyRouter: ${LICENSE_CONFIG.royaltyRouter}`);
    console.log(")");
    console.log("\nPipeline would be:");
    console.log("  Edition #0 → License #0 → Router 0x4416...fC461 → 4 Payees");
    console.log("\nRun without DRY_RUN=1 to execute.");
    return;
  }

  // ── Execute grant ────────────────────────────────────────────────
  console.log("\n── Granting License ────────────────────────");
  console.log("Submitting transaction...");

  const tx = await Kernel.grantLicense(
    LICENSE_CONFIG.editionId,
    LICENSE_CONFIG.grantee,
    LICENSE_CONFIG.templateId,
    LICENSE_CONFIG.territory,
    LICENSE_CONFIG.termStart,
    LICENSE_CONFIG.termEnd,
    LICENSE_CONFIG.fieldsOfUse,
    LICENSE_CONFIG.royaltyRouter
  );

  console.log(`TX hash:         ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`Block:           ${receipt.blockNumber}`);
  console.log(`Gas used:        ${receipt.gasUsed.toString()}`);

  // Parse events
  const kernelInterface = Kernel.interface;
  const parsedLogs = receipt.logs
    .map(log => { try { return kernelInterface.parseLog(log); } catch { return null; } })
    .filter(Boolean);

  let grantedLicenseId = null;
  for (const log of parsedLogs) {
    if (log.name === "LicenseGranted") {
      grantedLicenseId = Number(log.args[0]);
      console.log(`\nLicenseGranted event:`);
      console.log(`  licenseId:     ${grantedLicenseId}`);
      console.log(`  editionId:     ${Number(log.args[1])}`);
      console.log(`  grantee:       ${log.args[2]}`);
      console.log(`  templateId:    ${log.args[3]}`);
    }
  }

  // ── On-chain verification ────────────────────────────────────────
  console.log("\n── On-chain Verification ───────────────────");

  const license = await Kernel.getLicense(grantedLicenseId);
  console.log(`License #${grantedLicenseId}:`);
  console.log(`  editionId:     ${Number(license.editionId)}`);
  console.log(`  grantee:       ${license.grantee}`);
  console.log(`  templateId:    ${license.templateId}`);
  console.log(`  territory:     ${license.territory}`);
  console.log(`  termStart:     ${Number(license.termStart)}`);
  console.log(`  termEnd:       ${Number(license.termEnd)} ${Number(license.termEnd) === 0 ? "(perpetual)" : ""}`);
  console.log(`  fieldsOfUse:   ${license.fieldsOfUse}`);
  console.log(`  royaltyRouter: ${license.royaltyRouter}`);
  console.log(`  revoked:       ${license.revoked}`);

  // Verify router is correctly linked
  const routerLinked = license.royaltyRouter.toLowerCase() === ROUTER_ADDRESS.toLowerCase();
  console.log(`\n  Router linked:  ${routerLinked ? "✅ YES" : "❌ NO"}`);

  // ── Update metadata files ────────────────────────────────────────
  console.log("\n── Updating Metadata ───────────────────────");

  // Update genesis.json
  const genesisPath = path.resolve(__dirname, "..", "metadata", "genesis.json");
  const genesis = JSON.parse(fs.readFileSync(genesisPath, "utf-8"));
  genesis.licenseId = grantedLicenseId;
  genesis.licenseTemplate = LICENSE_CONFIG.templateId;
  genesis.licenseGrantTx = tx.hash;
  genesis.licenseGrantBlock = receipt.blockNumber;
  genesis.licenseGrantedAt = new Date().toISOString();
  genesis.licensePipeline = `Edition #${LICENSE_CONFIG.editionId} → License #${grantedLicenseId} → Router ${ROUTER_ADDRESS}`;
  fs.writeFileSync(genesisPath, JSON.stringify(genesis, null, 2) + "\n");
  console.log("✅ genesis.json updated");

  // Update edition.json
  const editionPath = path.resolve(__dirname, "..", "..", "dist", "edition.json");
  if (fs.existsSync(editionPath)) {
    const edition = JSON.parse(fs.readFileSync(editionPath, "utf-8"));
    edition.license = {
      id: grantedLicenseId,
      template: LICENSE_CONFIG.templateId,
      territory: LICENSE_CONFIG.territory,
      term: LICENSE_CONFIG.termEnd === 0 ? "perpetual" : `${LICENSE_CONFIG.termStart}-${LICENSE_CONFIG.termEnd}`,
      fields_of_use: LICENSE_CONFIG.fieldsOfUse,
      grant_tx: tx.hash,
      grant_block: receipt.blockNumber,
      royalty_router: ROUTER_ADDRESS
    };
    edition.pipeline = {
      edition: LICENSE_CONFIG.editionId,
      license: grantedLicenseId,
      router: ROUTER_ADDRESS,
      kernel: KERNEL_ADDRESS,
      status: "WIRED"
    };
    fs.writeFileSync(editionPath, JSON.stringify(edition, null, 2) + "\n");
    console.log("✅ edition.json updated");
  }

  // ── Summary ──────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   PIPELINE WIRED                                 ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`\n  Edition #${LICENSE_CONFIG.editionId} ("${edition.title}")`);
  console.log(`      ↓`);
  console.log(`  License #${grantedLicenseId} (${LICENSE_CONFIG.templateId})`);
  console.log(`      ↓`);
  console.log(`  RoyaltyRouter ${ROUTER_ADDRESS}`);
  console.log(`      ↓`);
  console.log(`  Payees: author(70%) | illustrator(15%) | editor(10%) | treasury(5%)`);
  console.log(`\n  TX: ${tx.hash}`);
  console.log(`  Block: ${receipt.blockNumber}`);
  console.log(`  Status: LIVE\n`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
