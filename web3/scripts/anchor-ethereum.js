#!/usr/bin/env node
/**
 * anchor-ethereum.js — Ethereum Canonical Settlement Layer
 *
 * Sends a 0-value transaction to self with the edition_root encoded in calldata.
 * This creates an immutable, publicly verifiable timestamp on Ethereum mainnet.
 *
 * Cost: ~21,000 gas base + calldata bytes ≈ $0.50–$2.00 depending on gas price
 *
 * Usage:
 *   node web3/scripts/anchor-ethereum.js                 # mainnet
 *   node web3/scripts/anchor-ethereum.js --dry-run       # estimate only
 *   node web3/scripts/anchor-ethereum.js --network sepolia  # testnet
 *
 * Requires:
 *   PRIVATE_KEY in .env (same wallet as Polygon deploy)
 *   ETHEREUM_RPC in .env (optional, defaults to public endpoint)
 *
 * The tx calldata format:
 *   0x4c505331 (magic: "LPS1")
 *   + edition_root (32 bytes)
 *   + sha256 of compiled manuscript (32 bytes)
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// ══════════════════════════════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════════════════════════════

const NETWORKS = {
  mainnet: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpc: process.env.ETHEREUM_RPC || 'https://ethereum-rpc.publicnode.com',
    explorer: 'https://etherscan.io'
  },
  sepolia: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpc: process.env.SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com',
    explorer: 'https://sepolia.etherscan.io'
  }
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const networkArg = args.find(a => a.startsWith('--network'));
const networkName = networkArg ? args[args.indexOf(networkArg) + 1] || 'mainnet' : 'mainnet';
const network = NETWORKS[networkName] || NETWORKS.mainnet;

// ══════════════════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   ETHEREUM SETTLEMENT ANCHOR                                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Network: ${network.name} (chainId ${network.chainId})`);
  console.log(`  Mode:    ${dryRun ? 'DRY RUN (estimate only)' : 'LIVE'}`);
  console.log('');

  // ── Load edition data ────────────────────────────────────────────────
  const editionPath = path.resolve(__dirname, '../../dist/edition.json');
  if (!fs.existsSync(editionPath)) {
    console.error('  ❌ dist/edition.json not found. Run: node build/protocol.js');
    process.exit(1);
  }

  const edition = JSON.parse(fs.readFileSync(editionPath, 'utf-8'));

  // Extract raw hex (strip "sha256:" prefix)
  const editionRoot = edition.edition_root.replace('sha256:', '');
  const sha256 = edition.sha256;

  if (!editionRoot || !sha256) {
    console.error('  ❌ edition.json missing edition_root or sha256');
    process.exit(1);
  }

  console.log(`  Edition Root: ${editionRoot}`);
  console.log(`  SHA-256:      ${sha256}`);
  console.log('');

  // ── Build calldata ───────────────────────────────────────────────────
  // Format: 0x4c505331 + edition_root(32b) + sha256(32b)
  // "LPS1" in hex = 0x4c505331
  const magic = '4c505331';
  const calldata = '0x' + magic + editionRoot + sha256;

  console.log(`  Calldata: ${calldata.substring(0, 20)}...${calldata.substring(calldata.length - 20)}`);
  console.log(`  Calldata Size: ${(calldata.length - 2) / 2} bytes`);
  console.log('');

  // ── Connect wallet ───────────────────────────────────────────────────
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('  ❌ PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(network.rpc);
  const wallet = new ethers.Wallet(
    privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`,
    provider
  );

  console.log(`  Wallet: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`  Balance: ${balanceEth} ETH`);
  console.log('');

  // ── Estimate gas ─────────────────────────────────────────────────────
  const tx = {
    to: wallet.address,   // send to self
    value: 0n,             // 0 ETH
    data: calldata
  };

  let gasEstimate;
  try {
    gasEstimate = await provider.estimateGas({ ...tx, from: wallet.address });
    console.log(`  Gas Estimate: ${gasEstimate.toString()}`);
  } catch (e) {
    console.error(`  ❌ Gas estimation failed: ${e.message}`);
    process.exit(1);
  }

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;
  const estimatedCostWei = gasEstimate * gasPrice;
  const estimatedCostEth = ethers.formatEther(estimatedCostWei);

  console.log(`  Gas Price:     ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
  console.log(`  Est. Cost:     ${estimatedCostEth} ETH`);
  console.log('');

  if (balance < estimatedCostWei) {
    console.error(`  ❌ Insufficient balance. Need ~${estimatedCostEth} ETH`);
    process.exit(1);
  }

  // ── Dry run stops here ──────────────────────────────────────────────
  if (dryRun) {
    console.log('  ── DRY RUN COMPLETE ──');
    console.log('');
    console.log('  To anchor for real:');
    console.log(`    node web3/scripts/anchor-ethereum.js${networkName !== 'mainnet' ? ` --network ${networkName}` : ''}`);
    console.log('');
    return;
  }

  // ── Send transaction ────────────────────────────────────────────────
  console.log('  Sending transaction...');

  // Use EIP-1559 if available
  let txRequest;
  if (feeData.maxFeePerGas) {
    txRequest = {
      ...tx,
      type: 2,
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || 1000000000n,
      gasLimit: gasEstimate * 120n / 100n,  // 20% buffer
    };
  } else {
    txRequest = {
      ...tx,
      gasPrice,
      gasLimit: gasEstimate * 120n / 100n,
    };
  }

  const sentTx = await wallet.sendTransaction(txRequest);
  console.log(`  TX Hash: ${sentTx.hash}`);
  console.log(`  ${network.explorer}/tx/${sentTx.hash}`);
  console.log('');
  console.log('  Waiting for confirmation...');

  const receipt = await sentTx.wait(1);
  console.log(`  ✅ Confirmed in block ${receipt.blockNumber}`);
  console.log(`  Gas Used: ${receipt.gasUsed.toString()}`);
  console.log('');

  // ── Update edition.json ─────────────────────────────────────────────
  edition.anchors.ethereum.tx_hash = sentTx.hash;
  edition.anchors.ethereum.block = receipt.blockNumber;
  edition.anchors.ethereum.timestamp = new Date().toISOString();
  edition.anchors.ethereum.network = `ethereum-${networkName}`;
  edition.anchors.ethereum.chain_id = network.chainId;
  edition.anchors.ethereum.gas_used = receipt.gasUsed.toString();
  edition.anchors.ethereum.calldata = calldata;

  fs.writeFileSync(editionPath, JSON.stringify(edition, null, 2), 'utf-8');
  console.log('  ✅ edition.json updated with Ethereum anchor');
  console.log('');

  // ── Summary ─────────────────────────────────────────────────────────
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  ETHEREUM ANCHOR COMPLETE');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  TX:     ${sentTx.hash}`);
  console.log(`  Block:  ${receipt.blockNumber}`);
  console.log(`  Verify: ${network.explorer}/tx/${sentTx.hash}`);
  console.log('');
  console.log('  Anyone can verify:');
  console.log('    1. Look up the TX on Etherscan');
  console.log('    2. Decode calldata: 4c505331 + edition_root + sha256');
  console.log('    3. Compare to dist/edition.json');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
}

main().catch(err => {
  console.error(`  ❌ ${err.message}`);
  process.exit(1);
});
