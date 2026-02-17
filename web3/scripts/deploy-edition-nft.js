/**
 * deploy-edition-nft.js — Deploy EditionNFT and link tiers to anchored editions
 *
 * Deploys the EditionNFT contract, then:
 *   1. Links Genesis tier to edition 0 (genesis edition)
 *   2. Links Founder tier to edition 1 (expanded 31-block edition)
 *   3. Links Public tier to edition 1
 *   4. Sets mint prices
 *
 * Usage:
 *   npx hardhat run web3/scripts/deploy-edition-nft.js --network polygon
 *   npx hardhat run web3/scripts/deploy-edition-nft.js --network amoy
 *
 * Requires:
 *   - LiteraryAnchor already deployed (DEPLOYMENTS.md)
 *   - At least 2 editions anchored (genesis + edition 2)
 */

const hre = require("hardhat");

// ══════════════════════════════════════════════════════════════════════
//  CONFIGURATION
// ══════════════════════════════════════════════════════════════════════

const CONFIG = {
  // LiteraryAnchor address (from DEPLOYMENTS.md)
  genesisAnchor: "0x97f456300817eaE3B40E235857b856dfFE8bba90",

  // Supply caps (immutable once deployed)
  founderMaxSupply: 33,    // xxxiii.io → 33 founder copies
  publicMaxSupply:  2500,  // 2,500 donkeys → 2,500 public copies

  // Metadata base URI (update later via setBaseURI)
  baseURI: "ipfs://",

  // ERC-2981 royalty: 7.5%
  royaltyBps: 750,

  // Edition indices to link (verify these exist on-chain before deploying)
  genesisTierEdition: 0,   // edition index 0 = genesis
  founderTierEdition: 1,   // edition index 1 = expanded edition (first of the triplet)
  publicTierEdition:  1,   // same expanded edition for public

  // Mint prices (in POL)
  genesisMintPrice:  "0",      // Genesis is author-only, no price needed
  founderMintPrice:  "5.0",    // 5 POL per founder edition
  publicMintPrice:   "1.0",    // 1 POL per public edition
};

