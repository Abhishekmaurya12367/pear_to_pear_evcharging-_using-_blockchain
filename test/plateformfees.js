const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PlatformFee Contract", function () {

let platformFee;
let owner;
let escrow;
let user;

beforeEach(async function () {

[owner, escrow, user] = await ethers.getSigners();

const PlatformFee = await ethers.getContractFactory("PlatformFee");

platformFee = await PlatformFee.deploy(2);
await platformFee.waitForDeployment();

});

it("should set correct owner and fee percent", async function () {

expect(await platformFee.owner()).to.equal(owner.address);
expect(await platformFee.feePercent()).to.equal(2);

});

it("owner can set escrow contract", async function () {

await platformFee.connect(owner).setEscrowContract(escrow.address);

expect(await platformFee.escrowContract()).to.equal(escrow.address);

});

it("non owner cannot set escrow contract", async function () {

await expect(
platformFee.connect(user).setEscrowContract(escrow.address)
).to.be.revertedWith("Only owner allowed");

});

it("cannot set zero escrow address", async function () {

await expect(
platformFee.connect(owner).setEscrowContract(ethers.ZeroAddress)
).to.be.revertedWith("Invalid address");

});

it("owner can update fee percent", async function () {

await platformFee.connect(owner).updateFeePercent(5);

expect(await platformFee.feePercent()).to.equal(5);

});

it("cannot set fee percent above 10", async function () {

await expect(
platformFee.connect(owner).updateFeePercent(11)
).to.be.revertedWith("Fee too high");

});

it("calculateFee should return correct value", async function () {

const fee = await platformFee.calculateFee(1000);

expect(fee).to.equal(20); // 2%

});

it("only escrow can collect fee", async function () {

await platformFee.connect(owner).setEscrowContract(escrow.address);

await expect(
platformFee.connect(user).collectFee({value:100})
).to.be.revertedWith("Only escrow allowed");

});

it("escrow can send fee", async function () {

await platformFee.connect(owner).setEscrowContract(escrow.address);

await platformFee.connect(escrow).collectFee({value:100});

const balance = await ethers.provider.getBalance(await platformFee.getAddress());

expect(balance).to.equal(100);

});

it("escrow cannot send zero fee", async function () {

await platformFee.connect(owner).setEscrowContract(escrow.address);

await expect(
platformFee.connect(escrow).collectFee({value:0})
).to.be.revertedWith("No fee sent");

});

it("owner can withdraw collected fees", async function () {

await platformFee.connect(owner).setEscrowContract(escrow.address);

await platformFee.connect(escrow).collectFee({value:100});

await expect(
platformFee.connect(owner).withdrawFees()
).to.changeEtherBalance(owner, 100);

});

it("non owner cannot withdraw", async function () {

await expect(
platformFee.connect(user).withdrawFees()
).to.be.revertedWith("Only owner allowed");

});

it("withdraw fails if balance is zero", async function () {

await expect(
platformFee.connect(owner).withdrawFees()
).to.be.revertedWith("No balance");

});

});
