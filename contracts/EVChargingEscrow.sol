// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IUserregistry {
    function isvarifieduser(address _user) external view returns (bool);
}

/**
 * Unified flow:
 * - Receiver creates a request and deposits full escrow (energyRequired * pricePerUnit) in one tx
 * - Donor accepts the request
 * - Validator starts and completes the charging session
 * - On completion: escrow pays donor (minus platform fee)
 * - If cancelled/expired: receiver can refund on-chain
 */
contract EVChargingEscrow {
    enum Status {
        OPEN,
        ACCEPTED,
        CHARGING,
        COMPLETED,
        CANCELED,
        REFUNDED
    }

    struct Request {
        uint256 id;
        address receiver;
        address donor; // set on accept
        uint256 energyRequired;
        uint256 pricePerUnitWei;
        uint256 createdAt;
        uint256 acceptedAt;
        uint256 startedAt;
        uint256 completedAt;
        uint256 energyDelivered;
        string location;
        Status status;
    }

    address public owner;
    address public validator;
    IUserregistry public registry;

    // fee receiver (can be PlatformFee contract or owner wallet)
    address public feeReceiver;
    uint256 public feeBps; // 100 = 1%, 200 = 2%, max 1000 = 10%

    uint256 public requestCount;
    mapping(uint256 => Request) public requests;
    mapping(uint256 => uint256) public escrowBalance;

    // timeouts (seconds)
    uint256 public acceptTimeout = 30 minutes;
    uint256 public chargingTimeout = 60 minutes;

    bool public paused;

    event RequestCreated(uint256 indexed id, address indexed receiver, uint256 escrowAmount);
    event RequestAccepted(uint256 indexed id, address indexed donor);
    event ChargingStarted(uint256 indexed id);
    event ChargingCompleted(uint256 indexed id, uint256 energyDelivered);
    event PaidOut(uint256 indexed id, address indexed donor, uint256 donorAmount, uint256 feeAmount);
    event Canceled(uint256 indexed id);
    event Refunded(uint256 indexed id, address indexed receiver, uint256 amount);
    event ValidatorUpdated(address indexed validator);
    event FeeUpdated(address indexed feeReceiver, uint256 feeBps);
    event Paused(bool status);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    modifier onlyValidator() {
        require(msg.sender == validator, "only validator");
        _;
    }

    modifier notPaused() {
        require(!paused, "paused");
        _;
    }

    modifier onlyVerified() {
        require(registry.isvarifieduser(msg.sender), "not verified");
        _;
    }

    constructor(address _registry, address _validator, address _feeReceiver, uint256 _feeBps) {
        require(_registry != address(0), "registry zero");
        require(_validator != address(0), "validator zero");
        owner = msg.sender;
        registry = IUserregistry(_registry);
        validator = _validator;
        feeReceiver = _feeReceiver == address(0) ? msg.sender : _feeReceiver;
        _setFeeBps(_feeBps);
    }

    function _setFeeBps(uint256 _feeBps) internal {
        require(_feeBps <= 1000, "fee too high");
        feeBps = _feeBps;
    }

    function setValidator(address _validator) external onlyOwner {
        require(_validator != address(0), "validator zero");
        validator = _validator;
        emit ValidatorUpdated(_validator);
    }

    function setFee(address _feeReceiver, uint256 _feeBps) external onlyOwner {
        require(_feeReceiver != address(0), "feeReceiver zero");
        feeReceiver = _feeReceiver;
        _setFeeBps(_feeBps);
        emit FeeUpdated(_feeReceiver, _feeBps);
    }

    function setTimeouts(uint256 _acceptTimeout, uint256 _chargingTimeout) external onlyOwner {
        require(_acceptTimeout >= 5 minutes && _acceptTimeout <= 7 days, "bad accept timeout");
        require(_chargingTimeout >= 5 minutes && _chargingTimeout <= 7 days, "bad charging timeout");
        acceptTimeout = _acceptTimeout;
        chargingTimeout = _chargingTimeout;
    }

    function setPaused(bool status) external onlyOwner {
        paused = status;
        emit Paused(status);
    }

    function quoteEscrow(uint256 energyRequired, uint256 pricePerUnitWei) public pure returns (uint256) {
        return energyRequired * pricePerUnitWei;
    }

    function createRequest(
        uint256 energyRequired,
        uint256 pricePerUnitWei,
        string calldata location
    ) external payable notPaused onlyVerified returns (uint256 id) {
        require(energyRequired > 0, "energy=0");
        require(pricePerUnitWei > 0, "price=0");
        uint256 amount = quoteEscrow(energyRequired, pricePerUnitWei);
        require(msg.value == amount, "bad escrow amount");

        requestCount++;
        id = requestCount;

        requests[id] = Request({
            id: id,
            receiver: msg.sender,
            donor: address(0),
            energyRequired: energyRequired,
            pricePerUnitWei: pricePerUnitWei,
            createdAt: block.timestamp,
            acceptedAt: 0,
            startedAt: 0,
            completedAt: 0,
            energyDelivered: 0,
            location: location,
            status: Status.OPEN
        });

        escrowBalance[id] = msg.value;
        emit RequestCreated(id, msg.sender, msg.value);
    }

    function acceptRequest(uint256 id) external notPaused onlyVerified {
        Request storage r = requests[id];
        require(r.id != 0, "not found");
        require(r.status == Status.OPEN, "not open");
        require(r.receiver != msg.sender, "receiver cannot accept");

        // if nobody accepted within timeout, receiver can refund; donors shouldn't accept after expiry
        require(block.timestamp <= r.createdAt + acceptTimeout, "accept expired");

        r.donor = msg.sender;
        r.acceptedAt = block.timestamp;
        r.status = Status.ACCEPTED;
        emit RequestAccepted(id, msg.sender);
    }

    function startCharging(uint256 id) external notPaused onlyValidator {
        Request storage r = requests[id];
        require(r.id != 0, "not found");
        require(r.status == Status.ACCEPTED, "not accepted");
        require(r.acceptedAt != 0, "missing acceptedAt");

        r.startedAt = block.timestamp;
        r.status = Status.CHARGING;
        emit ChargingStarted(id);
    }
  
    function completeCharging(uint256 id, uint256 energyDelivered) external notPaused onlyValidator {
        Request storage r = requests[id];
        require(r.id != 0, "not found");
        require(r.status == Status.CHARGING, "not charging");
        require(r.donor != address(0), "no donor");

        r.completedAt = block.timestamp;
        r.energyDelivered = energyDelivered;
        r.status = Status.COMPLETED;
        emit ChargingCompleted(id, energyDelivered);

        _payout(id);
    }

    function cancelOpen(uint256 id) external notPaused {
        Request storage r = requests[id];
        require(r.id != 0, "not found");
        require(msg.sender == r.receiver, "not receiver");
        require(r.status == Status.OPEN, "not open");
        r.status = Status.CANCELED;
        emit Canceled(id);
        _refund(id);
    }

    function refundExpired(uint256 id) external notPaused {
        Request storage r = requests[id];
        require(r.id != 0, "not found");
        require(msg.sender == r.receiver, "not receiver");

        if (r.status == Status.OPEN) {
            require(block.timestamp > r.createdAt + acceptTimeout, "not expired");
            r.status = Status.REFUNDED;
            _refund(id);
            return;
        }

        if (r.status == Status.ACCEPTED) {
            require(block.timestamp > r.acceptedAt + chargingTimeout, "not expired");
            r.status = Status.REFUNDED;
            _refund(id);
            return;
        }

        if (r.status == Status.CHARGING) {
            require(block.timestamp > r.startedAt + chargingTimeout, "not expired");
            r.status = Status.REFUNDED;
            _refund(id);
            return;
        }

        revert("not refundable");
    }

    function _payout(uint256 id) internal {
        uint256 amount = escrowBalance[id];
        require(amount > 0, "no escrow");
        escrowBalance[id] = 0;

        Request storage r = requests[id];
        uint256 fee = (amount * feeBps) / 10_000;
        uint256 donorAmount = amount - fee;

        if (fee > 0) {
            (bool okFee, ) = feeReceiver.call{value: fee}("");
            require(okFee, "fee transfer failed");
        }
        (bool okDonor, ) = payable(r.donor).call{value: donorAmount}("");
        require(okDonor, "donor transfer failed");

        emit PaidOut(id, r.donor, donorAmount, fee);
    }

    function _refund(uint256 id) internal {
        uint256 amount = escrowBalance[id];
        require(amount > 0, "no escrow");
        escrowBalance[id] = 0;

        address receiver = requests[id].receiver;
        (bool ok, ) = payable(receiver).call{value: amount}("");
        require(ok, "refund failed");

        emit Refunded(id, receiver, amount);
    }
}

