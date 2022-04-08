//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title the interface for the sport event oracle
/// @notice Declares the functions that the `SportOracle` contract exposes externally
interface ISportPrediction {
    
    /// @notice The possible outcome for an event
    enum EventOutcome {
        Pending,    //match has not been fought to decision
        Underway,   //match has started & is underway
        Decided     //match has been finally Decided 
    }

    /***
    * @dev defines a sport event along with its outcome
    */
    struct SportEvent {
        bytes32       id;
        bytes        teamA; 
        bytes        teamB;
        uint          startTimestamp; 
        uint          endTimestamp;
        EventOutcome  outcome;
        int8          realTeamAScore;
        int8          realTeamBScore;
    }
    

    // check if event exists
    function eventExists(bytes32 _eventId)
        external view returns (bool);
    
    // get all pending events
    function getPendingEvents() 
        external view returns (bytes32[] memory);

    // get an event info
    function getEvent(bytes32 _eventId) 
        external view returns (
            bytes32       id,
            string memory teamA, 
            string memory teamB,
            uint          startTimestamp, 
            EventOutcome  outcome, 
            string memory realTeamAScore,
            string memory realTeamBScore
        );
}

