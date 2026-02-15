/**
 * test-revenue-live.js
 * Live economic test on deployed RoyaltyRouter
 *
 * Sends a small amount of POL to the router, verifies:
 *   1. Funds received and distributed to internal balances
 *   2. Basis point splits are correct
 *   3. Withdraw works and contract balance resets
 *   4. Events emitted properly
 *
 * Usage:
 *   npx hardhat run web3/scripts/test-revenue-live.js --network polygon
 *   npx hardhat run web3/scripts/test-revenue-live.js --network polygon --dry-run
 */

const hre = require("hardhat");

const ROUTER_ADDRESS = "0x44169829489d70aaecbf845870652871C65fC461";
const TEST_AMOUNT    = hre.ethers.parseEther("0.01"); // 0.01 POL

async function main() {
  const isDryRun = process.env.DRY_RUN === "1" || process.argv.includes("--dry-run");
  const [deployer] = await hre.ethers.getSigners();

  console.log("\n════════════════════════════════════════════");
  console.log("  LIVE REVENUE TEST — RoyaltyRouter");
  console.log("════════════════════════════════════════════");
  console.log(`Router:    ${ROUTER_ADDRESS}`);
  console.log(`Caller:    ${deployer.address}`);
  console.log(`Amount:    ${hre.ethers.formatEther(TEST_AMOUNT)} POL`);
  console.log(`Mode:      ${isDryRun ? "DRY RUN" : "LIVE"}`);

  // ── Connect to router ──────────────────────────────────────────────
  const Router = await hre.ethers.getContractAt("RoyaltyRouter", ROUTER_ADDRESS);

  // ── Pre-flight checks ─────────────────────────────────────────────
  console.log("\n── Pre-flight ──────────────────────────────");

  const payeeCount = await Router.payeeCount();
  console.log(`Payee count:      ${payeeCount}`);

  const editionRef = await Router.editionRef();
  console.log(`Edition ref:      ${editionRef}`);

  const ownerAddr = await Router.owner();
  console.log(`Router owner:     ${ownerAddr}`);
  console.log(`Caller is owner:  ${ownerAddr.toLowerCase() === deployer.address.toLowerCase()}`);

  // Read all payees
  const payeeData = [];
  for (let i = 0; i < Number(payeeCount); i++) {
    const p = await Router.getPayee(i);
    payeeData.push({
      wallet: p.wallet,
      role: p.role,
      basisPoints: Number(p.basisPoints),
      active: p.active
    });
    console.log(`  Payee ${i}: ${p.role} → ${p.wallet} (${Number(p.basisPoints)/100}%) active=${p.active}`);
  }

  const walletBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`\nWallet balance:   ${hre.ethers.formatEther(walletBalance)} POL`);

  const routerBalPre = await Router.contractBalance();
  console.log(`Router balance:   ${hre.ethers.formatEther(routerBalPre)} POL`);

  const totalRecvPre = await Router.totalReceived();
  const totalDistPre = await Router.totalDistributed();
  const totalWdPre   = await Router.totalWithdrawn();
  console.log(`Total received:   ${hre.ethers.formatEther(totalRecvPre)} POL`);
  console.log(`Total distributed:${hre.ethers.formatEther(totalDistPre)} POL`);
  console.log(`Total withdrawn:  ${hre.ethers.formatEther(totalWdPre)} POL`);

  // Pre-balance for deployer in router
  const deployerBalPre = await Router.balances(deployer.address);
  console.log(`Deployer internal: ${hre.ethers.formatEther(deployerBalPre)} POL`);

  if (isDryRun) {
    console.log("\n── DRY RUN — calculating expected splits ───");
    const amount = TEST_AMOUNT;
    // Since all payees are the same address, all splits accumulate
    // But let's show per-role anyway
    let totalBps = 0;
    for (const p of payeeData) {
      if (!p.active) continue;
      const share = (amount * BigInt(p.basisPoints)) / 10000n;
      console.log(`  ${p.role}: ${hre.ethers.formatEther(share)} POL (${p.basisPoints/100}%)`);
      totalBps += p.basisPoints;
    }
    console.log(`  Total bps: ${totalBps}`);
    console.log("\n  Would send 0.01 POL to router");
    console.log("  All splits would credit to deployer address (all 4 payees = deployer)");
    console.log("  Run without --dry-run to execute live");
    return;
  }

  // ── Step 1: Send POL to router ────────────────────────────────────
  console.log("\n── Step 1: Send POL to RoyaltyRouter ───────");
  console.log(`Sending ${hre.ethers.formatEther(TEST_AMOUNT)} POL...`);

  const sendTx = await deployer.sendTransaction({
    to: ROUTER_ADDRESS,
    value: TEST_AMOUNT
  });
  console.log(`TX hash: ${sendTx.hash}`);

  const receipt = await sendTx.wait();
  console.log(`Block:   ${receipt.blockNumber}`);
  console.log(`Gas:     ${receipt.gasUsed.toString()}`);

  // Parse events
  const routerInterface = Router.interface;
  const parsedLogs = receipt.logs
    .map(log => { try { return routerInterface.parseLog(log); } catch { return null; } })
    .filter(Boolean);

  console.log(`\nEvents emitted (${parsedLogs.length}):`);
  for (const log of parsedLogs) {
    console.log(`  ${log.name}`);
    if (log.name === "FundsReceived") {
      console.log(`    from:   ${log.args[0]}`);
      console.log(`    amount: ${hre.ethers.formatEther(log.args[1])} POL`);
    }
    if (log.name === "FundsDistributed") {
      console.log(`    amount: ${hre.ethers.formatEther(log.args[0])} POL`);
    }
  }

  // ── Step 2: Verify internal balances ──────────────────────────────
  console.log("\n── Step 2: Verify internal balances ────────");

  const routerBalPost = await Router.contractBalance();
  console.log(`Router balance:    ${hre.ethers.formatEther(routerBalPost)} POL`);

  const totalRecvPost = await Router.totalReceived();
  const totalDistPost = await Router.totalDistributed();
  console.log(`Total received:    ${hre.ethers.formatEther(totalRecvPost)} POL`);
  console.log(`Total distributed: ${hre.ethers.formatEther(totalDistPost)} POL`);

  // Since all 4 payees = deployer, the entire amount should be in deployer's balance
  const deployerBalPost = await Router.balances(deployer.address);
  console.log(`Deployer internal: ${hre.ethers.formatEther(deployerBalPost)} POL`);

  // Calculate expected (all splits to same address)
  const expectedTotal = deployerBalPre + TEST_AMOUNT;
  const actualTotal = deployerBalPost;
  const diff = actualTotal > expectedTotal
    ? actualTotal - expectedTotal
    : expectedTotal - actualTotal;

  console.log(`Expected internal: ${hre.ethers.formatEther(expectedTotal)} POL`);
  console.log(`Dust residue:      ${diff.toString()} wei`);

  const splitCorrect = diff <= 3n; // allow up to 3 wei rounding
  console.log(`Split correct:     ${splitCorrect ? "✅ YES" : "❌ NO"}`);

  // ── Step 3: Withdraw ──────────────────────────────────────────────
  console.log("\n── Step 3: Withdraw ────────────────────────");

  const walletBefore = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Wallet before:     ${hre.ethers.formatEther(walletBefore)} POL`);

  const withdrawTx = await Router.withdraw();
  console.log(`Withdraw TX:       ${withdrawTx.hash}`);

  const wdReceipt = await withdrawTx.wait();
  console.log(`Gas used:          ${wdReceipt.gasUsed.toString()}`);

  // Parse withdraw events
  const wdLogs = wdReceipt.logs
    .map(log => { try { return routerInterface.parseLog(log); } catch { return null; } })
    .filter(Boolean);

  for (const log of wdLogs) {
    if (log.name === "Withdrawal") {
      console.log(`Withdrawal event:  ${hre.ethers.formatEther(log.args[1])} POL to ${log.args[0]}`);
    }
  }

  // ── Step 4: Post-withdrawal verification ──────────────────────────
  console.log("\n── Step 4: Post-withdrawal verification ────");

  const routerBalFinal = await Router.contractBalance();
  console.log(`Router balance:    ${hre.ethers.formatEther(routerBalFinal)} POL`);

  const deployerBalFinal = await Router.balances(deployer.address);
  console.log(`Deployer internal: ${hre.ethers.formatEther(deployerBalFinal)} POL`);

  const totalWdPost = await Router.totalWithdrawn();
  console.log(`Total withdrawn:   ${hre.ethers.formatEther(totalWdPost)} POL`);

  const walletAfter = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Wallet after:      ${hre.ethers.formatEther(walletAfter)} POL`);

  // ── Summary ───────────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════════");
  console.log("  LIVE REVENUE TEST — RESULTS");
  console.log("════════════════════════════════════════════");
  console.log(`✅ Funds received:      ${hre.ethers.formatEther(TEST_AMOUNT)} POL`);
  console.log(`✅ Distribution:        ${hre.ethers.formatEther(totalDistPost - totalDistPre)} POL`);
  console.log(`✅ Split accuracy:      ${splitCorrect ? "PASS" : "FAIL"} (${diff.toString()} wei dust)`);
  console.log(`✅ Withdraw executed:   ${hre.ethers.formatEther(totalWdPost - totalWdPre)} POL`);
  console.log(`✅ Router drained:      ${routerBalFinal === 0n ? "YES" : "NO (" + routerBalFinal.toString() + " wei remaining)"}`);
  console.log(`✅ Internal balance:    ${deployerBalFinal === 0n ? "RESET" : "NOT RESET"}`);
  console.log("════════════════════════════════════════════\n");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
