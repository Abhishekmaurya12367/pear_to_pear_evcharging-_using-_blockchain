// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IChargingRequest {

    enum Status {
        OPEN,
        ACCEPTED,
        COMPLETED,
        CANCELED
    }

    struct Request {
        uint256 id;
        address reciever;
        uint256 energyrequired;
        uint256 priceperkilo;
        string location;
        Status status;
    }

    function getRequest(uint256 _id) external view returns (Request memory);
}

interface IMatchingContract {

    function getMatch(uint256 _requestid) external view returns (
        uint256 requestid,
        address reciever,
        address donor,
        bool active
    );
}

/* -------- Platform Fee Interface -------- */

interface IPlatformFee {
    function calculateFee(uint256 amount) external view returns(uint256);
    function collectFee() external payable;
}

contract EscrowPayment {

    address public admin;

    IChargingRequest public charging;
    IMatchingContract public matching;
    IPlatformFee public platform;

    mapping(uint256 => uint256) public Escrowbalance;

    modifier onlyadmin() {
        require(msg.sender == admin, "only admin allowed");
        _;
    }

    event Paymentdeposited(uint256 indexed requestid, address reciever, uint256 amount);
    event Paymentrelease(uint256 indexed requestid, address donor, uint256 amount);
    event refundpayment(uint256 indexed requestid, address reciever, uint256 amount);

    constructor(address _charging, address _matching, address _platform) {
        admin = msg.sender;
        charging = IChargingRequest(_charging);
        matching = IMatchingContract(_matching);
        platform = IPlatformFee(_platform);
    }

    /* -------- Deposit Payment -------- */

    function deposite(uint256 _requestedid) external payable {

        IChargingRequest.Request memory req = charging.getRequest(_requestedid);

        address reciever = req.reciever;
        uint256 energyrequired = req.energyrequired;
        uint256 priceperkilo = req.priceperkilo;
        IChargingRequest.Status status = req.status;

        require(msg.sender == reciever, "only reciever can deposit");
        require(status == IChargingRequest.Status.ACCEPTED, "request not accepted");
        require(Escrowbalance[_requestedid] == 0, "already deposited");

        uint256 totalcost = energyrequired * priceperkilo;

        require(msg.value == totalcost, "incorrect payment amount");

        Escrowbalance[_requestedid] = msg.value;

        emit Paymentdeposited(_requestedid, msg.sender, msg.value);
    }

    /* -------- Release Payment -------- */

    function paymentrelease(uint256 _requestedid) external onlyadmin {

        (
            ,
            ,
            address donor,
            bool active
        ) = matching.getMatch(_requestedid);

        require(active, "matching not found");

        IChargingRequest.Request memory req = charging.getRequest(_requestedid);

        require(
            req.status == IChargingRequest.Status.COMPLETED,
            "charging not completed"
        );

        uint256 amount = Escrowbalance[_requestedid];

        require(amount > 0, "no funds");

        Escrowbalance[_requestedid] = 0;

        /* ---- Calculate Platform Fee ---- */

        uint256 fee = platform.calculateFee(amount);
        uint256 donorAmount = amount - fee;

        /* ---- Send Fee to Platform ---- */

        platform.collectFee{value: fee}();

        /* ---- Send Remaining to Donor ---- */

        payable(donor).transfer(donorAmount);

        emit Paymentrelease(_requestedid, donor, donorAmount);
    }

    /* -------- Refund Payment -------- */

    function refund(uint256 _requestedid) external onlyadmin {

        IChargingRequest.Request memory req = charging.getRequest(_requestedid);
        address reciever = req.reciever;

        uint256 amount = Escrowbalance[_requestedid];

        require(amount > 0, "no fund");

        Escrowbalance[_requestedid] = 0;

        payable(reciever).transfer(amount);

        emit refundpayment(_requestedid, reciever, amount);
    }

    /* -------- Pause System -------- */

    bool public paused;

    modifier notPaused() {
        require(!paused, "Escrow paused");
        _;
    }

    function pauseEscrow(bool status) external onlyadmin {
        paused = status;
    }
}