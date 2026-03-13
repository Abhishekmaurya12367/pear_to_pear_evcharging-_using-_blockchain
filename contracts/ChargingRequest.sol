// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
interface IUserregistry{
    function isvarifieduser(address _user)external view returns(bool);
}
contract charging_request
{
 IUserregistry public registry;
 address public validator;
 constructor(address _registry,address _validator ){
    registry=IUserregistry(_registry);
    validator = _validator;
 }
 enum Status{
    OPEN,
    ACCEPTED,
    COMPLETED,
    CANCELED
 }
 struct Request{
    uint256 id;
    address reciever;
    uint256 energyrequired;
    uint256 priceperkilo;
    string location;
    Status status;
 }
 mapping(uint256=>Request)public request;
 uint256 public requestCount;

event RequestCreated(uint256 indexed requestId, address indexed receiver); 
event requestcancelled(uint256 indexed request_id);
modifier onlyValidatorOrUser() {
    require(
        registry.isvarifieduser(msg.sender) || msg.sender == validator,
        "not allowed"
    );
    _;
}
 modifier onlyvariefieduser(){
    require(registry.isvarifieduser(msg.sender),"only variefied user allowe");
    _;
 }

function createrequest(uint256 energy_required,uint256 priceofenergyperkph,string memory _location)external onlyvariefieduser
{
require(energy_required>0,"please insert valid energy_require");
require(priceofenergyperkph>0,"please enter the valid energy");

requestCount++;
request[requestCount]=Request({
    id:requestCount,
    reciever:msg.sender,
    energyrequired:energy_required,
    priceperkilo:priceofenergyperkph,
    location:_location,
    status:Status.OPEN
  
});
emit RequestCreated(requestCount,msg.sender);
}

function canceled_request(uint256 _requisted_id) external{
    Request storage req=request[_requisted_id];
    require(req.reciever==msg.sender,"not request owner");
    require(req.status==Status.OPEN,"not possible to cancelled");
    req.status=Status.CANCELED;
    emit requestcancelled(_requisted_id);
}
function getRequest(uint256 _id)external view returns(Request memory)
{
 return request[_id];
}
function updatestatus(uint256 _id, Status _status) external onlyValidatorOrUser {
    require(_id > 0 && _id <= requestCount, "Invalid request id");

    Request storage req = request[_id];
    require(req.status != Status.CANCELED, "Request already canceled");

    req.status = _status;
}
}