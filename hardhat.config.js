require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  paths: {
    sources: "./web3/contracts",
    tests: "./web3/test",
    cache: "./web3/cache",
    artifacts: "./web3/artifacts",
  },

  networks: {
    // Local dev (Hardhat node)
    hardhat: {},

    // Polygon Mainnet
    polygon: {
      url: process.env.POLYGON_RPC || "https://polygon-bor-rpc.publicnode.com",
      chainId: 137,
      accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [],
      gas: 2000000,           // 2M gas limit (contract needs ~800k)
      gasPrice: 50000000000,  // 50 gwei
    },

    // Polygon Amoy Testnet (for dry-run before mainnet)
    amoy: {
      url: process.env.AMOY_RPC || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [],
      gasPrice: "auto",
    },
  },

  etherscan: {
    apiKey: {
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
    },
  },
};
