const fs = require("fs");
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying with account:", deployer.address);
  const addresses = JSON.parse(fs.readFileSync("addresses.json"));

  const registryAddress = addresses.UserRegistry;
  const chargingAddress = addresses.ChargingRequest;

  const MatchingContract = await ethers.getContractFactory("MatchingContract");

  const matching = await MatchingContract.deploy(
      registryAddress,
      chargingAddress
  );
  await matching.waitForDeployment();

  const matchingAddress = await matching.getAddress();

  console.log("MatchingContract deployed to:", matchingAddress);
  addresses.MatchingContract = matchingAddress;

  fs.writeFileSync("addresses.json", JSON.stringify(addresses, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});