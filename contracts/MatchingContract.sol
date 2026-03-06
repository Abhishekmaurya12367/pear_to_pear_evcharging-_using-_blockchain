// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;
// interface IuserRegistry{
// function  isvarifieduser(address _user)external returns(bool);
// }
// interface Ichargingrequest{
//     enum Status{
//     OPEN,
//     ACCEPTED,
//     COMPLETED,
//     CANCELED
//  }
//  function getrequest(uint256 _id) external view returns{
//     return (
//     uint256 id;
//     address reciever;
//     uint256 energyrequired;
//     uint256 priceperkilo;
//     string location;
//     Status status;
//     );
//  }
// }
//  contract MatchingContract{
//     interface public registry;
//     interface public chargingcontract;
//     constructor(address _registry,address _chargingcontract )
//     {
//        registry=IuserRegistry(_registry);
//        chargingcontract=Ichargingrequest(_chargingcontract);
//     }
//     struct Match{
//         uint256 requestid;
//         address reciever;
//         address donor;
//         bool active;
//     }
//    // mapping(uint256=>address)public doneraddress;
//     mapping(uint256=>Match) public matching;
//     event acceptedrequest(uint256 index request_id,address index receiver);
//     modifier onlyverifieddonoe(){
//         require(registry.isvarifieduser(msg.sender),"only varified donor allowed");
//         _;   
//     }
//     function acceptrequest(uint256 _requestedid)external onlyverifieddonoe{
//         (
//             uint256 id,
//             address reciever,
//             ,
//             ,
//             ,
//             Ichargingrequest.Status status
//         )=chargingcontract.getrequest(_requestedid);
//         require(id!=0,"request is not found");
//         require(status==Ichargingrequest.Status.OPEN,"request is not open");
//         //  require(doneraddress[ _requestedid] == address(0),
//         // "Already accepted");
    
//     requestDonor[requestId] = msg.sender;

//     matching[_requestedid]=Match({
//         requestid:_requestedid,
//         reciever:reciever,
//         donor:msg.sender,
//         active:true
//     });
//     emit acceptedrequest(_requestedid,msg.sender);
//     }

//     function getMatch(uint256 _requestId)
//         external
//         view
//         returns (Match memory)
//     {
//         return matching[_requestId];
//     }

// //    function getDonor(uint256 requestId)
// //     external
// //     view
// //     returns(address)
// // {
// //     return matches[requestId].donor;
// // }
//  }
