// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
interface IChargingRequest{
    enum Status{
    OPEN,
    ACCEPTED,
    COMPLETED,
    CANCELED
 }
 function getRequest(uint256 _requestid) external view returns(
    uint256 id,
    address reciever
    uint256 energyrequired;
    uint256 priceperkilo;
    string location;
    Status status;

 );
   function updateStatus(uint256 _id, Status _status) external;
}
contract EnergyValidation
{
 address public validator;
 IChargingRequest public charging;
 constructor(address _chargingrequest){
    validator=msg.sender;
    charging=IChargingRequest.getRequest(_chargingrequest);
 }
modifier onlyvalidator(){
    require(msg.sender==validator,"only validator is allowed");
}
Struct Session{
    bool start;
    bool completed;
    uint256 energydelivered;
}
mapping(uint256=>session)public _Session;
event chargingstarted(uint256 _requestid);
event chargingcompleted(uint256 _requestid,uint256 energydelivered);
function started(uint256 _requestid) external onlyvalidator{
    (
        ,
      ,
    ,
    ,
    ,
    IChargingRequest.Status.status
    )=charging.getRequest(_requestid);
    require(status==IChargingRequest.Status.ACCEPTED,"only accepted request are allowed");
    _Session[_requestid].start=true;
    emit chargingstarted(_requestid); 
}
function completed(uint256 _requestedid,uint256 _energydelivered) external onlyvalidator
{
   require( _Session[_requestedid].start,"first start the energy");
   require(!_Session[_requestedid].completed,"charging already completed");
}

}

