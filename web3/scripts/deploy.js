const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // ── Load genesis metadata ──────────────────────────────────────
  const genesisPath = path.join(__dirname, "..", "web3", "metadata", "genesis.json");
  const genesis = JSON.parse(fs.readFileSync(genesisPath, "utf8"));

  const title = genesis.title;               // "The 2,500 Donkeys"
  const ipfsCID = genesis.ipfs.cid;          // Root archive CID
  const sha256 = genesis.build.sha256;       // Manuscript SHA-256

  console.log("\n══════════════════════════════════════════════════");
  console.log("  THE 2,500 DONKEYS — Polygon Anchor Deployment");
  console.log("══════════════════════════════════════════════════\n");
  console.log(`  Title:    ${title}`);
  console.log(`  CID:      ${ipfsCID}`);
  console.log(`  SHA-256:  ${sha256}`);
  console.log(`  Network:  ${hre.network.name}`);

  // ── Get deployer info ──────────────────────────────────────────
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Balance:  ${hre.ethers.formatEther(balance)} MATIC\n`);

  if (balance === 0n) {
    console.error("  ✗ Wallet has 0 MATIC. Fund it before deploying.");
    console.error(`    Send MATIC to: ${deployer.address}`);
    process.exit(1);
  }

  // ── Deploy contract ────────────────────────────────────────────
  console.log("  Deploying LiteraryAnchor...\n");

  const LiteraryAnchor = await hre.ethers.getContractFactory("LiteraryAnchor");
  const anchor = await LiteraryAnchor.deploy(title, ipfsCID, sha256);

  await anchor.waitForDeployment();
  const contractAddress = await anchor.getAddress();
  const deployTx = anchor.deploymentTransaction();
  const receipt = await deployTx.wait();

  console.log("  ✓ Contract deployed!\n");
  console.log(`  Contract:  ${contractAddress}`);
  console.log(`  Tx Hash:   ${deployTx.hash}`);
  console.log(`  Block:     ${receipt.blockNumber}`);
  console.log(`  Gas Used:  ${receipt.gasUsed.toString()}`);
  console.log(`  Gas Price: ${hre.ethers.formatUnits(receipt.gasPrice || 0n, "gwei")} gwei\n`);

  // ── Verify on-chain state ──────────────────────────────────────
  const storedTitle = await anchor.title();
  const genesisEdition = await anchor.genesis();

  console.log("  ── On-chain verification ──");
  console.log(`  Stored Title:  ${storedTitle}`);
  console.log(`  Stored CID:    ${genesisEdition.ipfsCID}`);
  console.log(`  Stored SHA:    ${genesisEdition.sha256Hash}`);
  console.log(`  Stored Author: ${await anchor.author()}`);
  console.log(`  Editions:      ${await anchor.editionCount()}\n`);

  // ── Update genesis.json ────────────────────────────────────────
  genesis.chain = {
    network: hre.network.name === "polygon" ? "polygon-mainnet" : hre.network.name,
    chainId: hre.network.config.chainId,
    contract: contractAddress,
    txHash: deployTx.hash,
    blockNumber: receipt.blockNumber,
    authorWallet: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(genesisPath, JSON.stringify(genesis, null, 2) + "\n");
  console.log("  ✓ genesis.json updated with contract details");

  // ── Save deployment receipt ────────────────────────────────────
  const receiptPath = path.join(__dirname, "..", "web3", "metadata", "deployment-receipt.json");
  const receiptData = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    contract: contractAddress,
    txHash: deployTx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    deployer: deployer.address,
    constructorArgs: [title, ipfsCID, sha256],
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(receiptPath, JSON.stringify(receiptData, null, 2) + "\n");
  console.log("  ✓ deployment-receipt.json saved\n");

  console.log("══════════════════════════════════════════════════");
  console.log("  GENESIS ANCHORED. The donkeys are on-chain.");
  console.log("══════════════════════════════════════════════════\n");

  // ── Explorer link ──────────────────────────────────────────────
  if (hre.network.name === "polygon") {
    console.log(`  View: https://polygonscan.com/address/${contractAddress}`);
  } else if (hre.network.name === "amoy") {
    console.log(`  View: https://amoy.polygonscan.com/address/${contractAddress}`);
  }
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
