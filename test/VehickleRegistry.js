const { expect } = require("chai");
const { ethers } = require("hardhat");
describe("  Userregistry contract", function () {
  let owner;
  let registry;
  let user1;
  let user2;
  beforeEach(async function () {
     [owner, user1, user2] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("Userregistry");
    registry = await Registry.deploy();
    await registry.deployed();
  });
  // first test check for deployment
  it("the contract is deployed or not", async function () {
    expect(registry.target).to.not.equal(0);
  });
  //second test case checking that the contract admin is deployed or not
  it("the contract admin is deployed or not", async function () {
    expect(await registry.admin()).to.equal(owner.address);
  });
  // we  checking that the user is registerd or not if not please registerd
  it("user register successfully or not ", async function () {
    await registry.connect(user1).register_user("tesla", 500, 1);
    const user = await registry.getuser(user1.address);
    expect(user.isRegister).to.equal(true);
  });
  //correct ev model is stored or not please test here
  it("inthis we are testing that the correct model i s stored or not", async function () {
    await registry.connect(user1).register_user("tesla", 500, 1);
    const user = await registry.getuser(user1.address);
    expect(user.evmode).to.equal("tesla");
  });
  // we testing here that the correct role stored or not please check that ;
  it("the given role right or wrong ", async function () {
    await registry.connect(user1).register_user("tesla", 500, 1);
    const user = await registry.getuser(user1.address);
    expect(user.role).to.equal(1);
  });
  //battery capacity stored succesffully or not
  it("the given role right or wrong ", async function () {
    await registry.connect(user1).register_user("tesla", 500, 1);
    const user = await registry.getuser(user1.address);
    expect(user.batterycapacity.toString()).to.equal("500");
  });
  //user is registerd or not
  it("the given role right or wrong ", async function () {
    await registry.connect(user1).register_user("tesla", 500, 1);
    const user = await registry.getuser(user1.address);
    expect(user.isRegister).to.equal(true);
  });
  //initial reputation should be zero
  it("the given role right or wrong ", async function () {
    await registry.connect(user1).register_user("tesla", 500, 1);
    const user = await registry.getuser(user1.address);
    expect(user.reputation.toString()).to.equal("0");
  });
  // emit user registered;
  it(" Should emit UserRegistered event", async function () {
    await expect(
      registry.connect(user1).register_user("tesla", 500, 1),
    ).to.emit(registry, "UserRegistered");
  });
  // now test for other function that is update role;
  it("update role", async function () {
    await registry.connect(user1).register_user("tesla", 500, 1);
    await registry.connect(user1).update_role(2);
    const user = await registry.getuser(user1.address);
    expect(user.role()).to.equal(2);
  });
  //unregistered user can not update
  it(" Unregistered user cannot update role", async function () {
    await expect(registry.connect(user1).update_role(2)).to.be.revertedWith(
      "only registerd student allowed",
    );
  });

  // role cannot be none
  it("Role cannot be NONE", async function () {
    await registry.connect(user1).register_user("tesla", 500, 1);
    await expect(registry.connect(user1).update_role(0)).to.be.revertedWith(
      "invalid role",
    );
  });
  //only admin can verify
  it("only admin can verify ", async function () {
    await registry.connect(user1).register_user("tesla", 500, 1);
    await registry.varifyuser(user1.address);
    const verifirduser = registry.isvarifieduser(user1.address);
    expect(verified).to.equal(true);
  });
  // non admin cannot verify;
  it("only admin can verify ", async function () {
    await registry.connect(user1).register_user("tesla", 500, 1);
    await expect(
      registry.connect(user1).varifyuser(user1.address),
    ).to.be.revertedWith("only admin allowed");
  });
  //Admin canot verify unregistered user
  it("Admin cannot verify unregistered user", async function () {
    await expect(registry.varifyuser(user1.address)).to.be.revertedWith(
      "user not registered",
    );
  });
  //test the blocklist user or not
  it("admin can blocklist the user", async function () {
    await registry.userblocklist(user1.address);
    expect(await registry.blacklisted(user1.address)).to.equal(true);
  });
  // non admin can not blocklist
  it("Non-admin cannot blacklist", async function () {
    await expect(
      registry.connect(user1).userblocklist(user2.address),
    ).to.be.revertedWith("only admin allowed");
  });
  // test getuser
  it(" getuser returns correct wallet", async function () {
    await registry.connect(user1).register_user("Tesla", 500, 1);

    const user = await registry.getuser(user1.address);

    expect(user.wallet).to.equal(user1.address);
  });
  // isvarifieduser
  it(" isvarifieduser returns false initially", async function () {
    await registry.connect(user1).register_user("Tesla", 5000, 1);

    const verified = await registry.isvarifieduser(user1.address);

    expect(verified).to.equal(false);
  });
});
