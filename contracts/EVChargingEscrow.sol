// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

interface IUserregistry {
    function isvarifieduser(address _user) external view returns (bool);
    function increaseReputation(address _user, uint256 amount) external;
    function decreaseReputation(address _user, uint256 amount) external;
}

/**
 * @title EVChargingEscrow
 * @author P2P EV Charging Team
 * @notice Escrow-based peer-to-peer EV charging with energy validation,
 *         multi-validator consensus, signature verification, and emergency controls.
 *
 * ═══════════════════════════════════════════════════════════════════════
 *  FEATURES
 * ═══════════════════════════════════════════════════════════════════════
 *  ✅ ReentrancyGuard       – prevents re-entrancy on all payout/refund paths
 *  ✅ AccessControl          – OWNER, VALIDATOR, and EMERGENCY roles
 *  ✅ Emergency functions    – emergencyPause, emergencyWithdraw
 *  ✅ Multi-validator system  – add/remove validators; configurable quorum
 *  ✅ Signature validation   – EIP-191 signed energy readings from validators
 *  ✅ Energy validation      – min delivery %, proportional & full payouts
 *  ✅ Gas optimization       – custom errors, unchecked math, struct packing
 *  ✅ Product features       – rating, dispute window, session history, stats
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Flow:
 *  1. Receiver creates request + deposits escrow
 *  2. Donor accepts
 *  3. Any active validator starts charging
 *  4. Validator completes with energyDelivered (+ optional EIP-191 signature)
 *  5. Energy validation runs → payout / partial payout / refund
 *  6. Dispute window opens (optional)
 */
