const fs = require("fs");

async function main() {

  const UserRegistry = await ethers.getContractFactory("Userregistry");
  const registry = await UserRegistry.deploy();

  await registry.waitForDeployment();

  const registryAddress = await registry.getAddress();

  console.log("UserRegistry deployed:", registryAddress);
  let addresses = {};
  if (fs.existsSync("addresses.json")) {
    addresses = JSON.parse(fs.readFileSync("addresses.json"));
  }


  addresses.UserRegistry = registryAddress;

  fs.writeFileSync("addresses.json", JSON.stringify(addresses, null, 2));
}

main().catch(console.error);