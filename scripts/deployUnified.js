const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // --- Deploy User Registry ---
  const Userregistry = await hre.ethers.getContractFactory("Userregistry");
  const user = await Userregistry.deploy();
  await user.waitForDeployment();
  const userAddr = await user.getAddress();
  console.log("Userregistry:", userAddr);

  // --- Deploy unified escrow ---
  const validator = process.env.VALIDATOR_ADDRESS || deployer.address;
  const feeReceiver = process.env.FEE_RECEIVER || deployer.address;
  const feeBps = BigInt(process.env.FEE_BPS || "200"); // 2% default

  const EVChargingEscrow = await hre.ethers.getContractFactory("EVChargingEscrow");
  const escrow = await EVChargingEscrow.deploy(userAddr, validator, feeReceiver, feeBps);
  await escrow.waitForDeployment();
  const escrowAddr = await escrow.getAddress();
  console.log("EVChargingEscrow:", escrowAddr);

  const addresses = {
    UserRegistry: userAddr,
    EVChargingEscrow: escrowAddr,
    Validator: validator,
    FeeReceiver: feeReceiver,
  };

  // root Addresses.json (existing file is tracked)
  const rootAddressesPath = path.join(__dirname, "..", "Addresses.json");
  fs.writeFileSync(rootAddressesPath, JSON.stringify(addresses, null, 2));

  // frontend Addresses.json
  const feAddressesPath = path.join(__dirname, "..", "frontend", "Addresses.json");
  fs.writeFileSync(feAddressesPath, JSON.stringify(addresses, null, 2));

  console.log("Wrote addresses to:", rootAddressesPath);
  console.log("Wrote addresses to:", feAddressesPath);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

