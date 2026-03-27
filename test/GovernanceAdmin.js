const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GovernanceAdmin Contract", function () {

let governance;
let platformFee;
let energyValidation;
let escrow;

let owner;
let user;
let newOwner;
let newValidator;

beforeEach(async function () {

[owner, user, newOwner, newValidator] = await ethers.getSigners();

/* Deploy PlatformFee */
const PlatformFee = await ethers.getContractFactory("PlatformFee");
platformFee = await PlatformFee.deploy(2);
await platformFee.waitForDeployment();

/* Deploy EnergyValidation */
const EnergyValidation = await ethers.getContractFactory("EnergyValidation");
energyValidation = await EnergyValidation.deploy(owner.address);
await energyValidation.waitForDeployment();

/* Deploy EscrowPayment */
const EscrowPayment = await ethers.getContractFactory("EscrowPayment");
escrow = await EscrowPayment.deploy(owner.address, owner.address);
await escrow.waitForDeployment();

/* Deploy GovernanceAdmin */
const GovernanceAdmin = await ethers.getContractFactory("GovernanceAdmin");

governance = await GovernanceAdmin.deploy(
await platformFee.getAddress(),
await energyValidation.getAddress(),
await escrow.getAddress()
);

await governance.waitForDeployment();

/* IMPORTANT: Transfer PlatformFee ownership to GovernanceAdmin */
await platformFee.transferOwnership(await governance.getAddress());

});

it("should set correct owner", async function () {

expect(await governance.owner()).to.equal(owner.address);

});

it("owner can transfer ownership", async function () {

await governance.transferOwnership(newOwner.address);

expect(await governance.owner()).to.equal(newOwner.address);

});

it("non owner cannot transfer ownership", async function () {

await expect(
governance.connect(user).transferOwnership(user.address)
).to.be.revertedWith("Only owner allowed");

});

it("owner can pause system", async function () {

await governance.setSystemPause(true);

expect(await governance.systemPaused()).to.equal(true);

});

it("owner can unpause system", async function () {

await governance.setSystemPause(true);
await governance.setSystemPause(false);

expect(await governance.systemPaused()).to.equal(false);

});

it("non owner cannot pause system", async function () {

await expect(
governance.connect(user).setSystemPause(true)
).to.be.revertedWith("Only owner allowed");

});

it("owner can update platform fee", async function () {

await governance.updatePlatformFee(5);

expect(await platformFee.feePercent()).to.equal(5);

});

it("non owner cannot update platform fee", async function () {

await expect(
governance.connect(user).updatePlatformFee(4)
).to.be.revertedWith("Only owner allowed");

});

it("owner can change validator", async function () {

await governance.changeValidator(newValidator.address);

expect(await energyValidation.validator()).to.equal(newValidator.address);

});

it("non owner cannot change validator", async function () {

await expect(
governance.connect(user).changeValidator(user.address)
).to.be.revertedWith("Only owner allowed");

});

});
