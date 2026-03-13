// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IChargingRequest{

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

    function getRequest(uint256 _id) external view returns(Request memory);

    function updatestatus(uint256 _id, Status _status) external;
}

contract EnergyValidation
{
    address public validator;
    IChargingRequest public charging;

    constructor(address _chargingrequest){
        validator = msg.sender;
        charging = IChargingRequest(_chargingrequest);
    }

    modifier onlyvalidator(){
        require(msg.sender == validator,"only validator is allowed");
        _;
    }

    struct Session
    {
        bool start;
        bool completed;
        uint256 energydelivered;
    }

    mapping(uint256 => Session) public _Session;

    event chargingstarted(uint256 _requestid);
    event chargingcompleted(uint256 _requestid,uint256 energydelivered);

    function started(uint256 _requestid) external onlyvalidator{
       IChargingRequest.Request memory req = charging.getRequest(_requestid);

    require(
        req.status == IChargingRequest.Status.ACCEPTED,
        "only accepted request are allowed"
    );

        _Session[_requestid].start = true;

        emit chargingstarted(_requestid); 
    }

    function completed(uint256 _requestedid,uint256 _energydelivered)
    external
    onlyvalidator
{
    require(_Session[_requestedid].start,"first start the energy");
    require(!_Session[_requestedid].completed,"charging already completed");

    _Session[_requestedid].completed = true;
    _Session[_requestedid].energydelivered = _energydelivered;
      charging.updatestatus(
        _requestedid,
        IChargingRequest.Status.COMPLETED
    );

    emit chargingcompleted(_requestedid,_energydelivered);
}

    function iscompleted(uint256 _requestedid) external view returns(bool){
        return _Session[_requestedid].completed;
    }

    function getdeliveredenergy(uint256 _requestedid) external view returns(uint256){
        return _Session[_requestedid].energydelivered;
    }
    function changeValidator(address newValidator)
external
{
    validator = newValidator;
}
}