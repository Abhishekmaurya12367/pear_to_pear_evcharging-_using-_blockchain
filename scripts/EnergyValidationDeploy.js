const fs = require("fs");

async function main() {

  const [deployer] = await ethers.getSigners();

  console.log("Deploying with account:", deployer.address);
  const addresses = JSON.parse(
    fs.readFileSync("addresses.json")
  );

  const chargingAddress = addresses.ChargingRequest;

  console.log("ChargingRequest:", chargingAddress);

  const EnergyValidation = await ethers.getContractFactory("EnergyValidation");

  const energy = await EnergyValidation.deploy(
      chargingAddress
  );

  await energy.waitForDeployment();

  const energyAddress = await energy.getAddress();

  console.log("EnergyValidation deployed to:", energyAddress);

  /* Save address to JSON */

  addresses.EnergyValidation = energyAddress;

  fs.writeFileSync(
    "addresses.json",
    JSON.stringify(addresses, null, 2)
  );

  console.log("addresses.json updated");

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});