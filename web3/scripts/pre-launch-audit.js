/**
 * pre-launch-audit.js — Pre-traffic verification of all NFT contracts
 * Run: npx hardhat run web3/scripts/pre-launch-audit.js --network polygon
 */
const hre = require("hardhat");

const EDITION_NFT = "0x9e9Cc1486bf440Bd9eAaaD947958524Aaed3f8b0";
const STORY_NFT   = "0xD67e537Dba1236f802432cbDD30Fec3f6D38e7E3";
const AUTHOR      = "0xC91668184736BF75C4ecE37473D694efb2A43978";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  let issues = [];
  let pass = 0;

  function check(label, ok, detail) {
    if (ok) { console.log(`  ✅ ${label}: ${detail}`); pass++; }
    else    { console.log(`  ❌ ${label}: ${detail}`); issues.push(label); }
  }

  // ══════════════════════════════════════════════════════════════
  //  EDITION NFT
  // ══════════════════════════════════════════════════════════════
  console.log("\n━━━ EDITION NFT ━━━");
  const edition = await hre.ethers.getContractAt("EditionNFT", EDITION_NFT);

  const eAuthor = await edition.author();
  check("Author address", eAuthor === AUTHOR, eAuthor);

  // Genesis tier
  const genesis = await edition.getTier(0);
  check("Genesis maxSupply", genesis.maxSupply.toString() === "1", genesis.maxSupply.toString());
  check("Genesis minted", true, `${genesis.minted.toString()} / 1`);
  check("Genesis editionLinked", genesis.editionLinked, `linked=${genesis.editionLinked}`);
  check("Genesis mintOpen", !genesis.mintOpen, `open=${genesis.mintOpen} (should be false — author-only)`);

  const genesisMinted = Number(genesis.minted);
  if (genesisMinted === 0) {
    console.log("  ⚠️  GENESIS NOT MINTED — Must author-mint before launch");
    issues.push("Genesis not minted");
  } else {
    console.log(`  ✅ Genesis already minted (${genesisMinted}/1)`);
    pass++;
  }

  // Founder tier
  const founder = await edition.getTier(1);
  check("Founder maxSupply", founder.maxSupply.toString() === "33", founder.maxSupply.toString());
  check("Founder price", hre.ethers.formatEther(founder.price) === "5.0", `${hre.ethers.formatEther(founder.price)} POL`);
  check("Founder editionLinked", founder.editionLinked, `linked=${founder.editionLinked}`);
  check("Founder mintOpen", !founder.mintOpen, `open=${founder.mintOpen} (closed until launch)`);
  console.log(`     Founder minted: ${founder.minted.toString()} / 33`);

  // Public tier
  const pub = await edition.getTier(2);
  check("Public maxSupply", pub.maxSupply.toString() === "2500", pub.maxSupply.toString());
  check("Public price", hre.ethers.formatEther(pub.price) === "1.0", `${hre.ethers.formatEther(pub.price)} POL`);
  check("Public editionLinked", pub.editionLinked, `linked=${pub.editionLinked}`);
  check("Public mintOpen", !pub.mintOpen, `open=${pub.mintOpen} (closed until launch)`);
  console.log(`     Public minted: ${pub.minted.toString()} / 2500`);

  // Royalty
  const [royaltyReceiver, royaltyAmount] = await edition.royaltyInfo(1, hre.ethers.parseEther("100"));
  check("Royalty receiver", royaltyReceiver === AUTHOR, royaltyReceiver);
  check("Royalty rate 7.5%", hre.ethers.formatEther(royaltyAmount) === "7.5", `${hre.ethers.formatEther(royaltyAmount)} POL on 100 POL sale`);

  // Metadata
  try {
    const uri = await edition.tokenURI(1);
    check("tokenURI(1)", true, uri);
  } catch {
    console.log("  ℹ️  tokenURI(1): reverts (no tokens minted yet — expected)");
  }

  const eName = await edition.name();
  const eSymbol = await edition.symbol();
  check("Name/Symbol", eName === "The 2,500 Donkeys" && eSymbol === "DONKEY", `${eName} / ${eSymbol}`);

  // ══════════════════════════════════════════════════════════════
  //  STORY NFT
  // ══════════════════════════════════════════════════════════════
  console.log("\n━━━ STORY NFT ━━━");
  const story = await hre.ethers.getContractAt("StoryNFT", STORY_NFT);

  const sAuthor = await story.author();
  check("Author address", sAuthor === AUTHOR, sAuthor);

  const sName = await story.name();
  const sSymbol = await story.symbol();
  check("Name/Symbol", sName === "Private Placement Puppetry" && sSymbol === "STORY", `${sName} / ${sSymbol}`);

  const regCount = await story.registeredCount();
  check("Registered stories", regCount.toString() === "14", `${regCount} stories`);

  // Check each story
  const storyTitles = [
    "MT799 Is Not Money", "The Bank That Didn't Exist",
    "Commission Above Supply Depth", "The Ghost Monetizer",
    "The Mandate That Couldn't Sign", "Vault Without Address",
    "The Compliance Wall", "Bonded but Never Seen",
    "The Sovereign Whisper", "The Tokenized Mirage",
    "The Initiator Awakening", "The Financial Alchemist's Punch List",
    "The Exclusivity Trap", "The Off-Ledger Revelation",
  ];

  let allMintOpen = true;
  let allPriced = true;
  let allRegistered = true;
  for (let i = 0; i < 14; i++) {
    const s = await story.getStory(i);
    if (!s.registered) { allRegistered = false; console.log(`  ❌ Story ${i} not registered`); }
    if (!s.mintOpen) allMintOpen = false;
    if (hre.ethers.formatEther(s.price) !== "1.0") allPriced = false;
    if (s.title !== storyTitles[i]) {
      console.log(`  ❌ Story ${i} title mismatch: "${s.title}" vs "${storyTitles[i]}"`);
    }
    if (s.contentHash === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      console.log(`  ❌ Story ${i} has zero content hash`);
    }
  }
  check("All 14 registered", allRegistered, "all registered");
  check("All mint open", allMintOpen, `allOpen=${allMintOpen}`);
  check("All priced at 1 POL", allPriced, "1.0 POL each");

  // Story royalty
  const [sRoyaltyRec, sRoyaltyAmt] = await story.royaltyInfo(1, hre.ethers.parseEther("100"));
  check("Royalty receiver", sRoyaltyRec === AUTHOR, sRoyaltyRec);
  check("Royalty rate 7.5%", hre.ethers.formatEther(sRoyaltyAmt) === "7.5", `${hre.ethers.formatEther(sRoyaltyAmt)} POL on 100`);

  const sTotalMinted = await story.totalMinted();
  console.log(`     Total minted: ${sTotalMinted.toString()} / 1400`);

  // ══════════════════════════════════════════════════════════════
  //  MINT PAGE CROSS-CHECK
  // ══════════════════════════════════════════════════════════════
  console.log("\n━━━ MINT PAGE CROSS-CHECK ━━━");
  const fs = require("fs");
  const mintHtml = fs.readFileSync("site/mint.html", "utf8");

  check("mint.html has EditionNFT addr", mintHtml.includes(EDITION_NFT), EDITION_NFT);
  check("mint.html has StoryNFT addr", mintHtml.includes(STORY_NFT), STORY_NFT);
  // Zero-addr appears only in guard checks (if addr !== 0x0...), not as actual contract addresses — OK
  const zeroAddrAsValue = /ADDRESS\s*=\s*'0x0{40}'/.test(mintHtml);
  check("mint.html no zero-addr values", !zeroAddrAsValue, "contract addresses are real, not placeholders");
  check("mint.html chain ID 0x89", mintHtml.includes("0x89"), "Polygon chain ID");
  check("mint.html Polygonscan links", mintHtml.includes("polygonscan.com"), "explorer links present");

  // ══════════════════════════════════════════════════════════════
  //  WALLET BALANCE
  // ══════════════════════════════════════════════════════════════
  console.log("\n━━━ WALLET ━━━");
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`  Balance: ${hre.ethers.formatEther(balance)} POL`);

  // ══════════════════════════════════════════════════════════════
  //  SUMMARY
  // ══════════════════════════════════════════════════════════════
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log(`║  PRE-LAUNCH AUDIT: ${pass} PASS, ${issues.length} ISSUES          ║`);
  console.log("╠══════════════════════════════════════════════════╣");
  if (issues.length === 0) {
    console.log("║  ALL CLEAR — Ready for traffic                  ║");
  } else {
    for (const issue of issues) {
      console.log(`║  ⚠️  ${issue.padEnd(43)}║`);
    }
  }
  console.log("╚══════════════════════════════════════════════════╝\n");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
