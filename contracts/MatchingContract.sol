// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IuserRegistry{
    function isvarifieduser(address _user) external view returns(bool);
}

interface Ichargingrequest{

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
}

contract MatchingContract{

    IuserRegistry public registry;
    Ichargingrequest public chargingcontract;

    constructor(address _registry,address _chargingcontract)
    {
       registry = IuserRegistry(_registry);
       chargingcontract = Ichargingrequest(_chargingcontract);
    }

    struct Match{
        uint256 requestid;
        address reciever;
        address donor;
        bool active;
    }

   // mapping(uint256=>address)public doneraddress;

    mapping(uint256=>Match) public matching;

    mapping(uint256=>address) public requestDonor;

    event acceptedrequest(uint256 indexed request_id,address indexed receiver);

    modifier onlyverifieddonoe(){
        require(registry.isvarifieduser(msg.sender),"only varified donor allowed");
        _;
    }

    function acceptrequest(uint256 _requestedid) external onlyverifieddonoe{

        Ichargingrequest.Request memory req = chargingcontract.getRequest(_requestedid);

        uint256 id = req.id;
        address reciever = req.reciever;
        Ichargingrequest.Status status = req.status;

        require(id != 0,"request is not found");
        require(status == Ichargingrequest.Status.OPEN,"request is not open");

        //  require(doneraddress[ _requestedid] == address(0),
        // "Already accepted");

        requestDonor[_requestedid] = msg.sender;

        matching[_requestedid] = Match({
            requestid:_requestedid,
            reciever:reciever,
            donor:msg.sender,
            active:true
        });

        emit acceptedrequest(_requestedid,msg.sender);
    }

    function getMatch(uint256 _requestId)
        external
        view
        returns (Match memory)
    {
        return matching[_requestId];
    }

//    function getDonor(uint256 requestId)
//     external
//     view
//     returns(address)
// {
//     return matches[requestId].donor;
// }

}