const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // ── Load deployment receipt ────────────────────────────────────
  const receiptPath = path.join(__dirname, "..", "metadata", "deployment-receipt.json");

  if (!fs.existsSync(receiptPath)) {
    console.error("  ✗ No deployment-receipt.json found. Deploy first.");
    process.exit(1);
  }

  const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));

  console.log("\n══════════════════════════════════════════════════");
  console.log("  POLYGONSCAN VERIFICATION");
  console.log("══════════════════════════════════════════════════\n");
  console.log(`  Contract: ${receipt.contract}`);
  console.log(`  Network:  ${receipt.network}`);
  console.log(`  Args:     ${JSON.stringify(receipt.constructorArgs)}\n`);

  await hre.run("verify:verify", {
    address: receipt.contract,
    constructorArguments: receipt.constructorArgs,
  });

  console.log("\n  ✓ Contract verified on Polygonscan!\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
