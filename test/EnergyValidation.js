const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EnergyValidation Contract", function () {

let registry;
let charging;
let energyValidation;

let owner;
let user1;

const ACCEPTED = 1;

beforeEach(async function () {

[owner, user1] = await ethers.getSigners();

const Registry = await ethers.getContractFactory("Userregistry");
registry = await Registry.deploy();
await registry.waitForDeployment();

/* deploy charging_request with validator = owner */
const ChargingRequest = await ethers.getContractFactory("charging_request");
charging = await ChargingRequest.deploy(
await registry.getAddress(),
owner.address
);
await charging.waitForDeployment();

/* deploy EnergyValidation */
const EnergyValidation = await ethers.getContractFactory("EnergyValidation");
energyValidation = await EnergyValidation.deploy(await charging.getAddress());
await energyValidation.waitForDeployment();

/* register owner */
await registry.connect(owner).register_user("tesla",500,1);

/* verify owner */
await registry.varifyuser(owner.address);

});

it("should set deployer as validator", async function () {

const validator = await energyValidation.validator();
expect(validator).to.equal(owner.address);

});

it("validator can start charging session", async function () {

await charging.connect(owner).createrequest(200,10,"Delhi");
await charging.connect(owner).updatestatus(1,ACCEPTED);

await energyValidation.connect(owner).started(1);

const session = await energyValidation._Session(1);
expect(session.start).to.equal(true);

});

it("validator can complete charging", async function () {

await charging.connect(owner).createrequest(200,10,"Delhi");
await charging.connect(owner).updatestatus(1,ACCEPTED);

await energyValidation.connect(owner).started(1);
await energyValidation.connect(owner).completed(1,180);

const delivered = await energyValidation.getdeliveredenergy(1);
expect(delivered.toString()).to.equal("180");

});

it("cannot complete charging without starting", async function () {

await charging.connect(owner).createrequest(200,10,"Delhi");
await charging.connect(owner).updatestatus(1,ACCEPTED);

await expect(
energyValidation.connect(owner).completed(1,100)
).to.be.revertedWith("first start the energy");

});

it("cannot complete charging twice", async function () {

await charging.connect(owner).createrequest(200,10,"Delhi");
await charging.connect(owner).updatestatus(1,ACCEPTED);

await energyValidation.connect(owner).started(1);
await energyValidation.connect(owner).completed(1,150);

await expect(
energyValidation.connect(owner).completed(1,150)
).to.be.revertedWith("charging already completed");

});

it("should return true if charging completed", async function () {

await charging.connect(owner).createrequest(200,10,"Delhi");
await charging.connect(owner).updatestatus(1,ACCEPTED);

await energyValidation.connect(owner).started(1);
await energyValidation.connect(owner).completed(1,170);

const result = await energyValidation.iscompleted(1);
expect(result).to.equal(true);

});

});
