const{expect}=require("chai");
const{ethers}=require("ethers");
describe("vecleregster contract" ,function(){
    let owner;
    let registry;
    let owner1;
    let owner2;
    beforeEach(async function(){
        const[owner,user1,user2]=await ethers.getSigner();
        const Registry=await ethers.getContractFactory('Userregistry');
        registry=await Registry.deploy();
        await registry.waitForDeployment;
    });
// first test check for deployment 
it("the contract is deployed or not",async function(){
    expect(registry.target).to.not.equal(0);
})
//second test case checking that the contract admin is deployed or not 
it("the contract admin is deployed or not",async function(){
    expect(registry.admin()).to.equal(owner.address);
})
it("")

})
