/**
 * Minimal raw-transaction Polygon deployment.
 * Bypasses ALL ethers.js middleware — no gas station, no auto-detect.
 * Uses raw `eth_sendRawTransaction` for maximum compatibility.
 */
require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  // ── Load artifact ──────────────────────────────────────────────
  const artifactPath = path.join(
    __dirname, "..", "artifacts", "web3", "contracts",
    "LiteraryAnchor.sol", "LiteraryAnchor.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // ── Load genesis ───────────────────────────────────────────────
  const genesisPath = path.join(__dirname, "..", "metadata", "genesis.json");
  const genesis = JSON.parse(fs.readFileSync(genesisPath, "utf8"));
  const title = genesis.title;
  const ipfsCID = genesis.ipfs.cid;
  const sha256 = genesis.build.sha256;

  console.log("\n══════════════════════════════════════════════════");
  console.log("  THE 2,500 DONKEYS — Raw Deploy to Polygon");
  console.log("══════════════════════════════════════════════════\n");

  // ── Try multiple RPCs until one works ──────────────────────────
  const rpcs = [
    "https://rpc.ankr.com/polygon",
    "https://1rpc.io/matic",
    "https://polygon-bor-rpc.publicnode.com",
    "https://polygon.llamarpc.com",
  ];

  let provider = null;
  let rpcUsed = "";
  const network = new ethers.Network("polygon", 137);

  for (const rpc of rpcs) {
    try {
      const p = new ethers.JsonRpcProvider(rpc, network, { staticNetwork: network });
      const bn = await p.getBlockNumber();
      console.log(`  ✓ ${rpc} — block ${bn}`);
      provider = p;
      rpcUsed = rpc;
      break;
    } catch (e) {
      console.log(`  ✗ ${rpc} — ${e.message.slice(0, 60)}`);
    }
  }

  if (!provider) {
    console.error("  All RPCs failed. Aborting.");
    process.exit(1);
  }

  // ── Wallet ─────────────────────────────────────────────────────
  const pk = process.env.PRIVATE_KEY;
  const wallet = new ethers.Wallet(pk, provider);
  const balance = await provider.getBalance(wallet.address);
  const nonce = await provider.getTransactionCount(wallet.address, "latest");

  console.log(`\n  Deployer: ${wallet.address}`);
  console.log(`  Balance:  ${ethers.formatEther(balance)} POL`);
  console.log(`  Nonce:    ${nonce}`);

  // ── Encode constructor args ────────────────────────────────────
  const iface = new ethers.Interface(artifact.abi);
  const deployData = ethers.hexlify(
    ethers.concat([artifact.bytecode, iface.encodeDeploy([title, ipfsCID, sha256])])
  );

  // ── Gas estimation via RPC ─────────────────────────────────────
  // Use eth_gasPrice directly — bypasses any plugin
  const gasPriceHex = await provider.send("eth_gasPrice", []);
  const gasPrice = BigInt(gasPriceHex);
  // Add 20% buffer
  const adjustedGasPrice = gasPrice + (gasPrice * 20n / 100n);
  console.log(`  Gas Price: ${ethers.formatUnits(adjustedGasPrice, "gwei")} gwei (RPC + 20%)`);

  // ── Build raw transaction ──────────────────────────────────────
  const tx = {
    type: 0,  // Legacy transaction — most compatible
    to: null, // Contract creation
    nonce: nonce,
    gasLimit: 1500000,
    gasPrice: adjustedGasPrice,
    data: deployData,
    chainId: 137,
  };

  // Estimate cost
  const estimatedCost = BigInt(tx.gasLimit) * adjustedGasPrice;
  console.log(`  Est. Cost: ${ethers.formatEther(estimatedCost)} POL`);
  console.log(`  Gas Limit: ${tx.gasLimit}`);

  if (estimatedCost > balance) {
    console.error(`\n  ✗ Insufficient balance. Need ${ethers.formatEther(estimatedCost)} POL`);
    process.exit(1);
  }

  // ── Sign and send ──────────────────────────────────────────────
  console.log(`\n  Signing and broadcasting...`);
  const signedTx = await wallet.signTransaction(tx);
  console.log(`  Signed tx length: ${signedTx.length} chars`);

  // Send via raw RPC call
  const txHash = await provider.send("eth_sendRawTransaction", [signedTx]);
  console.log(`  Tx Hash:  ${txHash}`);
  console.log(`  Explorer: https://polygonscan.com/tx/${txHash}`);

  // ── Wait for receipt ───────────────────────────────────────────
  console.log(`\n  Waiting for confirmation (up to 5 min)...`);

  let receipt = null;
  const start = Date.now();
  const timeout = 300000; // 5 minutes

  while (!receipt && Date.now() - start < timeout) {
    try {
      receipt = await provider.getTransactionReceipt(txHash);
    } catch (e) {
      // Ignore transient errors
    }
    if (!receipt) {
      const elapsed = Math.round((Date.now() - start) / 1000);
      process.stdout.write(`\r  Polling... ${elapsed}s`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  if (!receipt) {
    console.log(`\n\n  ⚠ Timeout after 5 min. Tx may still be pending.`);
    console.log(`  Check: https://polygonscan.com/tx/${txHash}`);
    process.exit(1);
  }

  if (receipt.status !== 1) {
    console.error(`\n  ✗ Transaction REVERTED at block ${receipt.blockNumber}`);
    process.exit(1);
  }

  const contractAddress = receipt.contractAddress;
  console.log(`\n\n  ✓ CONTRACT DEPLOYED!`);
  console.log(`  Address: ${contractAddress}`);
  console.log(`  Block:   ${receipt.blockNumber}`);
  console.log(`  Gas:     ${receipt.gasUsed.toString()}`);
  console.log(`  Cost:    ${ethers.formatEther(receipt.gasUsed * receipt.gasPrice)} POL`);

  // ── On-chain verification ──────────────────────────────────────
  console.log(`\n  ── On-chain verification ──`);
  const deployed = new ethers.Contract(contractAddress, artifact.abi, provider);
  const storedTitle = await deployed.title();
  const ge = await deployed.genesis();
  const storedAuthor = await deployed.author();

  console.log(`  Title:   ${storedTitle}`);
  console.log(`  CID:     ${ge.ipfsCID}`);
  console.log(`  SHA:     ${ge.sha256Hash}`);
  console.log(`  Author:  ${storedAuthor}`);
  console.log(`  Match:   CID=${ge.ipfsCID === ipfsCID ? "✓" : "✗"} SHA=${ge.sha256Hash === sha256 ? "✓" : "✗"} Author=${storedAuthor.toLowerCase() === wallet.address.toLowerCase() ? "✓" : "✗"}`);

  // ── Update genesis.json ────────────────────────────────────────
  genesis.chain = {
    network: "polygon-mainnet",
    chainId: 137,
    contract: contractAddress,
    txHash: txHash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    deploymentCost: ethers.formatEther(receipt.gasUsed * receipt.gasPrice) + " POL",
    authorWallet: wallet.address,
    deployedAt: new Date().toISOString(),
    explorer: `https://polygonscan.com/address/${contractAddress}`,
  };
  fs.writeFileSync(genesisPath, JSON.stringify(genesis, null, 2) + "\n");
  console.log(`\n  ✓ genesis.json updated`);

  // ── Save receipt ───────────────────────────────────────────────
  const receiptPath = path.join(__dirname, "..", "metadata", "deployment-receipt.json");
  fs.writeFileSync(receiptPath, JSON.stringify({
    network: "polygon-mainnet", chainId: 137,
    contract: contractAddress, txHash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    gasPrice: ethers.formatUnits(receipt.gasPrice, "gwei") + " gwei",
    cost: ethers.formatEther(receipt.gasUsed * receipt.gasPrice) + " POL",
    deployer: wallet.address,
    constructorArgs: [title, ipfsCID, sha256],
    deployedAt: new Date().toISOString(),
    explorer: {
      contract: `https://polygonscan.com/address/${contractAddress}`,
      tx: `https://polygonscan.com/tx/${txHash}`,
    },
  }, null, 2) + "\n");
  console.log(`  ✓ deployment-receipt.json saved`);

  const finalBal = await provider.getBalance(wallet.address);
  console.log(`  Final balance: ${ethers.formatEther(finalBal)} POL`);

  console.log(`\n══════════════════════════════════════════════════`);
  console.log(`  GENESIS ANCHORED. The donkeys are on-chain.`);
  console.log(`══════════════════════════════════════════════════`);
  console.log(`  Polygonscan: https://polygonscan.com/address/${contractAddress}`);
  console.log(`  Transaction: https://polygonscan.com/tx/${txHash}\n`);
}

main().catch((e) => {
  console.error("\n  ✗ Failed:", e.message || e);
  process.exitCode = 1;
});
