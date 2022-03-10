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
        string        teamA; 
        string        teamB;
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
        external view returns (SportEvent[] memory);

    // get events using eventids
    function getEvents(bytes32[] memory eventIds) 
        external view returns (SportEvent[] memory);

    // get events using indexes
    function getIndexedEvents(uint[] memory indexes) 
        external view returns (SportEvent[] memory);

    // get all events
    function getAllEvents(uint cursor, uint length) 
        external view returns (SportEvent[] memory);
}

