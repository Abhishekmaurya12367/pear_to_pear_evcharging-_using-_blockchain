const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deployed = JSON.parse(fs.readFileSync(
    path.join(__dirname, "../Addresses.json"), "utf8"
  ));

  const evArtifact = JSON.parse(fs.readFileSync(
    path.join(__dirname, "../artifacts/contracts/EnergyValidation.sol/EnergyValidation.json"), "utf8"
  ));
  const escrowArtifact = JSON.parse(fs.readFileSync(
    path.join(__dirname, "../artifacts/contracts/EscrowPayment.sol/EscrowPayment.json"), "utf8"
  ));

  const [signer] = await ethers.getSigners();

  const ev     = new ethers.Contract(deployed.EnergyValidation, evArtifact.abi, signer);
  const escrow = new ethers.Contract(deployed.EscrowPayment, escrowArtifact.abi, signer);

  console.log("======= ADDRESS MATCH CHECK =======\n");

  // EnergyValidation checks
  const evCharging = await ev.charging();
  const evEscrow   = await ev.escrow();
  const evValidator = await ev.validator();

  console.log("--- EnergyValidation ---");
  console.log(`charging()  : ${evCharging}`);
  console.log(`expected    : ${deployed.ChargingRequest}`);
  console.log(`match? ${evCharging.toLowerCase() === deployed.ChargingRequest.toLowerCase() ? "✅" : "❌"}\n`);

  console.log(`escrow()    : ${evEscrow}`);
  console.log(`expected    : ${deployed.EscrowPayment}`);
  console.log(`match? ${evEscrow.toLowerCase() === deployed.EscrowPayment.toLowerCase() ? "✅" : "❌"}\n`);

  console.log(`validator() : ${evValidator}`);
  console.log(`your wallet : ${signer.address}`);
  console.log(`match? ${evValidator.toLowerCase() === signer.address.toLowerCase() ? "✅" : "❌"}\n`);

  // EscrowPayment checks
  const escrowCharging   = await escrow.charging();
  const escrowValidator  = await escrow.validatorContract();

  console.log("--- EscrowPayment ---");
  console.log(`charging()         : ${escrowCharging}`);
  console.log(`expected           : ${deployed.ChargingRequest}`);
  console.log(`match? ${escrowCharging.toLowerCase() === deployed.ChargingRequest.toLowerCase() ? "✅" : "❌"}\n`);

  console.log(`validatorContract(): ${escrowValidator}`);
  console.log(`expected           : ${deployed.EnergyValidation}`);
  console.log(`match? ${escrowValidator.toLowerCase() === deployed.EnergyValidation.toLowerCase() ? "✅" : "❌"}\n`);

  console.log("===================================");
}

main().catch(console.error);