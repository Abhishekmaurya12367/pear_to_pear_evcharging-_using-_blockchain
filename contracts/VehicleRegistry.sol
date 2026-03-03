// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Userregistry{
    address public admin;
    constructor()
    {
     admin=msg.sender;
    }
    enum Role{
        NONE,
        DONOR,
        RECEIVER,
        BOTH
   }
   struct User
   {
   address wallet;
   string evmode;
   uint256 batterycapacity;
   bool isRegister;
   bool isvarified;
   Role role;
  uint256 reputation;
   }
   mapping(address=>User)private user;
   mapping(address=>bool)public blacklisted;
   modifier onlyadmin(){
    require(msg.sender==admin,"only admin allowed");
    _;
   }
  modifier onlyregistered(){
    require(user[msg.sender].isRegister,"only registerd student allowed");
    _;
  }
  modifier notblocklisted(){
    require(!blacklisted[msg.sender],"user is blocklisted");
    _;
  }
    event UserRegistered(address indexed user);
    event UserVerified(address indexed user);
    event RoleUpdated(address indexed user, Role role);
    event UserBlacklisted(address indexed user);
    function register_user(string memory model_ev,uint256 _battarycapacity,Role _role)external notblocklisted {
        require(!user[msg.sender].isRegister,"user already registerd");
        require(_role!=Role. NONE,"invalid role");
        user[msg.sender]=User({
            wallet:msg.sender,
            evmode:model_ev,
            batterycapacity:_battarycapacity,
            isRegister:true,
            isvarified:false,
            role:_role,
            reputation:0
        });
        emit UserRegistered(msg.sender);

    }
    //updaterole
    function update_role(Role _role)external onlyregistered{
        require(_role!=Role.NONE,"invalid role");
        user[msg.sender].role=_role;
        emit RoleUpdated(msg.sender,_role);
    }
    // adimin
    function varifyuser( address _user) external onlyadmin{
        require(user[_user].isRegister,"user not registered");
        user[_user].isvarified = true;
        emit UserVerified(_user);
    }
  function userblocklist(address _user) external onlyadmin{
    blacklisted[_user]=true;
    emit UserBlacklisted(_user);
  }
  function getuser(address _user) external view returns(User memory){
    return user[_user];

  }
  function isvarifieduser(address _user) external  view returns(bool){
    return user[_user].isvarified;
  }
}