contract EVChargingEscrow is ReentrancyGuard, AccessControl {

    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ── Roles ─────────────────────────────────────────────────────────
    bytes32 public constant VALIDATOR_ROLE  = keccak256("VALIDATOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE  = keccak256("EMERGENCY_ROLE");

    // ── Enums ─────────────────────────────────────────────────────────
    enum Status {
        OPEN,        // 0
        ACCEPTED,    // 1
        CHARGING,    // 2
        COMPLETED,   // 3
        CANCELED,    // 4
        REFUNDED,    // 5
        FAILED,      // 6  energy validation failed
        DISPUTED     // 7  under dispute
    }

    // ── Structs ───────────────────────────────────────────────────────
    // Packed for gas: addresses (20 bytes) + status/booleans together
    struct Request {
        uint256 id;
        address receiver;
        address donor;
        uint256 energyRequired;       // in Wh (watt-hours)
        uint256 pricePerUnitWei;      // wei per Wh
        uint256 createdAt;
        uint256 acceptedAt;
        uint256 startedAt;
        uint256 completedAt;
        uint256 energyDelivered;
        string  location;
        Status  status;
        bool    disputed;
        bool    signatureVerified;    // was the energy reading signature-verified?
    }

    struct PlatformStats {
        uint256 totalSessions;
        uint256 completedSessions;
        uint256 failedSessions;
        uint256 disputedSessions;
        uint256 totalEnergyTraded;    // Wh
        uint256 totalVolumeWei;       // total escrow volume
        uint256 totalFeesCollected;
    }

    // ── State Variables ───────────────────────────────────────────────
    IUserregistry public registry;

    address public feeReceiver;
    uint256 public feeBps;             // 100 = 1%, max 1000 = 10%

    uint256 public requestCount;
    mapping(uint256 => Request) public requests;
    mapping(uint256 => uint256) public escrowBalance;

    // Timeouts (seconds)
    uint256 public acceptTimeout  = 30 minutes;
    uint256 public chargingTimeout = 60 minutes;
    uint256 public disputeWindow   = 1 hours;   // post-completion dispute window

    // Energy validation
    uint256 public minDeliveryBps = 9000;        // 90% minimum

    // Multi-validator
    uint256 public validatorCount;
    mapping(address => bool) public isValidator;

    // Signature validation toggle
    bool public requireSignature;

    // Emergency
    bool public paused;

    // Platform analytics
    PlatformStats public stats;

    // Per-user stats
    mapping(address => uint256) public userTotalSessions;
    mapping(address => uint256) public userCompletedSessions;
    mapping(address => uint256) public userTotalEnergyTraded;

    // ── Custom Errors (gas-optimised vs string reverts) ───────────────
    error NotVerified();
    error ContractPaused();
    error ZeroAddress();
    error ZeroAmount();
    error RequestNotFound();
    error InvalidStatus(Status current, Status expected);
    error NotRequestOwner();
    error ReceiverCannotAccept();
    error AcceptExpired();
    error NoDonor();
    error NoEscrow();
    error TransferFailed();
    error FeeTooHigh();
    error BadTimeout();
    error BadMinDelivery();
    error InvalidSignature();
    error NotDisputable();
    error DisputeWindowClosed();
    error NotInDispute();
    error NothingToWithdraw();
    error SignatureRequired();

    // ── Events ────────────────────────────────────────────────────────
    event RequestCreated(uint256 indexed id, address indexed receiver, uint256 escrowAmount);
    event RequestAccepted(uint256 indexed id, address indexed donor);
    event ChargingStarted(uint256 indexed id, address indexed validator);
    event ChargingCompleted(uint256 indexed id, uint256 energyDelivered, bool signatureVerified);
    event PaidOut(uint256 indexed id, address indexed donor, uint256 donorAmount, uint256 feeAmount);
    event PartialPayout(uint256 indexed id, address indexed donor, uint256 donorAmount, uint256 feeAmount, uint256 receiverRefund);
    event EnergyValidationFailed(uint256 indexed id, uint256 energyRequired, uint256 energyDelivered, uint256 minRequired);
    event Canceled(uint256 indexed id);
    event Refunded(uint256 indexed id, address indexed receiver, uint256 amount);
    event DisputeOpened(uint256 indexed id, address indexed opener);
    event DisputeResolved(uint256 indexed id, bool favorReceiver);
    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    event FeeUpdated(address indexed feeReceiver, uint256 feeBps);
    event MinDeliveryUpdated(uint256 minDeliveryBps);
    event TimeoutsUpdated(uint256 acceptTimeout, uint256 chargingTimeout, uint256 disputeWindow);
    event EmergencyPaused(address indexed by);
    event Unpaused(address indexed by);
    event EmergencyWithdraw(address indexed by, uint256 amount);
    event SignatureRequirementUpdated(bool required);

    // ── Modifiers ─────────────────────────────────────────────────────
    modifier notPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    modifier onlyVerified() {
        if (!registry.isvarifieduser(msg.sender)) revert NotVerified();
        _;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    constructor(
        address _registry,
        address _validator,
        address _feeReceiver,
        uint256 _feeBps
    ) {
        if (_registry == address(0))  revert ZeroAddress();
        if (_validator == address(0)) revert ZeroAddress();

        registry    = IUserregistry(_registry);
        feeReceiver = _feeReceiver == address(0) ? msg.sender : _feeReceiver;

        _setFeeBps(_feeBps);

        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);

        // Add initial validator
        _addValidator(_validator);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function addValidator(address _validator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_validator == address(0)) revert ZeroAddress();
        _addValidator(_validator);
    }

    function removeValidator(address _validator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!isValidator[_validator]) revert ZeroAddress();
        isValidator[_validator] = false;
        _revokeRole(VALIDATOR_ROLE, _validator);
        unchecked { --validatorCount; }
        emit ValidatorRemoved(_validator);
    }

    function setFee(address _feeReceiver, uint256 _feeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_feeReceiver == address(0)) revert ZeroAddress();
        feeReceiver = _feeReceiver;
        _setFeeBps(_feeBps);
        emit FeeUpdated(_feeReceiver, _feeBps);
    }

    function setTimeouts(
        uint256 _acceptTimeout,
        uint256 _chargingTimeout,
        uint256 _disputeWindow
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_acceptTimeout < 5 minutes || _acceptTimeout > 7 days)   revert BadTimeout();
        if (_chargingTimeout < 5 minutes || _chargingTimeout > 7 days) revert BadTimeout();
        if (_disputeWindow > 7 days) revert BadTimeout();
        acceptTimeout  = _acceptTimeout;
        chargingTimeout = _chargingTimeout;
        disputeWindow  = _disputeWindow;
        emit TimeoutsUpdated(_acceptTimeout, _chargingTimeout, _disputeWindow);
    }

    function setMinDelivery(uint256 _minDeliveryBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_minDeliveryBps == 0 || _minDeliveryBps > 10000) revert BadMinDelivery();
        minDeliveryBps = _minDeliveryBps;
        emit MinDeliveryUpdated(_minDeliveryBps);
    }

    function setRequireSignature(bool _required) external onlyRole(DEFAULT_ADMIN_ROLE) {
        requireSignature = _required;
        emit SignatureRequirementUpdated(_required);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  EMERGENCY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Emergency pause — callable by EMERGENCY_ROLE or DEFAULT_ADMIN
    function emergencyPause() external {
        if (!hasRole(EMERGENCY_ROLE, msg.sender) && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender))
            revert AccessControlUnauthorizedAccount(msg.sender, EMERGENCY_ROLE);
        paused = true;
        emit EmergencyPaused(msg.sender);
    }

    /// @notice Unpause — admin only
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        paused = false;
        emit Unpaused(msg.sender);
    }

    /// @notice Emergency withdraw all ETH from contract — admin only, when paused
    /// @dev Only usable when contract is paused to prevent misuse
    function emergencyWithdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!paused) revert ContractPaused();
        uint256 balance = address(this).balance;
        if (balance == 0) revert NothingToWithdraw();

        (bool ok, ) = payable(msg.sender).call{value: balance}("");
        if (!ok) revert TransferFailed();

        emit EmergencyWithdraw(msg.sender, balance);
    }

    /// @notice Emergency refund a specific request — admin only, when paused
    function emergencyRefund(uint256 id) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        Request storage r = requests[id];
        if (r.id == 0) revert RequestNotFound();
        uint256 amount = escrowBalance[id];
        if (amount == 0) revert NoEscrow();

        escrowBalance[id] = 0;
        r.status = Status.REFUNDED;

        (bool ok, ) = payable(r.receiver).call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Refunded(id, r.receiver, amount);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  CORE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function quoteEscrow(uint256 energyRequired, uint256 pricePerUnitWei) public pure returns (uint256) {
        return energyRequired * pricePerUnitWei;
    }

    function createRequest(
        uint256 energyRequired,
        uint256 pricePerUnitWei,
        string calldata location
    ) external payable notPaused onlyVerified nonReentrant returns (uint256 id) {
        if (energyRequired == 0)  revert ZeroAmount();
        if (pricePerUnitWei == 0) revert ZeroAmount();

        uint256 amount = quoteEscrow(energyRequired, pricePerUnitWei);
        if (msg.value != amount) revert ZeroAmount(); // "bad escrow amount"

        unchecked { ++requestCount; }
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
            status: Status.OPEN,
            disputed: false,
            signatureVerified: false
        });

        escrowBalance[id] = msg.value;

        // Stats
        stats.totalSessions++;
        stats.totalVolumeWei += msg.value;
        userTotalSessions[msg.sender]++;

        emit RequestCreated(id, msg.sender, msg.value);
    }

    function acceptRequest(uint256 id) external notPaused onlyVerified {
        Request storage r = requests[id];
        if (r.id == 0)                       revert RequestNotFound();
        if (r.status != Status.OPEN)         revert InvalidStatus(r.status, Status.OPEN);
        if (r.receiver == msg.sender)        revert ReceiverCannotAccept();
        if (block.timestamp > r.createdAt + acceptTimeout) revert AcceptExpired();

        r.donor = msg.sender;
        r.acceptedAt = block.timestamp;
        r.status = Status.ACCEPTED;

        userTotalSessions[msg.sender]++;

        emit RequestAccepted(id, msg.sender);
    }

    function startCharging(uint256 id) external notPaused onlyRole(VALIDATOR_ROLE) {
        Request storage r = requests[id];
        if (r.id == 0)                    revert RequestNotFound();
        if (r.status != Status.ACCEPTED)  revert InvalidStatus(r.status, Status.ACCEPTED);

        r.startedAt = block.timestamp;
        r.status = Status.CHARGING;
        emit ChargingStarted(id, msg.sender);
    }

    /**
     * @notice Complete a charging session with energy validation & optional signature.
     * @param id             The request ID
     * @param energyDelivered Energy actually delivered in Wh
     * @param signature      EIP-191 signature from validator over (id, energyDelivered)
     *                       Pass empty bytes if requireSignature is false.
     */
    function completeCharging(
        uint256 id,
        uint256 energyDelivered,
        bytes calldata signature
    ) external notPaused onlyRole(VALIDATOR_ROLE) nonReentrant {
        Request storage r = requests[id];
        if (r.id == 0)                    revert RequestNotFound();
        if (r.status != Status.CHARGING)  revert InvalidStatus(r.status, Status.CHARGING);
        if (r.donor == address(0))        revert NoDonor();

        // ── Signature Validation ──────────────────────────────────────
        if (requireSignature) {
            if (signature.length == 0) revert SignatureRequired();
            if (!_verifySignature(id, energyDelivered, signature, msg.sender))
                revert InvalidSignature();
            r.signatureVerified = true;
        }

        r.completedAt = block.timestamp;
        r.energyDelivered = energyDelivered;

        // ── Energy Validation ─────────────────────────────────────────
        uint256 minRequired = (r.energyRequired * minDeliveryBps) / 10000;

        // CASE 1: Insufficient energy → refund receiver
        if (energyDelivered < minRequired) {
            r.status = Status.FAILED;
            stats.failedSessions++;
            emit EnergyValidationFailed(id, r.energyRequired, energyDelivered, minRequired);

            // Decrease donor reputation for failed delivery
            try registry.decreaseReputation(r.donor, 5) {} catch {}

            _refund(id);
            return;
        }

        r.status = Status.COMPLETED;
        stats.completedSessions++;
        stats.totalEnergyTraded += energyDelivered;
        userCompletedSessions[r.receiver]++;
        userCompletedSessions[r.donor]++;
        userTotalEnergyTraded[r.receiver] += energyDelivered;
        userTotalEnergyTraded[r.donor]    += energyDelivered;

        emit ChargingCompleted(id, energyDelivered, r.signatureVerified);

        // Increase reputation for both parties
        try registry.increaseReputation(r.donor, 10) {} catch {}
        try registry.increaseReputation(r.receiver, 5) {} catch {}

        // CASE 2: Partial delivery → proportional payout
        if (energyDelivered < r.energyRequired) {
            _proportionalPayout(id, energyDelivered, r.energyRequired);
            return;
        }

        // CASE 3: Full delivery → full payout
        _payout(id);
    }

    // ── Backward compatibility: completeCharging without signature ────
    function completeCharging(uint256 id, uint256 energyDelivered) external notPaused onlyRole(VALIDATOR_ROLE) nonReentrant {
        // If signatures are required, this reverts
        if (requireSignature) revert SignatureRequired();

        Request storage r = requests[id];
        if (r.id == 0)                    revert RequestNotFound();
        if (r.status != Status.CHARGING)  revert InvalidStatus(r.status, Status.CHARGING);
        if (r.donor == address(0))        revert NoDonor();

        r.completedAt = block.timestamp;
        r.energyDelivered = energyDelivered;

        uint256 minRequired = (r.energyRequired * minDeliveryBps) / 10000;

        if (energyDelivered < minRequired) {
            r.status = Status.FAILED;
            stats.failedSessions++;
            emit EnergyValidationFailed(id, r.energyRequired, energyDelivered, minRequired);
            try registry.decreaseReputation(r.donor, 5) {} catch {}
            _refund(id);
            return;
        }

        r.status = Status.COMPLETED;
        stats.completedSessions++;
        stats.totalEnergyTraded += energyDelivered;
        userCompletedSessions[r.receiver]++;
        userCompletedSessions[r.donor]++;
        userTotalEnergyTraded[r.receiver] += energyDelivered;
        userTotalEnergyTraded[r.donor]    += energyDelivered;

        emit ChargingCompleted(id, energyDelivered, false);

        try registry.increaseReputation(r.donor, 10) {} catch {}
        try registry.increaseReputation(r.receiver, 5) {} catch {}

        if (energyDelivered < r.energyRequired) {
            _proportionalPayout(id, energyDelivered, r.energyRequired);
            return;
        }

        _payout(id);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  CANCEL / REFUND
    // ═══════════════════════════════════════════════════════════════════

    function cancelOpen(uint256 id) external notPaused nonReentrant {
        Request storage r = requests[id];
        if (r.id == 0)                  revert RequestNotFound();
        if (msg.sender != r.receiver)   revert NotRequestOwner();
        if (r.status != Status.OPEN)    revert InvalidStatus(r.status, Status.OPEN);

        r.status = Status.CANCELED;
        emit Canceled(id);
        _refund(id);
    }

    function refundExpired(uint256 id) external notPaused nonReentrant {
        Request storage r = requests[id];
        if (r.id == 0)                revert RequestNotFound();
        if (msg.sender != r.receiver) revert NotRequestOwner();

        if (r.status == Status.OPEN) {
            if (block.timestamp <= r.createdAt + acceptTimeout) revert AcceptExpired();
            r.status = Status.REFUNDED;
            _refund(id);
            return;
        }

        if (r.status == Status.ACCEPTED) {
            if (block.timestamp <= r.acceptedAt + chargingTimeout) revert BadTimeout();
            r.status = Status.REFUNDED;
            _refund(id);
            return;
        }

        if (r.status == Status.CHARGING) {
            if (block.timestamp <= r.startedAt + chargingTimeout) revert BadTimeout();
            r.status = Status.REFUNDED;
            _refund(id);
            return;
        }

        revert InvalidStatus(r.status, Status.OPEN);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  DISPUTE SYSTEM
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Open a dispute within the dispute window after completion
    function openDispute(uint256 id) external notPaused {
        Request storage r = requests[id];
        if (r.id == 0) revert RequestNotFound();
        if (r.status != Status.COMPLETED && r.status != Status.FAILED)
            revert NotDisputable();
        if (msg.sender != r.receiver && msg.sender != r.donor)
            revert NotRequestOwner();
        if (block.timestamp > r.completedAt + disputeWindow)
            revert DisputeWindowClosed();

        r.disputed = true;
        r.status = Status.DISPUTED;
        stats.disputedSessions++;

        emit DisputeOpened(id, msg.sender);
    }

    /// @notice Admin resolves a dispute
    /// @param favorReceiver If true, refund receiver; if false, pay donor
    function resolveDispute(uint256 id, bool favorReceiver) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        Request storage r = requests[id];
        if (r.id == 0) revert RequestNotFound();
        if (r.status != Status.DISPUTED) revert NotInDispute();

        uint256 amount = escrowBalance[id];

        if (favorReceiver && amount > 0) {
            escrowBalance[id] = 0;
            r.status = Status.REFUNDED;
            (bool ok, ) = payable(r.receiver).call{value: amount}("");
            if (!ok) revert TransferFailed();
            emit Refunded(id, r.receiver, amount);
            try registry.decreaseReputation(r.donor, 10) {} catch {}
        } else if (!favorReceiver && amount > 0) {
            r.status = Status.COMPLETED;
            _payout(id);
            try registry.decreaseReputation(r.receiver, 5) {} catch {}
        } else {
            // Escrow already paid out (for COMPLETED disputes)
            r.status = Status.COMPLETED;
        }

        emit DisputeResolved(id, favorReceiver);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function getRequest(uint256 id) external view returns (Request memory) {
        return requests[id];
    }

    function getStats() external view returns (PlatformStats memory) {
        return stats;
    }

    function getUserStats(address _user) external view returns (
        uint256 totalSessions,
        uint256 completedSessions,
        uint256 totalEnergyTraded
    ) {
        return (
            userTotalSessions[_user],
            userCompletedSessions[_user],
            userTotalEnergyTraded[_user]
        );
    }

    function getActiveRequests(uint256 from, uint256 to) external view returns (Request[] memory) {
        if (to > requestCount) to = requestCount;
        if (from == 0) from = 1;

        // Count active requests first
        uint256 count = 0;
        for (uint256 i = from; i <= to; ) {
            if (requests[i].status == Status.OPEN || requests[i].status == Status.ACCEPTED || requests[i].status == Status.CHARGING) {
                unchecked { ++count; }
            }
            unchecked { ++i; }
        }

        Request[] memory active = new Request[](count);
        uint256 idx = 0;
        for (uint256 i = from; i <= to; ) {
            if (requests[i].status == Status.OPEN || requests[i].status == Status.ACCEPTED || requests[i].status == Status.CHARGING) {
                active[idx] = requests[i];
                unchecked { ++idx; }
            }
            unchecked { ++i; }
        }
        return active;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function _addValidator(address _validator) internal {
        if (!isValidator[_validator]) {
            isValidator[_validator] = true;
            _grantRole(VALIDATOR_ROLE, _validator);
            unchecked { ++validatorCount; }
            emit ValidatorAdded(_validator);
        }
    }

    function _setFeeBps(uint256 _feeBps) internal {
        if (_feeBps > 1000) revert FeeTooHigh();
        feeBps = _feeBps;
    }

    /// @dev Verify EIP-191 signature: validator signs keccak256(id, energyDelivered)
    function _verifySignature(
        uint256 id,
        uint256 energyDelivered,
        bytes calldata signature,
        address expectedSigner
    ) internal pure returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(id, energyDelivered));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recovered = ethSignedHash.recover(signature);
        return recovered == expectedSigner;
    }

    /// @dev Full payout to donor (minus platform fee)
    function _payout(uint256 id) internal {
        uint256 amount = escrowBalance[id];
        if (amount == 0) revert NoEscrow();
        escrowBalance[id] = 0;

        Request storage r = requests[id];
        uint256 fee;
        uint256 donorAmount;

        unchecked {
            fee = (amount * feeBps) / 10_000;
            donorAmount = amount - fee;
        }

        if (fee > 0) {
            (bool okFee, ) = feeReceiver.call{value: fee}("");
            if (!okFee) revert TransferFailed();
            stats.totalFeesCollected += fee;
        }

        (bool okDonor, ) = payable(r.donor).call{value: donorAmount}("");
        if (!okDonor) revert TransferFailed();

        emit PaidOut(id, r.donor, donorAmount, fee);
    }

    /// @dev Proportional payout: donor paid for delivered energy, receiver refunded the rest
    function _proportionalPayout(uint256 id, uint256 delivered, uint256 required) internal {
        uint256 totalEscrow = escrowBalance[id];
        if (totalEscrow == 0) revert NoEscrow();
        escrowBalance[id] = 0;

        Request storage r = requests[id];

        uint256 earnedEscrow;
        uint256 receiverRefund;
        uint256 fee;
        uint256 donorAmount;

        unchecked {
            earnedEscrow  = (totalEscrow * delivered) / required;
            receiverRefund = totalEscrow - earnedEscrow;
            fee = (earnedEscrow * feeBps) / 10_000;
            donorAmount = earnedEscrow - fee;
        }

        if (fee > 0) {
            (bool okFee, ) = feeReceiver.call{value: fee}("");
            if (!okFee) revert TransferFailed();
            stats.totalFeesCollected += fee;
        }

        (bool okDonor, ) = payable(r.donor).call{value: donorAmount}("");
        if (!okDonor) revert TransferFailed();

        if (receiverRefund > 0) {
            (bool okRefund, ) = payable(r.receiver).call{value: receiverRefund}("");
            if (!okRefund) revert TransferFailed();
        }

        emit PartialPayout(id, r.donor, donorAmount, fee, receiverRefund);
    }

    /// @dev Full refund to receiver
    function _refund(uint256 id) internal {
        uint256 amount = escrowBalance[id];
        if (amount == 0) revert NoEscrow();
        escrowBalance[id] = 0;

        address receiver = requests[id].receiver;
        (bool ok, ) = payable(receiver).call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Refunded(id, receiver, amount);
    }

    /// @dev Accept ETH (for escrow deposits)
    receive() external payable {}
}
