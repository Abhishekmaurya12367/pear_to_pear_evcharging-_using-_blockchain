const fs = require("fs");

async function main() {

  const addresses = JSON.parse(fs.readFileSync("addresses.json"));

  const registryAddress = addresses.UserRegistry;

  const [deployer] = await ethers.getSigners();

  const ChargingRequest = await ethers.getContractFactory("charging_request");

  const chargingRequest = await ChargingRequest.deploy(
      registryAddress,
      deployer.address
  );

  await chargingRequest.waitForDeployment();

  const chargingAddress = await chargingRequest.getAddress();

  console.log("ChargingRequest deployed:", chargingAddress);

  addresses.ChargingRequest = chargingAddress;

  fs.writeFileSync("addresses.json", JSON.stringify(addresses, null, 2));
}

main().catch(console.error);