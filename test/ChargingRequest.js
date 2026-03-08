const { expect } = require("chai");
const { ethers } = require("hardhat");
describe("charging_request contract",async function(){
    let registry;
    let charging_request;
    let owner;
    let user1;
    let user2;
beforeEach(async function(){
    [owner,user1,user2]=await ethers.getSigners();
    const Mockregistry=await ethers.getContractFactory('Mockregistry');
    registry=await Mockregistry.deploy();
    await registry.waitForDeployment();
    const ChargingRequest=await ethers.getContractFactory('charging_request');
    chargingrequest=await ChargingRequest.deploy(await registry.getAddress());
 
});
// first test
it("")
})
