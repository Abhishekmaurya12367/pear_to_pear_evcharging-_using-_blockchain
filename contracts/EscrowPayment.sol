// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;
// interface IChargingRequest{
//     enum Status{
//         OPEN,
//     ACCEPTED,
//     COMPLETED,
//     CANCELED
//     }
// function getequest(uint256)external view returns( 
//      uint256 id;
//     address reciever
//     uint256 energyrequired;
//     uint256 priceperkilo;
//     string location;
//     Status status;
//     );
// }
// interface IMatchingContract{
//     function getMatch(uint256 _requestid) external view returns(
//          uint256 requestid;
//         address reciever;
//         address donor;
//         bool active;)
// }
// contract EscrowPayment{
//     address public admin;
//     IChargingRequest public charging;
//     IMatchingContrac public matching;
//     mapping(unit256=>uint256)public Escrowbalance;
//     modifier onlyadmin(){
//         require(msg.sender==admin,"only admin allowed ");
//         _;
//     }
//     event Paymentdeposited(uint256 indexed _requestid,address reciever,uint256 ammount);
//     event Paymentrelease(uint256 indexed requestid,address donor,uint256 ammount);
//     event refundpayment(uint indexed _requestid,address reciever,unint256 ammount);
//     constructor(address _charging,address _matching){
//         admin=msg.sender;
//         charging=IChargingRequest(_charging);
//         matching=IMatchingContrac(_matching);
//     }
//     function deposite(uint256 _requestedid) external payable{
//         (,
//     address reciever,
//     uint256 energyrequired,
//     uint256 priceperkilo,
//     ,
//     IChargingRequest.Status.status
//     )=charging.getrequest(_requestedid);
//     require(msg.sender== reciever,"only reciever can deposite");
//     require(status==IChargingRequest.Status. ACCEPTED,"only  accepted request allowed");
//     require(Escrowbalance[_requestedid]==0,"already deposited");
//     uint256 totalcost=energyrequired*priceperkilo;
//     require(msg.value==totalcost,"incorrect payment ammount");

//     Escrowbalance[_requestedid]=msg.value;
//     emit Paymentdeposited(_requestedid,msg.sender,msg.value);
//     }
//     function paymentrelease(uint256 _requestedid) external onlyadmin{
//         ( ,
//         ,
//         address donor,
//         bool active
//         )=matching.getMatch(uint256 _requestid);
//      require(active,"matching not found");
//      uint256 ammount=Escrowbalance[_requestedid];
//      require(ammount>0,"no funds");
//      Escrowbalance[_requestedid]=0;
//      payable(donor).transfer(ammount);
//      emit Paymentrelease( _requestid,donor,ammount);
//     }
//     function refund(uint256 _requestid) external onlyadmin{
//         (,
//     address reciever,
//     ,
//     ,
//     ,
//     IChargingRequest.Status.status
//     )=charging.getrequest(_requestedid);
//     uint256 ammount=Escrowbalance[_requestedid];
//     require(ammount>0,"no fund");
//     Escrowbalance[_requestedid]=0;
//    payable(reciever).transfer(ammount);
//    emit refundpayment(_requestedid,receiver,ammount);
//     }
// }

