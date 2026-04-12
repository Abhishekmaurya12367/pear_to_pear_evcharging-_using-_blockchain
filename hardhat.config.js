/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("dotenv").config();

// Support either naming: SEPOLIA_RPC_URL or RPC_URL (same as backend)
const sepoliaUrl =
  process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || "";
// Deploy key: prefer explicit deployer, else fall back to oracle key if you use one wallet
const deployKey =
  process.env.PRIVATE_KEY ||
  process.env.DEPLOYER_PRIVATE_KEY ||
  process.env.ORACLE_PRIVATE_KEY ||
  "";

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: sepoliaUrl,
      accounts: deployKey ? [deployKey] : [],
    },
  },
};
