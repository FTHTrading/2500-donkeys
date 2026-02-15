const hre = require("hardhat");
async function main() {
  const [s] = await hre.ethers.getSigners();
  const b = await hre.ethers.provider.getBalance(s.address);
  console.log("Balance:", hre.ethers.formatEther(b), "POL");
  const fp = await hre.ethers.provider.getFeeData();
  console.log("Gas price:", hre.ethers.formatUnits(fp.gasPrice, "gwei"), "gwei");
  const nonce = await hre.ethers.provider.getTransactionCount(s.address, "latest");
  const pending = await hre.ethers.provider.getTransactionCount(s.address, "pending");
  console.log("Nonce (confirmed):", nonce);
  console.log("Nonce (pending):", pending);
}
main().catch(console.error);
