/**
 * wire-identity-seq.js — Sequential registration to handle Node v24 assertion
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const CONTRACT = "0xB9ffa688A8Bb332221030BbBE46bE5bF03323170";

const WORKS = [
  { title: "The 2,500 Donkeys", platform: "on-chain", id: "0xca9F6604A9b498DB31d113836E2957c0a9aAE037" },
  { title: "The Ultimate Codex of the Great Shift", platform: "amazon", id: "B0DQ5FN1GP" },
  { title: "Money, Madness, and Markets", platform: "amazon", id: "B0DQ5FN1GP" },
  { title: "The Symphony of Resonance", platform: "amazon", id: "B0DQ5FN1GP" },
  { title: "Ascension Unveiled", platform: "amazon", id: "B0DQ5FN1GP" },
  { title: "Symphony of Darkness and Enlightenment", platform: "amazon", id: "B0DQ5FN1GP" },
  { title: "Navigating The Digital Reset", platform: "amazon", id: "B0DQ5FN1GP" },
  { title: "The Chronicles of Resilience", platform: "amazon", id: "B0DQ5FN1GP" },
  { title: "Journey Through the Cosmic Web", platform: "amazon", id: "B0DQ5FN1GP" },
  { title: "The Matrix Alchemist", platform: "amazon", id: "B0DQ5FN1GP" },
  { title: "The Adventure of Kidd and Donald", platform: "amazon", id: "B0DQ5FN1GP" },
  { title: "Money, Madness, and Markets (Second Edition)", platform: "amazon", id: "B0DQ5FN1GP" }
];

const LINKS = [
  { address: "0x97f456300817eaE3B40E235857b856dfFE8bba90", role: "genesis-anchor" },
  { address: "0x511c653fC0F450ba41C42A89A3125CcBf2eFE8ae", role: "publishing-kernel-v1" },
  { address: "0xca9F6604A9b498DB31d113836E2957c0a9aAE037", role: "publishing-kernel-v2" },
  { address: "0x44169829489d70aaecbf845870652871C65fC461", role: "royalty-router" }
];

async function main() {
  const identity = await hre.ethers.getContractAt("AuthorIdentity", CONTRACT);
  const worksCount = Number(await identity.getBibliographyCount());
  const linksCount = Number(await identity.getLinkedContractCount());

  console.log("Current works:", worksCount, "| links:", linksCount);

  // Register remaining works one at a time
  for (let i = worksCount; i < WORKS.length; i++) {
    const w = WORKS[i];
    console.log("[" + i + "] Registering: " + w.title);
    const tx = await identity.registerWork(w.title, w.platform, w.id);
    await tx.wait();
    console.log("    Done. TX: " + tx.hash);
  }

  // Link remaining contracts one at a time
  for (let i = linksCount; i < LINKS.length; i++) {
    const l = LINKS[i];
    console.log("[" + i + "] Linking: " + l.role);
    const tx = await identity.linkContract(l.address, l.role);
    await tx.wait();
    console.log("    Done. TX: " + tx.hash);
  }

  // Update metadata
  const genesisPath = path.resolve(__dirname, "..", "metadata", "genesis.json");
  const editionPath = path.resolve(__dirname, "..", "..", "dist", "edition.json");

  const meta = {
    contract: CONTRACT,
    realName: "Kevan Burns",
    nickname: "Burnzy",
    pseudonym: "Kidd James",
    organization: "FTH Trading",
    domain: "unykorn.org",
    amazonAuthorUrl: "https://www.amazon.com/stores/author/B0DQ5FN1GP",
    worksRegistered: WORKS.length,
    contractsLinked: LINKS.length
  };

  if (fs.existsSync(genesisPath)) {
    const g = JSON.parse(fs.readFileSync(genesisPath, "utf-8"));
    g.author = "Kevan Burns (Kidd James)";
    g.authorIdentity = meta;
    fs.writeFileSync(genesisPath, JSON.stringify(g, null, 2) + "\n", "utf-8");
    console.log("genesis.json updated");
  }

  if (fs.existsSync(editionPath)) {
    const e = JSON.parse(fs.readFileSync(editionPath, "utf-8"));
    e.author = "Kevan Burns (Kidd James)";
    e.author_identity = {
      contract: CONTRACT,
      real_name: meta.realName,
      nickname: meta.nickname,
      pseudonym: meta.pseudonym,
      organization: meta.organization,
      domain: meta.domain,
      amazon_author_url: meta.amazonAuthorUrl,
      works_registered: meta.worksRegistered,
      contracts_linked: meta.contractsLinked
    };
    fs.writeFileSync(editionPath, JSON.stringify(e, null, 2) + "\n", "utf-8");
    console.log("edition.json updated");
  }

  console.log("\nFinal — Works:", (await identity.getBibliographyCount()).toString(),
    "| Links:", (await identity.getLinkedContractCount()).toString());
  console.log("DONE");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
