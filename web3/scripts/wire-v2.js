/**
 * wire-v2.js — Grant license + freeze edition on PublishingKernelV2
 *
 * Performs two operations on the live v2 kernel:
 *   1. Grant License #0: LPS2-SOVEREIGN / GLOBAL / perpetual / all rights
 *      Wired to existing RoyaltyRouter at 0x44169829489d70aaecbf845870652871C65fC461
 *   2. Freeze Edition #0: Permanent immutability — no retraction, no modification
 *
 * Usage: npx hardhat run web3/scripts/wire-v2.js --network polygon
 */

const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const V2_ADDRESS = "0xca9F6604A9b498DB31d113836E2957c0a9aAE037";
const ROYALTY_ROUTER = "0x44169829489d70aaecbf845870652871C65fC461";

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   WIRE V2 — LICENSE GRANT + EDITION FREEZE              ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`  Deployer:   ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`  Balance:    ${hre.ethers.formatEther(balance)} POL\n`);

  const kernel = await hre.ethers.getContractAt("PublishingKernelV2", V2_ADDRESS);

  // Verify we're talking to the right contract
  const version = await kernel.VERSION();
  const author = await kernel.author();
  console.log(`  Contract:   ${V2_ADDRESS}`);
  console.log(`  Version:    ${version}`);
  console.log(`  Author:     ${author}`);
  console.log(`  Predecessor: ${await kernel.predecessorKernel()}`);

  if (author.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error("❌ Deployer is not the author. Cannot wire.");
    process.exit(1);
  }

  // ── Step 1: Grant License #0 ──────────────────────────────────────
  console.log("\n── Step 1: Grant License ──");

  const licenseCountBefore = await kernel.licenseCount();
  console.log(`  Existing licenses: ${licenseCountBefore}`);

  if (Number(licenseCountBefore) > 0) {
    console.log("  ⚠️  License already exists. Skipping grant.");
  } else {
    const termStart = Math.floor(Date.now() / 1000);
    const termEnd = 0; // perpetual

    console.log(`  Template:     LPS2-SOVEREIGN`);
    console.log(`  Territory:    GLOBAL`);
    console.log(`  Term:         perpetual`);
    console.log(`  Fields:       all`);
    console.log(`  Router:       ${ROYALTY_ROUTER}`);
    console.log(`  Grantee:      ${deployer.address}`);

    const grantTx = await kernel.grantLicense(
      0,                          // editionId
      deployer.address,           // grantee (self-sovereign)
      "LPS2-SOVEREIGN",           // templateId
      "GLOBAL",                   // territory
      termStart,                  // termStart
      termEnd,                    // termEnd (0 = perpetual)
      "all",                      // fieldsOfUse
      ROYALTY_ROUTER              // royaltyRouter
    );

    console.log(`  TX Hash:      ${grantTx.hash}`);
    const grantReceipt = await grantTx.wait();
    console.log(`  Block:        ${grantReceipt.blockNumber}`);
    console.log(`  Gas Used:     ${grantReceipt.gasUsed.toString()}`);

    // Verify
    const license = await kernel.getLicense(0);
    console.log(`\n  ✅ License #0 granted`);
    console.log(`    Edition:      ${license.editionId}`);
    console.log(`    Grantee:      ${license.grantee}`);
    console.log(`    Template:     ${license.templateId}`);
    console.log(`    Territory:    ${license.territory}`);
    console.log(`    Fields:       ${license.fieldsOfUse}`);
    console.log(`    Router:       ${license.royaltyRouter}`);
    console.log(`    Revoked:      ${license.revoked}`);
  }

  // ── Step 2: Freeze Edition #0 ─────────────────────────────────────
  console.log("\n── Step 2: Freeze Edition #0 ──");

  const edition = await kernel.getEdition(0);
  if (edition.isFrozen) {
    console.log("  ⚠️  Edition #0 already frozen. Skipping.");
  } else {
    console.log("  Freezing Edition #0 — this is PERMANENT...");

    const freezeTx = await kernel.freezeEdition(0);
    console.log(`  TX Hash:      ${freezeTx.hash}`);
    const freezeReceipt = await freezeTx.wait();
    console.log(`  Block:        ${freezeReceipt.blockNumber}`);
    console.log(`  Gas Used:     ${freezeReceipt.gasUsed.toString()}`);

    const frozenEdition = await kernel.getEdition(0);
    console.log(`\n  ✅ Edition #0 FROZEN`);
    console.log(`    Is Frozen:    ${frozenEdition.isFrozen}`);
    console.log(`    Is Canonical: ${frozenEdition.isCanonical}`);
    console.log(`    Is Retracted: ${frozenEdition.isRetracted}`);
  }

  // ── Final state summary ────────────────────────────────────────────
  console.log("\n── Final State ──");
  const [canonId, canonEdition] = await kernel.canonicalEdition();
  console.log(`  Canonical ID:     ${canonId}`);
  console.log(`  Canonical CID:    ${canonEdition.ipfsCID}`);
  console.log(`  Canonical Root:   ${canonEdition.roots.editionRoot}`);
  console.log(`  Canonical Frozen: ${canonEdition.isFrozen}`);
  console.log(`  License Count:    ${await kernel.licenseCount()}`);
  console.log(`  Edition Count:    ${await kernel.editionCount()}`);
  console.log(`  Timelock Count:   ${await kernel.timelockCount()}`);

  // ── Update metadata ────────────────────────────────────────────────
  const genesisPath = path.resolve(__dirname, "..", "metadata", "genesis.json");
  const genesis = JSON.parse(fs.readFileSync(genesisPath, "utf-8"));

  genesis.chain.kernelV2LicenseId = 0;
  genesis.chain.kernelV2LicenseTemplate = "LPS2-SOVEREIGN";
  genesis.chain.kernelV2EditionFrozen = true;
  genesis.chain.kernelV2WiredAt = new Date().toISOString();
  genesis.chain.kernelV2Pipeline = `Edition #0 (FROZEN) → License #0 → Router ${ROYALTY_ROUTER}`;

  fs.writeFileSync(genesisPath, JSON.stringify(genesis, null, 2), "utf-8");
  console.log(`\n  ✅ genesis.json updated`);

  const editionPath = path.resolve(__dirname, "..", "..", "dist", "edition.json");
  if (fs.existsSync(editionPath)) {
    const editionData = JSON.parse(fs.readFileSync(editionPath, "utf-8"));
    editionData.v2_license = {
      id: 0,
      template: "LPS2-SOVEREIGN",
      territory: "GLOBAL",
      term: "perpetual",
      fields_of_use: "all",
      royalty_router: ROYALTY_ROUTER,
      edition_frozen: true
    };
    editionData.pipeline = editionData.pipeline || {};
    editionData.pipeline.v2_kernel = V2_ADDRESS;
    editionData.pipeline.v2_license = 0;
    editionData.pipeline.v2_frozen = true;
    editionData.pipeline.v2_status = "WIRED+FROZEN";
    fs.writeFileSync(editionPath, JSON.stringify(editionData, null, 2), "utf-8");
    console.log(`  ✅ edition.json updated`);
  }

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  V2 WIRING COMPLETE.");
  console.log("  Edition #0 → License #0 → RoyaltyRouter → Revenue");
  console.log("  Edition #0 is PERMANENTLY FROZEN.");
  console.log("  The artifact is now sovereign-grade infrastructure.");
  console.log("══════════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
