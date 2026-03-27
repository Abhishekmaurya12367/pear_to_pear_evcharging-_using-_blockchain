const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MatchingContract", function () {

let registry;
let charging_request;
let matching;

let owner;
let donor;
let receiver;
let other;

beforeEach(async function(){

[owner, donor, receiver, other] = await ethers.getSigners();

const Registry = await ethers.getContractFactory("Userregistry");
registry = await Registry.deploy();
await registry.waitForDeployment();

const ChargingRequest = await ethers.getContractFactory("charging_request");
charging_request = await ChargingRequest.deploy(await registry.getAddress());
await charging_request.waitForDeployment();

const Matching = await ethers.getContractFactory("MatchingContract");

matching = await Matching.deploy(
await registry.getAddress(),
await charging_request.getAddress()
);

await matching.waitForDeployment();

});


// user registration
it("users should be registered", async function(){

await registry.connect(donor).register_user("tesla",500,1);
await registry.connect(receiver).register_user("nissan",400,2);

const donorData = await registry.getuser(donor.address);
const receiverData = await registry.getuser(receiver.address);

expect(donorData.isRegister).to.equal(true);
expect(receiverData.isRegister).to.equal(true);

});


// admin verifies users
it("admin should verify users", async function(){

await registry.connect(donor).register_user("tesla",500,1);
await registry.connect(receiver).register_user("nissan",400,2);

await registry.varifyuser(donor.address);
await registry.varifyuser(receiver.address);

expect(await registry.isvarifieduser(donor.address)).to.equal(true);
expect(await registry.isvarifieduser(receiver.address)).to.equal(true);

});


// receiver creates request
it("receiver should create request", async function(){

await registry.connect(receiver).register_user("tesla",500,2);
await registry.varifyuser(receiver.address);

await charging_request.connect(receiver).createrequest(200,10,"Delhi");

const request = await charging_request.getRequest(1);

expect(request.energyrequired.toString()).to.equal("200");

});


// donor accepts request
it("verified donor should accept request", async function(){

await registry.connect(receiver).register_user("tesla",500,2);
await registry.connect(donor).register_user("tesla",500,1);

await registry.varifyuser(receiver.address);
await registry.varifyuser(donor.address);

await charging_request.connect(receiver).createrequest(200,10,"Delhi");

await matching.connect(donor).acceptrequest(1);

const match = await matching.getMatch(1);

expect(match.requestid).to.equal(1);
expect(match.donor).to.equal(donor.address);
expect(match.reciever).to.equal(receiver.address);
expect(match.active).to.equal(true);

});


// unverified donor cannot accept request
it("unverified donor cannot accept request", async function(){

await registry.connect(receiver).register_user("tesla",500,2);
await registry.varifyuser(receiver.address);

await charging_request.connect(receiver).createrequest(200,10,"Delhi");

await expect(
matching.connect(donor).acceptrequest(1)
).to.be.revertedWith("only varified donor allowed");

});


// request must exist
it("cannot accept non existing request", async function(){

await registry.connect(donor).register_user("tesla",500,1);
await registry.varifyuser(donor.address);

await expect(
matching.connect(donor).acceptrequest(1)
).to.be.revertedWith("request is not found");

});


// request must be OPEN
it("cannot accept cancelled request", async function(){

await registry.connect(receiver).register_user("tesla",500,2);
await registry.connect(donor).register_user("tesla",500,1);

await registry.varifyuser(receiver.address);
await registry.varifyuser(donor.address);

await charging_request.connect(receiver).createrequest(200,10,"Delhi");

await charging_request.connect(receiver).canceled_request(1);

await expect(
matching.connect(donor).acceptrequest(1)
).to.be.revertedWith("request is not open");

});


// event emission
it("should emit acceptedrequest event", async function(){

await registry.connect(receiver).register_user("tesla",500,2);
await registry.connect(donor).register_user("tesla",500,1);

await registry.varifyuser(receiver.address);
await registry.varifyuser(donor.address);

await charging_request.connect(receiver).createrequest(200,10,"Delhi");

await expect(
matching.connect(donor).acceptrequest(1)
).to.emit(matching,"acceptedrequest");

});

});