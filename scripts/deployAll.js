const hre = require("hardhat");

async function main() {
    await hre.run("run", { script: "scripts/ChargingRequestDeploy.js" });
    await hre.run("run", { script: "scripts/EnergyValidationDeploy.js" });
    await hre.run("run", { script: "scripts/EscrowPaymentDeploy.js" });
    await hre.run("run", { script: "scripts/GovernanceAdminDeploy.js" });
    await hre.run("run", { script: "scripts/MatchingContractDeploy.js" });
    await hre.run("run", { script: "scripts/PlateformFeeDeploy.js" });
    await hre.run("run", { script: "scripts/ReputationSystemDeploy.js" });
    await hre.run("run", { script: "scripts/VehicleRegistryDeploy.js" });
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});