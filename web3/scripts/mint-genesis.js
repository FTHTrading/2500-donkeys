/**
 * mint-genesis.js — Author-mint Genesis 1/1 to the author wallet.
 * This is the founding token of The 2,500 Donkeys.
 * 
 * Run: npx hardhat run web3/scripts/mint-genesis.js --network polygon
 */
const hre = require("hardhat");

const EDITION_NFT = "0x9e9Cc1486bf440Bd9eAaaD947958524Aaed3f8b0";
const AUTHOR      = "0xC91668184736BF75C4ecE37473D694efb2A43978";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Author:  ", AUTHOR);

  const edition = await hre.ethers.getContractAt("EditionNFT", EDITION_NFT);

  // Pre-flight: verify Genesis hasn't been minted
  const genesis = await edition.getTier(0);
  if (Number(genesis.minted) > 0) {
    console.log("Genesis already minted. Nothing to do.");
    return;
  }

  console.log("\n━━━ MINTING GENESIS 1/1 ━━━");
  console.log("Contract: ", EDITION_NFT);
  console.log("Tier:      Genesis (0)");
  console.log("Recipient:", AUTHOR);
  console.log("Supply:    1/1");
  console.log("Cost:      0 POL (author-mint, gas only)\n");

  const tx = await edition.authorMint(0, AUTHOR);
  console.log("TX hash:  ", tx.hash);
  console.log("Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log("Block:    ", receipt.blockNumber);
  console.log("Gas used: ", receipt.gasUsed.toString());
  console.log("Status:   ", receipt.status === 1 ? "✅ SUCCESS" : "❌ FAILED");

  // Verify
  const owner = await edition.ownerOf(1);
  console.log("\n━━━ VERIFICATION ━━━");
  console.log("Token #1 owner:", owner);
  console.log("Owner matches: ", owner === AUTHOR ? "✅" : "❌");

  const updated = await edition.getTier(0);
  console.log("Genesis minted:", updated.minted.toString(), "/ 1");

  const totalMinted = await edition.totalMinted();
  console.log("Total minted:  ", totalMinted.toString());

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  GENESIS 1/1 — THE FOUNDING TOKEN IS LIVE       ║");
  console.log("║  The 2,500 Donkeys, Token #1                    ║");
  console.log(`║  TX: ${tx.hash.slice(0, 18)}...  ║`);
  console.log("╚══════════════════════════════════════════════════╝\n");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
