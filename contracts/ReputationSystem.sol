// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/* ========= INTERFACE ========= */

interface IEscrowPayment {

    function paymentReleased(uint256 requestId)
        external
        view
        returns(bool);
}

/* ========= REPUTATION SYSTEM ========= */

contract ReputationSystem {

    IEscrowPayment public escrow;

    constructor(address _escrow) {
        escrow = IEscrowPayment(_escrow);
    }

    /* ========= STRUCT ========= */

    struct Reputation {
        uint256 totalRating;
        uint256 ratingCount;
    }

    mapping(address => Reputation) public reputations;

    // prevent double rating
    mapping(uint256 => mapping(address => bool)) public rated;

    /* ========= EVENTS ========= */

    event UserRated(
        uint256 indexed requestId,
        address indexed rater,
        address indexed user,
        uint256 rating
    );

    /* ========= RATE USER ========= */

    function rateUser(
        uint256 requestId,
        address user,
        uint256 rating
    )
        external
    {
        require(
            escrow.paymentReleased(requestId),
            "Payment not released"
        );

        require(
            rating >= 1 && rating <= 5,
            "Rating must be 1-5"
        );

        require(
            !rated[requestId][msg.sender],
            "Already rated"
        );

        reputations[user].totalRating += rating;
        reputations[user].ratingCount += 1;

        rated[requestId][msg.sender] = true;

        emit UserRated(
            requestId,
            msg.sender,
            user,
            rating
        );
    }

    /* ========= GET AVERAGE RATING ========= */

    function getAverageRating(address user)
        external
        view
        returns(uint256)
    {
        Reputation memory rep = reputations[user];

        if(rep.ratingCount == 0){
            return 0;
        }

        return rep.totalRating / rep.ratingCount;
    }
}