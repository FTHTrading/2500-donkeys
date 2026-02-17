/**
 * deploy-story-nft.js — Deploy StoryNFT for Private Placement Programs
 *
 * Deploys the StoryNFT contract, then:
 *   1. Batch-registers all 14 stories with their SHA-256 content hashes
 *   2. Sets mint prices
 *   3. Opens minting for all stories
 *
 * Usage:
 *   npx hardhat run web3/scripts/deploy-story-nft.js --network polygon
 *   npx hardhat run web3/scripts/deploy-story-nft.js --network amoy
 *
 * Requires:
 *   - LiteraryAnchor already deployed
 *   - PPP edition already anchored (edition index 2)
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ══════════════════════════════════════════════════════════════════════
//  CONFIGURATION
// ══════════════════════════════════════════════════════════════════════

const CONFIG = {
  // LiteraryAnchor address (same anchor as EditionNFT)
  genesisAnchor: "0x97f456300817eaE3B40E235857b856dfFE8bba90",

  // PPP edition index on LiteraryAnchor
  editionIndex: 2,

  // Metadata base URI (update later via setBaseURI)
  baseURI: "ipfs://",

  // ERC-2981 royalty: 7.5%
  royaltyBps: 750,

  // Max supply per story (each story gets this many copies)
  maxSupplyPerStory: 100,

  // Mint price per story NFT (in POL)
  mintPrice: "1.0",

  // Story manuscript files (ordered by story ID 0..13)
  storyFiles: [
    "stories/manuscript/01-mt799-is-not-money.md",
    "stories/manuscript/02-the-bank-that-didnt-exist.md",
    "stories/manuscript/03-commission-above-supply-depth.md",
    "stories/manuscript/04-the-ghost-monetizer.md",
    "stories/manuscript/05-the-mandate-that-couldnt-sign.md",
    "stories/manuscript/06-vault-without-address.md",
    "stories/manuscript/07-the-compliance-wall.md",
    "stories/manuscript/08-bonded-but-never-seen.md",
    "stories/manuscript/09-the-sovereign-whisper.md",
    "stories/manuscript/10-the-tokenized-mirage.md",
    "stories/manuscript/11-the-initiator-awakening.md",
    "stories/manuscript/13-the-financial-alchemists-punch-list.md",
    "stories/manuscript/14-the-exclusivity-trap.md",
    "stories/manuscript/15-the-off-ledger-revelation.md",
  ],

  storyTitles: [
    "MT799 Is Not Money",
    "The Bank That Didn't Exist",
    "Commission Above Supply Depth",
    "The Ghost Monetizer",
    "The Mandate That Couldn't Sign",
    "Vault Without Address",
    "The Compliance Wall",
    "Bonded but Never Seen",
    "The Sovereign Whisper",
    "The Tokenized Mirage",
    "The Initiator Awakening",
    "The Financial Alchemist's Punch List",
    "The Exclusivity Trap",
    "The Off-Ledger Revelation",
  ],
};

// ══════════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════════

function hashFile(filePath) {
  const content = fs.readFileSync(path.resolve(filePath));
  return "0x" + crypto.createHash("sha256").update(content).digest("hex");
}

// ══════════════════════════════════════════════════════════════════════
//  DEPLOY
// ══════════════════════════════════════════════════════════════════════

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   STORY NFT — PER-STORY LITERARY NFT DEPLOYMENT         ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("  Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("  Balance: ", hre.ethers.formatEther(balance), "POL");
  console.log("  Network: ", hre.network.name);
  console.log("  Chain ID:", (await hre.ethers.provider.getNetwork()).chainId.toString());
  console.log();

  // ── Compute content hashes ──────────────────────────────────────

  console.log("━━━ Computing Content Hashes ━━━");
  const contentHashes = [];
  for (let i = 0; i < CONFIG.storyFiles.length; i++) {
    const hash = hashFile(CONFIG.storyFiles[i]);
    contentHashes.push(hash);
    console.log(`  [${i.toString().padStart(2)}] ${CONFIG.storyTitles[i]}`);
    console.log(`       ${hash}`);
  }
  console.log();

  // ── Verify anchor exists ─────────────────────────────────────────

  console.log("━━━ Pre-flight Checks ━━━");

  const anchorCode = await hre.ethers.provider.getCode(CONFIG.genesisAnchor);
  if (anchorCode === "0x") {
    console.error("  ❌ LiteraryAnchor not found at", CONFIG.genesisAnchor);
    process.exit(1);
  }
  console.log("  ✅ LiteraryAnchor found at", CONFIG.genesisAnchor);

  const anchorAbi = ["function editionCount() view returns (uint256)"];
  const anchor = new hre.ethers.Contract(CONFIG.genesisAnchor, anchorAbi, deployer);
  const editionCount = await anchor.editionCount();
  console.log("  ✅ Edition count:", editionCount.toString());

  if (CONFIG.editionIndex >= Number(editionCount)) {
    console.error(`  ❌ Need edition index ${CONFIG.editionIndex} but only ${editionCount} editions exist`);
    process.exit(1);
  }
  console.log("  ✅ PPP edition exists on-chain (index", CONFIG.editionIndex, ")\n");

  // ── Deploy ────────────────────────────────────────────────────────

  console.log("━━━ Deploying StoryNFT ━━━");

  const StoryNFT = await hre.ethers.getContractFactory("StoryNFT");
  const nft = await StoryNFT.deploy(
    CONFIG.genesisAnchor,
    CONFIG.editionIndex,
    CONFIG.baseURI,
    CONFIG.royaltyBps
  );

  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  const deployTx = nft.deploymentTransaction();
  const receipt = await deployTx.wait();

  console.log("  ✅ StoryNFT deployed");
  console.log("     Address:", nftAddress);
  console.log("     TX:     ", deployTx.hash);
  console.log("     Block:  ", receipt.blockNumber);
  console.log("     Gas:    ", receipt.gasUsed.toString());
  console.log();

  // ── Register all 14 stories ────────────────────────────────────

  console.log("━━━ Registering Stories (batch) ━━━");

  const storyIds = Array.from({ length: 14 }, (_, i) => i);
  const maxSupplies = Array(14).fill(CONFIG.maxSupplyPerStory);

  const regTx = await nft.registerStoriesBatch(
    storyIds,
    CONFIG.storyTitles,
    contentHashes,
    maxSupplies
  );
  const regReceipt = await regTx.wait();
  console.log("  ✅ 14 stories registered");
  console.log("     TX:  ", regTx.hash);
  console.log("     Gas: ", regReceipt.gasUsed.toString());
  console.log();

  // ── Set prices ────────────────────────────────────────────────

  console.log("━━━ Setting Prices ━━━");

  const price = hre.ethers.parseEther(CONFIG.mintPrice);
  const prices = Array(14).fill(price);
  const priceTx = await nft.setPriceBatch(storyIds, prices);
  await priceTx.wait();
  console.log("  ✅ All stories priced at", CONFIG.mintPrice, "POL");
  console.log();

  // ── Open minting ─────────────────────────────────────────────

  console.log("━━━ Opening Minting ━━━");

  const openTx = await nft.openMintAll();
  await openTx.wait();
  console.log("  ✅ Minting open for all 14 stories");
  console.log();

  // ── Summary ───────────────────────────────────────────────────

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   DEPLOYMENT COMPLETE                                    ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  Contract:    ${nftAddress}  ║`);
  console.log(`║  Name:        Private Placement Programs                  ║`);
  console.log(`║  Symbol:      STORY                                       ║`);
  console.log(`║  Stories:     14 registered                               ║`);
  console.log(`║  Supply:      ${CONFIG.maxSupplyPerStory} per story (${CONFIG.maxSupplyPerStory * 14} total)                      ║`);
  console.log(`║  Price:       ${CONFIG.mintPrice} POL per mint                            ║`);
  console.log(`║  Royalty:     ${CONFIG.royaltyBps / 100}%                                      ║`);
  console.log(`║  Edition:     ${CONFIG.editionIndex} (PPP on LiteraryAnchor)                  ║`);
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  NEXT STEPS:                                             ║");
  console.log("║  1. Verify on Polygonscan                                 ║");
  console.log("║  2. Update genesis.json with contract address             ║");
  console.log("║  3. Author-mint genesis copies                            ║");
  console.log("║  4. Update site with mint links                           ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // ── Write deployment receipt ──────────────────────────────────

  const deploymentData = {
    contract: "StoryNFT",
    address: nftAddress,
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deployTx: deployTx.hash,
    deployBlock: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    deployer: deployer.address,
    config: {
      genesisAnchor: CONFIG.genesisAnchor,
      editionIndex: CONFIG.editionIndex,
      royaltyBps: CONFIG.royaltyBps,
      maxSupplyPerStory: CONFIG.maxSupplyPerStory,
      mintPrice: CONFIG.mintPrice + " POL",
    },
    stories: CONFIG.storyTitles.map((title, i) => ({
      storyId: i,
      title,
      contentHash: contentHashes[i],
      maxSupply: CONFIG.maxSupplyPerStory,
    })),
    deployedAt: new Date().toISOString(),
  };

  const receiptPath = path.join("web3", "metadata", "story-nft-deployment.json");
  fs.writeFileSync(receiptPath, JSON.stringify(deploymentData, null, 2));
  console.log("  📄 Deployment receipt:", receiptPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
