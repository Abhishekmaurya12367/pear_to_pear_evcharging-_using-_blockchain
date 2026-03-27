const { expect } = require("chai");
// describe("Token contract", function () {
//   it("Deployment should assign to the total supply of token to the owner", async function () {
//     const [owner] = await ethers.getSigners();
//     const Token = await ethers.getContractFactory("Token");
//     const hardhatToken = await Token.deploy();
//     const ownerbalance = await hardhatToken.balance_check(owner.address);
//     expect((await hardhatToken.total_supply()).toString()).to.equal(
//       ownerbalance.toString(),
//     );
//   });

//   it("Transfer function", async function () {
//     const [owner, add1, add2] = await ethers.getSigners();
//     const Token = await ethers.getContractFactory("Token");
//     const hardhatToken = await Token.deploy();
//     await hardhatToken.transfer(add1.address, 10);
//     expect(
//   (await hardhatToken.balance_check(add1.address)).toString()
// ).to.equal("10");

// await hardhatToken.connect(add1).transfer(add2.address, 5);

// expect(
//   (await hardhatToken.balance_check(add2.address)).toString()
// ).to.equal("5");
//   });
// });
