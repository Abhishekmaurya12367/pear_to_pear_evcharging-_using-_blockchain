const fs = require("fs");

async function main() {

  const [deployer] = await ethers.getSigners();

  console.log("Deploying with account:", deployer.address);

  const addresses = JSON.parse(
    fs.readFileSync("addresses.json")
  );

  const chargingAddress = addresses.ChargingRequest;
  const matchingAddress = addresses.MatchingContract;
  const platformAddress = addresses.PlatformFee;

  console.log("ChargingRequest:", chargingAddress);
  console.log("MatchingContract:", matchingAddress);
  console.log("PlatformFee:", platformAddress);

  const EscrowPayment = await ethers.getContractFactory("EscrowPayment");

  const escrow = await EscrowPayment.deploy(
      chargingAddress,
      matchingAddress,
      platformAddress
  );

  await escrow.waitForDeployment();

  const escrowAddress = await escrow.getAddress();

  console.log("EscrowPayment deployed to:", escrowAddress);
  addresses.EscrowPayment = escrowAddress;

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