// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Userregistry
 * @notice Manages EV user registration, KYC verification, reputation, and blacklisting.
 * @dev Uses OpenZeppelin AccessControl for role-based permissions.
 *
 * Roles:
 *   DEFAULT_ADMIN_ROLE  – can grant/revoke other roles
 *   ADMIN_ROLE          – can verify, blacklist, and manage users
 *   VERIFIER_ROLE       – can verify users (e.g. automated KYC oracle)
 */
contract Userregistry is AccessControl {

    // ── Roles ─────────────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // kept for backward-compatibility with frontend reads
    address public admin;

    enum Role {
        NONE,
        DONOR,
        RECEIVER,
        BOTH
    }

    struct User {
        address wallet;
        string  evmode;
        uint256 batterycapacity;
        bool    isRegister;
        bool    isvarified;
        Role    role;
        uint256 reputation;
    }

    mapping(address => User) private user;
    mapping(address => bool) public  blacklisted;

    // ── Custom Errors (gas-optimised) ─────────────────────────────────
    error AlreadyRegistered();
    error NotRegistered();
    error InvalidRole();
    error Blacklisted();
    error AlreadyVerified();
    error NotBlacklisted();

    // ── Events ────────────────────────────────────────────────────────
    event UserRegistered(address indexed user);
    event UserVerified(address indexed user);
    event RoleUpdated(address indexed user, Role role);
    event UserBlacklisted(address indexed user);
    event UserUnblacklisted(address indexed user);
    event ReputationUpdated(address indexed user, uint256 newReputation);

    // ── Legacy modifier kept for backward compat in tests ─────────────
    modifier notblocklisted() {
        if (blacklisted[msg.sender]) revert Blacklisted();
        _;
    }

    constructor() {
        admin = msg.sender;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PUBLIC / USER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function register_user(
        string memory model_ev,
        uint256 _battarycapacity,
        Role _role
    ) external notblocklisted {
        if (user[msg.sender].isRegister) revert AlreadyRegistered();
        if (_role == Role.NONE) revert InvalidRole();

        user[msg.sender] = User({
            wallet: msg.sender,
            evmode: model_ev,
            batterycapacity: _battarycapacity,
            isRegister: true,
            isvarified: false,
            role: _role,
            reputation: 0
        });
        emit UserRegistered(msg.sender);
    }

    function update_role(Role _role) external {
        if (!user[msg.sender].isRegister) revert NotRegistered();
        if (_role == Role.NONE) revert InvalidRole();
        user[msg.sender].role = _role;
        emit RoleUpdated(msg.sender, _role);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ADMIN / VERIFIER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Verify a single user (callable by ADMIN or VERIFIER)
    function varifyuser(address _user) external {
        if (!hasRole(ADMIN_ROLE, msg.sender) && !hasRole(VERIFIER_ROLE, msg.sender))
            revert AccessControlUnauthorizedAccount(msg.sender, ADMIN_ROLE);
        if (!user[_user].isRegister) revert NotRegistered();
        user[_user].isvarified = true;
        emit UserVerified(_user);
    }

    /// @notice Batch verify multiple users in one tx (gas saver)
    function batchVerify(address[] calldata users) external {
        if (!hasRole(ADMIN_ROLE, msg.sender) && !hasRole(VERIFIER_ROLE, msg.sender))
            revert AccessControlUnauthorizedAccount(msg.sender, ADMIN_ROLE);

        for (uint256 i = 0; i < users.length; ) {
            if (user[users[i]].isRegister && !user[users[i]].isvarified) {
                user[users[i]].isvarified = true;
                emit UserVerified(users[i]);
            }
            unchecked { ++i; }
        }
    }

    /// @notice Blacklist a user
    function userblocklist(address _user) external onlyRole(ADMIN_ROLE) {
        blacklisted[_user] = true;
        emit UserBlacklisted(_user);
    }

    /// @notice Remove from blacklist
    function removeFromBlocklist(address _user) external onlyRole(ADMIN_ROLE) {
        if (!blacklisted[_user]) revert NotBlacklisted();
        blacklisted[_user] = false;
        emit UserUnblacklisted(_user);
    }

    /// @notice Increase user reputation (called after successful charging)
    function increaseReputation(address _user, uint256 amount) external onlyRole(ADMIN_ROLE) {
        if (!user[_user].isRegister) revert NotRegistered();
        user[_user].reputation += amount;
        emit ReputationUpdated(_user, user[_user].reputation);
    }

    /// @notice Decrease user reputation (called after failed/disputed session)
    function decreaseReputation(address _user, uint256 amount) external onlyRole(ADMIN_ROLE) {
        if (!user[_user].isRegister) revert NotRegistered();
        if (user[_user].reputation >= amount) {
            user[_user].reputation -= amount;
        } else {
            user[_user].reputation = 0;
        }
        emit ReputationUpdated(_user, user[_user].reputation);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function getuser(address _user) external view returns (User memory) {
        return user[_user];
    }

    function isvarifieduser(address _user) external view returns (bool) {
        return user[_user].isvarified;
    }

    function getReputation(address _user) external view returns (uint256) {
        return user[_user].reputation;
    }

    function isRegistered(address _user) external view returns (bool) {
        return user[_user].isRegister;
    }
}
