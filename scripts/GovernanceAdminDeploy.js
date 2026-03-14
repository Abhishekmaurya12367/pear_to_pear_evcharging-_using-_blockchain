const fs = require("fs");

async function main() {

  const [deployer] = await ethers.getSigners();

  console.log("Deploying with account:", deployer.address);

  const addresses = JSON.parse(
    fs.readFileSync("addresses.json")
  );

  const platformFeeAddress = addresses.PlatformFee;
  const energyValidationAddress = addresses.EnergyValidation;
  const escrowAddress = addresses.EscrowPayment;

  console.log("PlatformFee:", platformFeeAddress);
  console.log("EnergyValidation:", energyValidationAddress);
  console.log("EscrowPayment:", escrowAddress);

  const GovernanceAdmin = await ethers.getContractFactory("GovernanceAdmin");

  const governance = await GovernanceAdmin.deploy(
      platformFeeAddress,
      energyValidationAddress,
      escrowAddress
  );

  await governance.waitForDeployment();

  const governanceAddress = await governance.getAddress();

  console.log("GovernanceAdmin deployed to:", governanceAddress);

  /* ---- save to addresses.json ---- */

  addresses.GovernanceAdmin = governanceAddress;

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