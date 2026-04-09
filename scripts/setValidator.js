const { ethers } = require("hardhat");

// Update these if you need different targets
const ENERGY_VALIDATION_ADDRESS = process.env.VALIDATION_ADDRESS || "0x7FA02bcFd9A9FeeAf8E8D002c241870c6a20E65b";
const BACKEND_ORACLE_WALLET    = process.env.BACKEND_WALLET || "0x7Ae80a1D3a5747Da7533C61747Fd59f9d57F8861";

async function main() {
  const [deployer] = await ethers.getSigners(); // must be current validator
  const EnergyValidation = await ethers.getContractAt("EnergyValidation", ENERGY_VALIDATION_ADDRESS);

  console.log("Current validator:", await EnergyValidation.validator());
  console.log("Deployer (signer):", deployer.address);
  console.log("New validator     :", BACKEND_ORACLE_WALLET);

  const tx = await EnergyValidation.changeValidator(BACKEND_ORACLE_WALLET);
  console.log("Sent tx:", tx.hash);
  await tx.wait();

  console.log("Updated validator:", await EnergyValidation.validator());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
