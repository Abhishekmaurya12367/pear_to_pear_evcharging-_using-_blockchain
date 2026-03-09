async function main() {
  const [deployer]=await ethers.getSigners();
  const VehicleRegistry = await ethers.getContractFactory("Userregistry");

  const registry = await VehicleRegistry.deploy();

  await registry.waitForDeployment();

  console.log("Contract deployed to:", await registry.getAddress());

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});