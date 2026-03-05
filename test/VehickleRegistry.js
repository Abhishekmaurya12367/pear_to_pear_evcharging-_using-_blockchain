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
// we  checking that the user is registerd or not if not please registerd
it("user register successfully or not " ,async function(){
    await registry.connect(user1). register_user("tesla",500,1);
    const user=await registry.getuser(user1.address);
    expect(user.isRegister()).to.equal(true);

});
//correct ev model is stored or not please test here 
it("inthis we are testing that the correct model i s stored or not",async function(){

});

})
