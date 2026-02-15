/**
 * Anchor Edition 2 on the existing LiteraryAnchor contract.
 * Calls anchorEdition(ipfsCID, sha256Hash, note) with the author wallet.
 */
require("dotenv").config();
const { ethers } = require("ethers");

const CONTRACT = "0x97f456300817eaE3B40E235857b856dfFE8bba90";

const EDITION_2 = {
  ipfsCID:    "QmPXtEsRwiWuaKmKNA569XAqFNVySN8pwTdGQrvcdpgtMa",
  sha256Hash: "9d062421b52d35aa23b73bfc8f66574db78bad9726e45c43a12d0109cdd57d84",
  note:       "Edition 2 — 31 blocks, 293,368 bytes, ~75k words. Layers A-D expansion."
};

const ABI = [
  "function anchorEdition(string calldata _ipfsCID, string calldata _sha256Hash, string calldata _note) external",
  "function editionCount() external view returns (uint256)",
  "function latest() external view returns (tuple(string ipfsCID, string sha256Hash, uint256 timestamp, string title, string note))"
];

async function main() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("  THE 2,500 DONKEYS — Anchor Edition 2");
  console.log("══════════════════════════════════════════════════\n");

  // ── Try multiple RPCs ──────────────────────────────────────────
  const rpcs = [
    "https://rpc.ankr.com/polygon",
    "https://1rpc.io/matic",
    "https://polygon-bor-rpc.publicnode.com",
    "https://polygon.llamarpc.com",
  ];

  const network = new ethers.Network("polygon", 137);
  let provider = null;

  for (const rpc of rpcs) {
    try {
      const p = new ethers.JsonRpcProvider(rpc, network, { staticNetwork: network });
      const bn = await p.getBlockNumber();
      console.log(`  ✓ ${rpc} — block ${bn}`);
      provider = p;
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
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const balance = await provider.getBalance(wallet.address);
  console.log(`\n  Author:  ${wallet.address}`);
  console.log(`  Balance: ${ethers.formatEther(balance)} POL`);

  // ── Contract ───────────────────────────────────────────────────
  const contract = new ethers.Contract(CONTRACT, ABI, wallet);

  const countBefore = await contract.editionCount();
  console.log(`\n  Editions on-chain: ${countBefore}`);
  console.log(`  Anchoring Edition 2...`);
  console.log(`    CID:  ${EDITION_2.ipfsCID}`);
  console.log(`    Hash: ${EDITION_2.sha256Hash}`);
  console.log(`    Note: ${EDITION_2.note}`);

  // ── Get gas price manually ─────────────────────────────────────
  const gasPriceHex = await provider.send("eth_gasPrice", []);
  const gasPrice = BigInt(gasPriceHex) * 120n / 100n; // +20% buffer

  // ── Send transaction ───────────────────────────────────────────
  const tx = await contract.anchorEdition(
    EDITION_2.ipfsCID,
    EDITION_2.sha256Hash,
    EDITION_2.note,
    { gasPrice }
  );

  console.log(`\n  TX sent: ${tx.hash}`);
  console.log(`  Waiting for confirmation...`);

  const receipt = await tx.wait();
  console.log(`\n  ✓ Confirmed in block ${receipt.blockNumber}`);
  console.log(`  Gas used: ${receipt.gasUsed.toString()}`);
  console.log(`  Polygonscan: https://polygonscan.com/tx/${tx.hash}`);

  // ── Verify ─────────────────────────────────────────────────────
  const countAfter = await contract.editionCount();
  const latestEdition = await contract.latest();
  console.log(`\n  Editions on-chain: ${countAfter}`);
  console.log(`  Latest CID:  ${latestEdition.ipfsCID}`);
  console.log(`  Latest Hash: ${latestEdition.sha256Hash}`);
  console.log(`  Latest Note: ${latestEdition.note}`);
  console.log(`\n  ✓ Edition 2 anchored on Polygon.\n`);
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
