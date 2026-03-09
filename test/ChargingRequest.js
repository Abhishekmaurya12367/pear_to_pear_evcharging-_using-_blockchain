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
     const Registry = await ethers.getContractFactory("Userregistry");
     registry = await Registry.deploy();
    await registry.waitForDeployment();
    const ChargingRequest=await ethers.getContractFactory("charging_request");
    const registry_address=await registry.getAddress();
    charging_request=await ChargingRequest.deploy(registry_address);
    await charging_request.waitForDeployment();
});
// first it checck that the user is registered successfully or not
it("user should be registered ",async function(){
    await registry.connect(user1).register_user("tesls",500,1);
    const check=await registry.getuser(user1.address);
    expect(check.isRegister).to.equal(true);

});
// admin varified to the user;
it("admin varified to the user",async function(){
    await registry.connect(user1).register_user("tesla",500,1);
    await registry.varifyuser(user1.address);
    const chack_varified= await registry.isvarifieduser(user1.address);
    expect(check_varified).to.equal(true);
});
//only varified user can create request;
it("only variefied user can create request",async function(){
  await registry.connect(user1).register_user("tesla",500,1);
  await registry.varifyuser(user1.address);
  await  charging_request.connect(user1).createrequest(500,10,"delhi");
  const request=await charging_request.getRequest(1);
  expect((request.energyrequired).toString()).to.equal("500");
});
//unvarified user can not creatre request;
it("unvarified user can not create request",async function(){
    await registry.connect(user1). register_user("tesla",500,1);
    await expect(
        chargingRequest.connect(user1).createrequest(
            20,
            5,
            "Delhi"
        )
    ).to.be.revertedWith("only variefied user allowe");
});
// next test user can cancelled it ;
it("request owner can cancelled the request",async function(){

});
})
