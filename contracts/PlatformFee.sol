// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PlatformFee {

    address public owner;
    address public escrowContract;

    uint256 public feePercent;   // Example: 2 = 2%

    /* ========= EVENTS ========= */

    event EscrowUpdated(address indexed newEscrow);
    event FeePercentUpdated(uint256 newPercent);
    event FeeCollected(uint256 amount);
    event Withdraw(address indexed owner, uint256 amount);

    /* ========= CONSTRUCTOR ========= */

    constructor(uint256 _feePercent) {
        owner = msg.sender;
        feePercent = _feePercent;
    }

    /* ========= MODIFIERS ========= */

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner allowed");
        _;
    }

    modifier onlyEscrow() {
        require(msg.sender == escrowContract, "Only escrow allowed");
        _;
    }

    /* ========= SET ESCROW CONTRACT ========= */

    function setEscrowContract(address _escrow)
        external
        onlyOwner
    {
        require(_escrow != address(0), "Invalid address");

        escrowContract = _escrow;

        emit EscrowUpdated(_escrow);
    }

    /* ========= UPDATE FEE PERCENT ========= */

    function updateFeePercent(uint256 _newPercent)
        external
        onlyOwner
    {
        require(_newPercent <= 10, "Fee too high"); 
        feePercent = _newPercent;

        emit FeePercentUpdated(_newPercent);
    }

    /* ========= CALCULATE PLATFORM FEE ========= */

    function calculateFee(uint256 amount)
        external
        view
        returns(uint256)
    {
        return (amount * feePercent) / 100;
    }

    /* ========= RECEIVE PLATFORM FEE ========= */

    function collectFee()
        external
        payable
        onlyEscrow
    {
        require(msg.value > 0, "No fee sent");

        emit FeeCollected(msg.value);
    }

    /* ========= WITHDRAW FEES ========= */

    function withdrawFees()
        external
        onlyOwner
    {
        uint256 balance = address(this).balance;

        require(balance > 0, "No balance");

        payable(owner).transfer(balance);

        emit Withdraw(owner, balance);
    }
    function transferOwnership(address newOwner)
external
onlyOwner
{
    require(newOwner != address(0), "Invalid address");

    owner = newOwner;
}
}