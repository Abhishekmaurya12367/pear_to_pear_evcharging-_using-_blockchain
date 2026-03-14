const fs = require("fs");

async function main() {

  const [deployer] = await ethers.getSigners();

  console.log("Deploying with account:", deployer.address);

  const feePercent = 2;

  const PlatformFee = await ethers.getContractFactory("PlatformFee");

  const platformFee = await PlatformFee.deploy(feePercent);

  await platformFee.waitForDeployment();

  const platformAddress = await platformFee.getAddress();

  console.log("PlatformFee deployed to:", platformAddress);

  /* -------- Update addresses.json -------- */

  let addresses = {};

  if (fs.existsSync("addresses.json")) {
    addresses = JSON.parse(fs.readFileSync("addresses.json"));
  }

  addresses.PlatformFee = platformAddress;

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