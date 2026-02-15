/**
 * Direct Polygon deployment — bypasses Hardhat gas middleware.
 * Uses ethers.js v6 + compiled ABI/bytecode from Hardhat artifacts.
 *
 * Usage: node web3/scripts/deploy-direct.js
 */
require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  // ── Load compiled artifact ─────────────────────────────────────
  const artifactPath = path.join(
    __dirname, "..", "artifacts", "web3", "contracts",
    "LiteraryAnchor.sol", "LiteraryAnchor.json"
  );

  if (!fs.existsSync(artifactPath)) {
    // Try alternative path
    const altPath = path.join(
      __dirname, "..", "..", "web3", "artifacts", "web3", "contracts",
      "LiteraryAnchor.sol", "LiteraryAnchor.json"
    );
    if (fs.existsSync(altPath)) {
      var artifact = JSON.parse(fs.readFileSync(altPath, "utf8"));
    } else {
      // Search for it
      const searchRoot = path.join(__dirname, "..", "..");
      const found = findFile(searchRoot, "LiteraryAnchor.json");
      if (!found) {
        console.error("  ✗ Cannot find LiteraryAnchor.json artifact.");
        console.error("    Run: npx hardhat compile");
        process.exit(1);
      }
      var artifact = JSON.parse(fs.readFileSync(found, "utf8"));
    }
  } else {
    var artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  }

  // ── Load genesis metadata ──────────────────────────────────────
  const genesisPath = path.join(__dirname, "..", "metadata", "genesis.json");
  const genesis = JSON.parse(fs.readFileSync(genesisPath, "utf8"));

  const title = genesis.title;
  const ipfsCID = genesis.ipfs.cid;
  const sha256 = genesis.build.sha256;

  console.log("\n══════════════════════════════════════════════════");
  console.log("  THE 2,500 DONKEYS — Direct Polygon Deployment");
  console.log("══════════════════════════════════════════════════\n");
  console.log(`  Title:    ${title}`);
  console.log(`  CID:      ${ipfsCID}`);
  console.log(`  SHA-256:  ${sha256}\n`);

  // ── Connect to Polygon ─────────────────────────────────────────
  const rpcUrl = process.env.POLYGON_RPC || "https://polygon-bor-rpc.publicnode.com";
  
  // Use a generic network definition to avoid ethers' built-in Polygon
  // gas station plugin (gasstation.polygon.technology is unreliable).
  const network = new ethers.Network("polygon", 137);
  const provider = new ethers.JsonRpcProvider(rpcUrl, network, {
    staticNetwork: network,
  });

  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error("  ✗ PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  const wallet = new ethers.Wallet(pk, provider);
  const balance = await provider.getBalance(wallet.address);
  const nonce = await provider.getTransactionCount(wallet.address);

  console.log(`  Network:  Polygon Mainnet (137)`);
  console.log(`  RPC:      ${rpcUrl}`);
  console.log(`  Deployer: ${wallet.address}`);
  console.log(`  Balance:  ${ethers.formatEther(balance)} POL`);
  console.log(`  Nonce:    ${nonce}\n`);

  if (balance === 0n) {
    console.error("  ✗ Wallet has 0 POL. Fund it first.");
    process.exit(1);
  }

  // ── Get current gas price from RPC ─────────────────────────────
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits("50", "gwei");
  console.log(`  Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

  // ── Deploy ─────────────────────────────────────────────────────
  console.log("\n  Deploying LiteraryAnchor...\n");

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  // Explicitly set nonce to avoid stale nonce from prior failed attempts
  const currentNonce = await provider.getTransactionCount(wallet.address, "latest");
  console.log(`  Using nonce: ${currentNonce}`);

  const anchor = await factory.deploy(title, ipfsCID, sha256, {
    gasLimit: 1500000,  // 1.5M — plenty for this contract
    gasPrice: gasPrice,
    nonce: currentNonce,
  });

  console.log(`  Tx sent:   ${anchor.deploymentTransaction().hash}`);
  console.log("  Waiting for confirmation...\n");

  await anchor.waitForDeployment();
  const contractAddress = await anchor.getAddress();
  const deployTx = anchor.deploymentTransaction();
  const receipt = await provider.getTransactionReceipt(deployTx.hash);

  console.log("  ✓ Contract deployed!\n");
  console.log(`  Contract:  ${contractAddress}`);
  console.log(`  Tx Hash:   ${deployTx.hash}`);
  console.log(`  Block:     ${receipt.blockNumber}`);
  console.log(`  Gas Used:  ${receipt.gasUsed.toString()}`);
  console.log(`  Cost:      ${ethers.formatEther(receipt.gasUsed * receipt.gasPrice)} POL\n`);

  // ── Verify on-chain state ──────────────────────────────────────
  const deployed = new ethers.Contract(contractAddress, artifact.abi, provider);
  const storedTitle = await deployed.title();
  const genesisEdition = await deployed.genesis();
  const storedAuthor = await deployed.author();

  console.log("  ── On-chain verification ──\n");
  console.log(`  Stored Title:  ${storedTitle}`);
  console.log(`  Stored CID:    ${genesisEdition.ipfsCID}`);
  console.log(`  Stored SHA:    ${genesisEdition.sha256Hash}`);
  console.log(`  Stored Author: ${storedAuthor}`);
  console.log(`  Editions:      ${await deployed.editionCount()}\n`);

  // ── Integrity check ────────────────────────────────────────────
  const cidOk = genesisEdition.ipfsCID === ipfsCID;
  const shaOk = genesisEdition.sha256Hash === sha256;
  const authorOk = storedAuthor.toLowerCase() === wallet.address.toLowerCase();

  console.log("  ── Integrity Check ──\n");
  console.log(`  CID match:     ${cidOk ? "✓" : "✗"}`);
  console.log(`  SHA match:     ${shaOk ? "✓" : "✗"}`);
  console.log(`  Author match:  ${authorOk ? "✓" : "✗"}\n`);

  if (!cidOk || !shaOk || !authorOk) {
    console.error("  ⚠ INTEGRITY CHECK FAILED");
    process.exit(1);
  }

  // ── Update genesis.json ────────────────────────────────────────
  genesis.chain = {
    network: "polygon-mainnet",
    chainId: 137,
    contract: contractAddress,
    txHash: deployTx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    deploymentCost: ethers.formatEther(receipt.gasUsed * receipt.gasPrice) + " POL",
    authorWallet: wallet.address,
    deployedAt: new Date().toISOString(),
    explorer: `https://polygonscan.com/address/${contractAddress}`,
  };

  fs.writeFileSync(genesisPath, JSON.stringify(genesis, null, 2) + "\n");
  console.log("  ✓ genesis.json updated\n");

  // ── Save deployment receipt ────────────────────────────────────
  const receiptPath = path.join(__dirname, "..", "metadata", "deployment-receipt.json");
  const receiptData = {
    network: "polygon-mainnet",
    chainId: 137,
    contract: contractAddress,
    txHash: deployTx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    gasPrice: ethers.formatUnits(receipt.gasPrice, "gwei") + " gwei",
    cost: ethers.formatEther(receipt.gasUsed * receipt.gasPrice) + " POL",
    deployer: wallet.address,
    constructorArgs: [title, ipfsCID, sha256],
    deployedAt: new Date().toISOString(),
    explorer: {
      contract: `https://polygonscan.com/address/${contractAddress}`,
      tx: `https://polygonscan.com/tx/${deployTx.hash}`,
    },
  };

  fs.writeFileSync(receiptPath, JSON.stringify(receiptData, null, 2) + "\n");
  console.log("  ✓ deployment-receipt.json saved\n");

  // ── Final balance ──────────────────────────────────────────────
  const finalBal = await provider.getBalance(wallet.address);
  console.log(`  Final Balance: ${ethers.formatEther(finalBal)} POL\n`);

  console.log("══════════════════════════════════════════════════");
  console.log("  GENESIS ANCHORED. The donkeys are on-chain.");
  console.log("══════════════════════════════════════════════════\n");
  console.log(`  Polygonscan: https://polygonscan.com/address/${contractAddress}`);
  console.log(`  Transaction: https://polygonscan.com/tx/${deployTx.hash}\n`);
}

function findFile(dir, name) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.name === "node_modules") continue;
      if (e.isDirectory()) {
        const found = findFile(full, name);
        if (found) return found;
      } else if (e.name === name && !full.includes("dbg.json")) {
        return full;
      }
    }
  } catch (e) {}
  return null;
}

main().catch((error) => {
  console.error("\n  ✗ Deployment failed:");
  console.error(" ", error.message || error);
  process.exitCode = 1;
});