// ══════════════════════════════════════════════════════════════════════
//  DEPLOY
// ══════════════════════════════════════════════════════════════════════

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   EDITION NFT — TIERED LITERARY NFT DEPLOYMENT          ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("  Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("  Balance: ", hre.ethers.formatEther(balance), "POL");
  console.log("  Network: ", hre.network.name);
  console.log("  Chain ID:", (await hre.ethers.provider.getNetwork()).chainId.toString());
  console.log();

  // ── Verify anchor exists ─────────────────────────────────────────

  console.log("━━━ Pre-flight Checks ━━━");

  const anchorCode = await hre.ethers.provider.getCode(CONFIG.genesisAnchor);
  if (anchorCode === "0x") {
    console.error("  ❌ LiteraryAnchor not found at", CONFIG.genesisAnchor);
    console.error("     Are you on the correct network?");
    process.exit(1);
  }
  console.log("  ✅ LiteraryAnchor found at", CONFIG.genesisAnchor);

  // Check edition count
  const anchorAbi = ["function editionCount() view returns (uint256)"];
  const anchor = new hre.ethers.Contract(CONFIG.genesisAnchor, anchorAbi, deployer);
  const editionCount = await anchor.editionCount();
  console.log("  ✅ Edition count:", editionCount.toString());

  const maxEditionNeeded = Math.max(
    CONFIG.genesisTierEdition,
    CONFIG.founderTierEdition,
    CONFIG.publicTierEdition
  );
  if (maxEditionNeeded >= Number(editionCount)) {
    console.error(`  ❌ Need edition index ${maxEditionNeeded} but only ${editionCount} editions exist`);
    process.exit(1);
  }
  console.log("  ✅ All required editions exist on-chain (INV-S4 verified)\n");

  // ── Deploy ────────────────────────────────────────────────────────

  console.log("━━━ Deploying EditionNFT ━━━");

  const EditionNFT = await hre.ethers.getContractFactory("EditionNFT");
  const nft = await EditionNFT.deploy(
    CONFIG.genesisAnchor,
    CONFIG.founderMaxSupply,
    CONFIG.publicMaxSupply,
    CONFIG.baseURI,
    CONFIG.royaltyBps
  );

  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  const deployTx = nft.deploymentTransaction();
  const receipt = await deployTx.wait();

  console.log("  ✅ EditionNFT deployed");
  console.log("     Address:", nftAddress);
  console.log("     TX:     ", deployTx.hash);
  console.log("     Block:  ", receipt.blockNumber);
  console.log("     Gas:    ", receipt.gasUsed.toString());
  console.log();

  // ── Link editions ─────────────────────────────────────────────────

  console.log("━━━ Linking Editions ━━━");

  const linkGenesisTx = await nft.linkEdition(0, CONFIG.genesisTierEdition);
  await linkGenesisTx.wait();
  console.log("  ✅ Genesis tier  → edition", CONFIG.genesisTierEdition);

  const linkFounderTx = await nft.linkEdition(1, CONFIG.founderTierEdition);
  await linkFounderTx.wait();
  console.log("  ✅ Founder tier  → edition", CONFIG.founderTierEdition);

  const linkPublicTx = await nft.linkEdition(2, CONFIG.publicTierEdition);
  await linkPublicTx.wait();
  console.log("  ✅ Public tier   → edition", CONFIG.publicTierEdition);
  console.log();

  // ── Set prices ────────────────────────────────────────────────────

  console.log("━━━ Setting Prices ━━━");

  if (CONFIG.genesisMintPrice !== "0") {
    const tx = await nft.setPrice(0, hre.ethers.parseEther(CONFIG.genesisMintPrice));
    await tx.wait();
  }
  console.log("  Genesis price: ", CONFIG.genesisMintPrice, "POL");

  if (CONFIG.founderMintPrice !== "0") {
    const tx = await nft.setPrice(1, hre.ethers.parseEther(CONFIG.founderMintPrice));
    await tx.wait();
  }
  console.log("  Founder price: ", CONFIG.founderMintPrice, "POL");

  if (CONFIG.publicMintPrice !== "0") {
    const tx = await nft.setPrice(2, hre.ethers.parseEther(CONFIG.publicMintPrice));
    await tx.wait();
  }
  console.log("  Public price:  ", CONFIG.publicMintPrice, "POL");
  console.log();

  // ── Summary ───────────────────────────────────────────────────────

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   DEPLOYMENT COMPLETE                                    ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  Contract:    ${nftAddress}  ║`);
  console.log(`║  Name:        The 2,500 Donkeys                          ║`);
  console.log(`║  Symbol:      DONKEY                                     ║`);
  console.log(`║  Genesis:     1/1  → edition ${CONFIG.genesisTierEdition}                            ║`);
  console.log(`║  Founder:     ${CONFIG.founderMaxSupply}   → edition ${CONFIG.founderTierEdition}                            ║`);
  console.log(`║  Public:      ${CONFIG.publicMaxSupply} → edition ${CONFIG.publicTierEdition}                            ║`);
  console.log(`║  Royalty:     ${CONFIG.royaltyBps / 100}%                                      ║`);
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  NEXT STEPS:                                             ║");
  console.log("║  1. Verify on Polygonscan:                               ║");
  console.log("║     npx hardhat verify --network polygon \\              ║");
  console.log(`║       ${nftAddress} \\  ║`);
  console.log(`║       "${CONFIG.genesisAnchor}" \\                        ║`);
  console.log(`║       ${CONFIG.founderMaxSupply} ${CONFIG.publicMaxSupply} "${CONFIG.baseURI}" ${CONFIG.royaltyBps}              ║`);
  console.log("║  2. Author-mint the Genesis 1/1:                         ║");
  console.log("║     nft.authorMint(0, authorAddress)                     ║");
  console.log("║  3. Open Founder minting when ready:                     ║");
  console.log("║     nft.openMint(1)                                      ║");
  console.log("║  4. Update base URI with metadata:                       ║");
  console.log("║     nft.setBaseURI(\"ipfs://QmMetadata/\")                 ║");
  console.log("║  5. Add to DEPLOYMENTS.md                                ║");
  console.log("║  6. Link in AuthorIdentity contract                      ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  });
