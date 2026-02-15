/**
 * deploy-identity.js — Deploy AuthorIdentity and wire full bibliography + contracts
 *
 * Deploys the AuthorIdentity contract, then:
 *   1. Registers all 12 published works (11 Amazon + The 2,500 Donkeys on-chain)
 *   2. Links all 4 protocol contracts (genesis anchor, kernel v1, kernel v2, royalty router)
 *
 * Usage: npx hardhat run web3/scripts/deploy-identity.js --network polygon
 */

const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   AUTHOR IDENTITY — ON-CHAIN DECLARATION                ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("  Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("  Balance: ", hre.ethers.formatEther(balance), "POL\n");

  // ══════════════════════════════════════════════════════════════════
  //  DEPLOY
  // ══════════════════════════════════════════════════════════════════

  console.log("━━━ Deploying AuthorIdentity ━━━");

  const AuthorIdentity = await hre.ethers.getContractFactory("AuthorIdentity");
  const identity = await AuthorIdentity.deploy(
    "Kevan Burns",                                    // realName
    "Burnzy",                                          // nickname
    "Kidd James",                                      // pseudonym
    "FTH Trading",                                     // organization
    "unykorn.org",                                     // domain
    "https://www.amazon.com/stores/author/B0DQ5FN1GP"  // amazonAuthorUrl
  );

  await identity.waitForDeployment();
  const contractAddress = await identity.getAddress();
  const deployTx = identity.deploymentTransaction();
  const receipt = await deployTx.wait();

  console.log("  ✅ AuthorIdentity deployed");
  console.log("     Address:", contractAddress);
  console.log("     TX:     ", deployTx.hash);
  console.log("     Block:  ", receipt.blockNumber);
  console.log("     Gas:    ", receipt.gasUsed.toString());

  // ══════════════════════════════════════════════════════════════════
  //  REGISTER BIBLIOGRAPHY (batch)
  // ══════════════════════════════════════════════════════════════════

  console.log("\n━━━ Registering Bibliography ━━━");

  const titles = [
    "The 2,500 Donkeys",
    "The Ultimate Codex of the Great Shift",
    "Money, Madness, and Markets",
    "The Symphony of Resonance",
    "Ascension Unveiled",
    "Symphony of Darkness and Enlightenment",
    "Navigating The Digital Reset",
    "The Chronicles of Resilience",
    "Journey Through the Cosmic Web",
    "The Matrix Alchemist",
    "The Adventure of Kidd and Donald",
    "Money, Madness, and Markets (Second Edition)"
  ];

  const platforms = [
    "on-chain",   // The 2,500 Donkeys — our protocol
    "amazon",
    "amazon",
    "amazon",
    "amazon",
    "amazon",
    "amazon",
    "amazon",
    "amazon",
    "amazon",
    "amazon",
    "amazon"
  ];

  const identifiers = [
    "0xca9F6604A9b498DB31d113836E2957c0a9aAE037",  // PKV2 contract
    "B0DQ5FN1GP",   // Amazon author ID
    "B0DQ5FN1GP",
    "B0DQ5FN1GP",
    "B0DQ5FN1GP",
    "B0DQ5FN1GP",
    "B0DQ5FN1GP",
    "B0DQ5FN1GP",
    "B0DQ5FN1GP",
    "B0DQ5FN1GP",
    "B0DQ5FN1GP",
    "B0DQ5FN1GP"
  ];

  const batchTx = await identity.registerWorksBatch(titles, platforms, identifiers);
  const batchReceipt = await batchTx.wait();

  console.log(`  ✅ ${titles.length} works registered`);
  console.log("     TX:  ", batchTx.hash);
  console.log("     Gas: ", batchReceipt.gasUsed.toString());

  for (let i = 0; i < titles.length; i++) {
    console.log(`     [${i}] ${titles[i]} (${platforms[i]})`);
  }

  // ══════════════════════════════════════════════════════════════════
  //  LINK PROTOCOL CONTRACTS
  // ══════════════════════════════════════════════════════════════════

  console.log("\n━━━ Linking Protocol Contracts ━━━");

  const contractLinks = [
    { address: "0x97f456300817eaE3B40E235857b856dfFE8bba90", role: "genesis-anchor" },
    { address: "0x511c653fC0F450ba41C42A89A3125CcBf2eFE8ae", role: "publishing-kernel-v1" },
    { address: "0xca9F6604A9b498DB31d113836E2957c0a9aAE037", role: "publishing-kernel-v2" },
    { address: "0x44169829489d70aaecbf845870652871C65fC461", role: "royalty-router" }
  ];

  for (const link of contractLinks) {
    const tx = await identity.linkContract(link.address, link.role);
    const r = await tx.wait();
    console.log(`  ✅ Linked ${link.role}`);
    console.log(`     Address: ${link.address}`);
    console.log(`     TX:      ${tx.hash} (gas: ${r.gasUsed.toString()})`);
  }

  // ══════════════════════════════════════════════════════════════════
  //  VERIFY STATE
  // ══════════════════════════════════════════════════════════════════

  console.log("\n━━━ Verification ━━━");

  const id = await identity.getIdentity();
  console.log("  Real name: ", id.realName);
  console.log("  Nickname:  ", id.nickname);
  console.log("  Pseudonym: ", id.pseudonym);
  console.log("  Org:       ", id.organization);
  console.log("  Domain:    ", id.domain);
  console.log("  Amazon:    ", id.amazonAuthorUrl);
  console.log("  Works:     ", (await identity.getBibliographyCount()).toString());
  console.log("  Contracts: ", (await identity.getLinkedContractCount()).toString());

  // ══════════════════════════════════════════════════════════════════
  //  UPDATE METADATA
  // ══════════════════════════════════════════════════════════════════

  const genesisPath = path.resolve(__dirname, "..", "metadata", "genesis.json");
  const editionPath = path.resolve(__dirname, "..", "..", "dist", "edition.json");

  if (fs.existsSync(genesisPath)) {
    const genesis = JSON.parse(fs.readFileSync(genesisPath, "utf-8"));
    genesis.authorIdentity = {
      contract: contractAddress,
      deployTx: deployTx.hash,
      deployBlock: receipt.blockNumber,
      realName: "Kevan Burns",
      nickname: "Burnzy",
      pseudonym: "Kidd James",
      organization: "FTH Trading",
      domain: "unykorn.org",
      amazonAuthorUrl: "https://www.amazon.com/stores/author/B0DQ5FN1GP",
      worksRegistered: titles.length,
      contractsLinked: contractLinks.length
    };
    fs.writeFileSync(genesisPath, JSON.stringify(genesis, null, 2) + "\n", "utf-8");
    console.log("\n  ✅ genesis.json updated");
  }

  if (fs.existsSync(editionPath)) {
    const edition = JSON.parse(fs.readFileSync(editionPath, "utf-8"));
    edition.author_identity = {
      contract: contractAddress,
      real_name: "Kevan Burns",
      nickname: "Burnzy",
      pseudonym: "Kidd James",
      organization: "FTH Trading",
      domain: "unykorn.org",
      amazon_author_url: "https://www.amazon.com/stores/author/B0DQ5FN1GP",
      works_registered: titles.length,
      contracts_linked: contractLinks.length
    };
    fs.writeFileSync(editionPath, JSON.stringify(edition, null, 2) + "\n", "utf-8");
    console.log("  ✅ edition.json updated");
  }

  // ══════════════════════════════════════════════════════════════════
  //  SUMMARY
  // ══════════════════════════════════════════════════════════════════

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   AUTHOR IDENTITY — DEPLOYED & WIRED                    ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║   Contract:    ${contractAddress}   ║`);
  console.log(`║   Author:      Kevan Burns (Kidd James)                  ║`);
  console.log(`║   Works:       ${titles.length} registered                             ║`);
  console.log(`║   Contracts:   ${contractLinks.length} linked                               ║`);
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  console.log("  Next: Verify on Polygonscan:");
  console.log(`  npx hardhat verify --network polygon ${contractAddress} "Kevan Burns" "Burnzy" "Kidd James" "FTH Trading" "unykorn.org" "https://www.amazon.com/stores/author/B0DQ5FN1GP"`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
