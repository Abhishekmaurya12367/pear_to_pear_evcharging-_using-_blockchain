// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;

// /* ========= INTERFACES ========= */

// interface IPlatformFee {
//     function updateFeePercent(uint256 newFee) external;
// }

// interface IEnergyValidation {
//     function changeValidator(address newValidator) external;
// }

// interface IEscrowPayment {
//     function pauseEscrow(bool status) external;
// }

// /* ========= GOVERNANCE ADMIN ========= */

// contract GovernanceAdmin {

//     address public owner;

//     address public platformFee;
//     address public energyValidation;
//     address public escrow;

//     bool public systemPaused;

//     /* ========= EVENTS ========= */

//     event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
//     event SystemPauseChanged(bool status);
//     event PlatformFeeUpdated(uint256 newFee);
//     event ValidatorUpdated(address newValidator);

//     /* ========= CONSTRUCTOR ========= */

//     constructor(
//         address _platformFee,
//         address _energyValidation,
//         address _escrow
//     ) {
//         owner = msg.sender;

//         platformFee = _platformFee;
//         energyValidation = _energyValidation;
//         escrow = _escrow;
//     }

//     /* ========= MODIFIER ========= */

//     modifier onlyOwner() {
//         require(msg.sender == owner, "Only owner allowed");
//         _;
//     }

//     /* ========= TRANSFER OWNERSHIP ========= */

//     function transferOwnership(address newOwner)
//         external
//         onlyOwner
//     {
//         require(newOwner != address(0), "Invalid address");

//         address oldOwner = owner;
//         owner = newOwner;

//         emit OwnershipTransferred(oldOwner, newOwner);
//     }

//     /* ========= PAUSE SYSTEM ========= */

//     function setSystemPause(bool status)
//         external
//         onlyOwner
//     {
//         systemPaused = status;

//         IEscrowPayment(escrow).pauseEscrow(status);

//         emit SystemPauseChanged(status);
//     }

//     /* ========= UPDATE PLATFORM FEE ========= */

//     function updatePlatformFee(uint256 newFee)
//         external
//         onlyOwner
//     {
//         IPlatformFee(platformFee).updateFeePercent(newFee);

//         emit PlatformFeeUpdated(newFee);
//     }

//     /* ========= CHANGE ENERGY VALIDATOR ========= */

//     function changeValidator(address newValidator)
//         external
//         onlyOwner
//     {
//         IEnergyValidation(energyValidation).changeValidator(newValidator);

//         emit ValidatorUpdated(newValidator);
//     }

// }