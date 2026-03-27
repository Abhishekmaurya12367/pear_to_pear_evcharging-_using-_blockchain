/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
const ALCHEMY_API_KEY = "Se0ABqTiBuzu42wi-bbKC";
const PRIVATE_KEY = "4fc4999e3221a3a170a181200371cb36fc69f9c27d2e0c3197ec96887be3ddd1";
module.exports = {
  solidity: "0.8.28",
   networks: {
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [PRIVATE_KEY]
    }
  }
};
