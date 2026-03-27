const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EscrowPayment Contract", function () {

let registry;
let charging;
let matching;
let energy;
let escrow;
let platformFee;

let owner;
let receiver;
let donor;

const ACCEPTED = 1;
const COMPLETED = 2;

beforeEach(async function () {

[owner, receiver, donor] = await ethers.getSigners();

/* Deploy UserRegistry */
const Registry = await ethers.getContractFactory("Userregistry");
registry = await Registry.deploy();
await registry.waitForDeployment();

/* Deploy ChargingRequest */
const ChargingRequest = await ethers.getContractFactory("charging_request");
charging = await ChargingRequest.deploy(
await registry.getAddress(),
owner.address
);
await charging.waitForDeployment();

/* Deploy EnergyValidation */
const EnergyValidation = await ethers.getContractFactory("EnergyValidation");
energy = await EnergyValidation.deploy(await charging.getAddress());
await energy.waitForDeployment();

/* Deploy MatchingContract */
const Matching = await ethers.getContractFactory("MatchingContract");
matching = await Matching.deploy(
await registry.getAddress(),
await charging.getAddress()
);
await matching.waitForDeployment();

/* Deploy PlatformFee */
const PlatformFee = await ethers.getContractFactory("PlatformFee");
platformFee = await PlatformFee.deploy(2); // 2% fee
await platformFee.waitForDeployment();

/* Deploy EscrowPayment */
const Escrow = await ethers.getContractFactory("EscrowPayment");
escrow = await Escrow.deploy(
await charging.getAddress(),
await matching.getAddress(),
await platformFee.getAddress()
);
await escrow.waitForDeployment();

/* Connect Escrow with PlatformFee */
await platformFee.setEscrowContract(await escrow.getAddress());

/* Register users */
await registry.connect(receiver).register_user("Tesla",500,1);
await registry.connect(donor).register_user("Nissan",400,1);

/* Verify users */
await registry.varifyuser(receiver.address);
await registry.varifyuser(donor.address);

});

it("receiver can deposit payment", async function () {

await charging.connect(receiver).createrequest(100,2,"Delhi");

/* donor accepts request */
await matching.connect(donor).acceptrequest(1);

/* update status accepted */
await charging.connect(receiver).updatestatus(1,ACCEPTED);

/* deposit */
await escrow.connect(receiver).deposite(1,{value:200});

const balance = await escrow.Escrowbalance(1);

expect(balance).to.equal(200);

});

it("cannot deposit with incorrect amount", async function () {

await charging.connect(receiver).createrequest(100,2,"Delhi");
await matching.connect(donor).acceptrequest(1);
await charging.connect(receiver).updatestatus(1,ACCEPTED);

await expect(
escrow.connect(receiver).deposite(1,{value:100})
).to.be.revertedWith("incorrect payment amount");

});

it("admin can release payment after charging completed", async function () {

await charging.connect(receiver).createrequest(100,2,"Delhi");
await matching.connect(donor).acceptrequest(1);
await charging.connect(receiver).updatestatus(1,ACCEPTED);

await escrow.connect(receiver).deposite(1,{value:200});

/* start charging */
await energy.connect(owner).started(1);

/* complete charging */
await energy.connect(owner).completed(1,100);

/* update request status */
await charging.connect(owner).updatestatus(1,COMPLETED);

/* release payment */
await escrow.connect(owner).paymentrelease(1);

const balance = await escrow.Escrowbalance(1);

expect(balance).to.equal(0);

});

it("cannot release payment if charging not completed", async function () {

await charging.connect(receiver).createrequest(100,2,"Delhi");
await matching.connect(donor).acceptrequest(1);
await charging.connect(receiver).updatestatus(1,ACCEPTED);

await escrow.connect(receiver).deposite(1,{value:200});

await expect(
escrow.connect(owner).paymentrelease(1)
).to.be.revertedWith("charging not completed");

});

it("admin can refund payment", async function () {

await charging.connect(receiver).createrequest(100,2,"Delhi");
await matching.connect(donor).acceptrequest(1);
await charging.connect(receiver).updatestatus(1,ACCEPTED);

await escrow.connect(receiver).deposite(1,{value:200});

await escrow.connect(owner).refund(1);

const balance = await escrow.Escrowbalance(1);

expect(balance).to.equal(0);

});

it("platform fee should be deducted and sent to PlatformFee contract", async function () {

await charging.connect(receiver).createrequest(100,2,"Delhi");

/* donor accepts request */
await matching.connect(donor).acceptrequest(1);

/* update status accepted */
await charging.connect(receiver).updatestatus(1,ACCEPTED);

/* deposit */
await escrow.connect(receiver).deposite(1,{value:200});

/* start charging */
await energy.connect(owner).started(1);

/* complete charging */
await energy.connect(owner).completed(1,100);

/* update status */
await charging.connect(owner).updatestatus(1,COMPLETED);

/* release payment */
await escrow.connect(owner).paymentrelease(1);

/* platform fee = 2% of 200 = 4 */
const platformBalance = await ethers.provider.getBalance(
await platformFee.getAddress()
);

expect(platformBalance).to.equal(4);

});

});