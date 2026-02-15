/**
 * wire-identity.js — Register bibliography + link contracts on deployed AuthorIdentity
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const CONTRACT = "0xB9ffa688A8Bb332221030BbBE46bE5bF03323170";

async function main() {
  const identity = await hre.ethers.getContractAt("AuthorIdentity", CONTRACT);
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // ── Check current state ─────────────────────────────────────────
  const worksCount = await identity.getBibliographyCount();
  const linksCount = await identity.getLinkedContractCount();
  console.log("Current works:", worksCount.toString());
  console.log("Current links:", linksCount.toString());

  // ══════════════════════════════════════════════════════════════════
  //  REGISTER BIBLIOGRAPHY (if not already done)
  // ══════════════════════════════════════════════════════════════════

  if (Number(worksCount) === 0) {
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
      "on-chain",
      "amazon", "amazon", "amazon", "amazon", "amazon",
      "amazon", "amazon", "amazon", "amazon", "amazon", "amazon"
    ];

    const identifiers = [
      "0xca9F6604A9b498DB31d113836E2957c0a9aAE037",
      "B0DQ5FN1GP", "B0DQ5FN1GP", "B0DQ5FN1GP", "B0DQ5FN1GP", "B0DQ5FN1GP",
      "B0DQ5FN1GP", "B0DQ5FN1GP", "B0DQ5FN1GP", "B0DQ5FN1GP", "B0DQ5FN1GP", "B0DQ5FN1GP"
    ];

    const batchTx = await identity.registerWorksBatch(titles, platforms, identifiers);
    console.log("  TX sent:", batchTx.hash);
    const batchReceipt = await batchTx.wait();
    console.log("  ✅ " + titles.length + " works registered (gas: " + batchReceipt.gasUsed.toString() + ")");

    for (let i = 0; i < titles.length; i++) {
      console.log("     [" + i + "] " + titles[i] + " (" + platforms[i] + ")");
    }
  } else {
    console.log("  Bibliography already registered, skipping.");
  }

  // ══════════════════════════════════════════════════════════════════
  //  LINK PROTOCOL CONTRACTS (if not already done)
  // ══════════════════════════════════════════════════════════════════

  if (Number(linksCount) === 0) {
    console.log("\n━━━ Linking Protocol Contracts ━━━");

    const links = [
      { address: "0x97f456300817eaE3B40E235857b856dfFE8bba90", role: "genesis-anchor" },
      { address: "0x511c653fC0F450ba41C42A89A3125CcBf2eFE8ae", role: "publishing-kernel-v1" },
      { address: "0xca9F6604A9b498DB31d113836E2957c0a9aAE037", role: "publishing-kernel-v2" },
      { address: "0x44169829489d70aaecbf845870652871C65fC461", role: "royalty-router" }
    ];

    for (const link of links) {
      const tx = await identity.linkContract(link.address, link.role);
      const r = await tx.wait();
      console.log("  ✅ " + link.role + " → " + link.address + " (gas: " + r.gasUsed.toString() + ")");
    }
  } else {
    console.log("  Contracts already linked, skipping.");
  }

  // ══════════════════════════════════════════════════════════════════
  //  UPDATE METADATA
  // ══════════════════════════════════════════════════════════════════

  console.log("\n━━━ Updating Metadata ━━━");

  const genesisPath = path.resolve(__dirname, "..", "metadata", "genesis.json");
  const editionPath = path.resolve(__dirname, "..", "..", "dist", "edition.json");

  const identityMeta = {
    contract: CONTRACT,
    realName: "Kevan Burns",
    nickname: "Burnzy",
    pseudonym: "Kidd James",
    organization: "FTH Trading",
    domain: "unykorn.org",
    amazonAuthorUrl: "https://www.amazon.com/stores/author/B0DQ5FN1GP",
    worksRegistered: Number(await identity.getBibliographyCount()),
    contractsLinked: Number(await identity.getLinkedContractCount())
  };

  if (fs.existsSync(genesisPath)) {
    const genesis = JSON.parse(fs.readFileSync(genesisPath, "utf-8"));
    genesis.author = "Kevan Burns (Kidd James)";
    genesis.authorIdentity = identityMeta;
    fs.writeFileSync(genesisPath, JSON.stringify(genesis, null, 2) + "\n", "utf-8");
    console.log("  ✅ genesis.json updated");
  }

  if (fs.existsSync(editionPath)) {
    const edition = JSON.parse(fs.readFileSync(editionPath, "utf-8"));
    edition.author = "Kevan Burns (Kidd James)";
    edition.author_identity = {
      contract: CONTRACT,
      real_name: "Kevan Burns",
      nickname: "Burnzy",
      pseudonym: "Kidd James",
      organization: "FTH Trading",
      domain: "unykorn.org",
      amazon_author_url: "https://www.amazon.com/stores/author/B0DQ5FN1GP",
      works_registered: identityMeta.worksRegistered,
      contracts_linked: identityMeta.contractsLinked
    };
    fs.writeFileSync(editionPath, JSON.stringify(edition, null, 2) + "\n", "utf-8");
    console.log("  ✅ edition.json updated");
  }

  // ══════════════════════════════════════════════════════════════════
  //  FINAL STATE
  // ══════════════════════════════════════════════════════════════════

  console.log("\n━━━ Final State ━━━");
  const finalId = await identity.getIdentity();
  console.log("  Real name: ", finalId.realName);
  console.log("  Nickname:  ", finalId.nickname);
  console.log("  Pseudonym: ", finalId.pseudonym);
  console.log("  Org:       ", finalId.organization);
  console.log("  Domain:    ", finalId.domain);
  console.log("  Amazon:    ", finalId.amazonAuthorUrl);
  console.log("  Works:     ", (await identity.getBibliographyCount()).toString());
  console.log("  Contracts: ", (await identity.getLinkedContractCount()).toString());
  console.log("\n  ✅ AuthorIdentity fully wired\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
