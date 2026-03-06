// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;
// interface IuserRegistry{
//     function isvarifieduser(address _user)external view returns(bool);
// }
// contract charging_request
// {
//  IuserRegistry public registry;
//  constructor(address _registry){
//     registry=IuserRegistry(_registry);
//  }
//  enum Status{
//     OPEN,
//     ACCEPTED,
//     COMPLETED,
//     CANCELED
//  }
//  struct Request{
//     uint256 id;
//     address reciever;
//     uint256 energyrequired;
//     uint256 priceperkilo;
//     string location;
//     Status status;
//  }
//  mapping(uint256=>Request)public request;
//  uint256 public requestCount;

//  event requestcreated(uint256 index request_id,address index _reciever);
//  event requestcancelled(uint256 index request_id);
//  modifier onlyvariefieduser(){
//     require(registry.isvarified(msg.sender),"only variefied user allowe");
//     _;
//  }

// function createrequest(uint256 energy_required,uint256 priceofenergyperkph,string memory _location)external onlyvariefieduser
// {
// require(energy_required>0,"please insert valid energy_require");
// require(priceofenergyperkph>0,"please enter the valid energy");

// requestcount++;
// request[requestcount]=Request({
//     id:requestcount,
//     reciever:msg.sender,
//     energyrequired:energy_required,
//     priceperkilo:priceofenergyperkph,
//     location:_location,
//     status:Status.OPEN,
  
// });
// emit requestcreated(requestcount,msg.sender);
// }
// fumction canceled_request(uint256 _requisted_id) external{
//     Request storage req=request[_requisted_id];
//     require(req.reciever==msg.sender,"not request owner");
//     require(req.status==Status.OPEN,"not possible to cancelled");
//     req.status=Status.CANCELED;
//     emit requestcancelled(_requisted_id)
// }
// function getRequest(uint256 _id)external view returns(Request memory)
// {
//  return request[_id];
// }
// }