// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/ISportPrediction.sol";
import "hardhat/console.sol";


/**
 * @title A smart-contract Oracle that register sport events, retrieve their outcomes and 
 * communicate their results when asked for.
 * @notice Collects and provides information on sport events and their outcomes
 */
contract SportOracle is ISportPrediction, Ownable, ReentrancyGuard {

    /***
    * @dev defines a sport event along with its outcome
    */
    struct SportEvent {
        bytes32      id;
        string       teamA;
        string       teamB;
        uint         startTimestamp;
        EventOutcome outcome;
        string       realTeamAScore;
        string       realTeamBScore;
    }

    /**
    * @dev all the sport events
    */
    SportEvent[] private events;

    /*
    * @dev map of composed {eventId (SHA3 of event key infos) => eventIndex (in events)} pairs
    */
    mapping(bytes32 => uint) private eventIdToIndex;


    /**
     * @dev Triggered once an event has been added
     */
    event SportEventAdded(
        bytes32      _eventId,
        string       _teamA,
        string       _teamB,
        uint         _startTimestamp,
        EventOutcome _eventOutcome,
        string       _realTeamAScore,
        string       _realTeamBScore
    );

    /**
     * @notice Add a new pending sport event into the blockchain
     * @param _teamA descriptive teamA for the sport event
     * @param _teamB descriptive teamB for the sport event
     * @param _startTimestamp _startTimestamp set for the sport event
     * @return the unique id of the newly created sport event
     */
    function addSportEvent(
        string memory _teamA,
        string memory _teamB,
        uint          _startTimestamp
    ) 
        public onlyOwner nonReentrant
        returns (bytes32)
    {
        require(
            _startTimestamp >= block.timestamp + 1 days,
            "SportOracle: Time must be >= 1 day from now"
        );

        // Hash key fields of the sport event to get a unique id
        bytes32 eventId = keccak256(abi.encodePacked(_teamA, _teamB, _startTimestamp));

        // Make sure that the sport event is unique and does not exist yet
        require( !eventExists(eventId), "SportOracle: Event already exists");

        // Add the sport event
        events.push( SportEvent(eventId, _teamA, _teamB, _startTimestamp, EventOutcome.Pending, "",""));
        uint newIndex = events.length - 1;
        eventIdToIndex[eventId] = newIndex + 1;

        emit SportEventAdded(
            eventId,
            _teamA,
            _teamB,
            _startTimestamp,
            EventOutcome.Pending,
            "",
            ""
        );

        // Return the unique id of the new sport event
        return eventId;
    }

    /**
     * @notice Returns the array index of the sport event with the given id
     * @dev if the event id is invalid, then the return value will be incorrect 
     * and may cause error; 
     * @param _eventId the sport event id to get
     * @return the array index of this event.
     */
    function _getMatchIndex(bytes32 _eventId)
        private view
        returns (uint)
    {
        //check if the event exists
        require(eventExists(_eventId), "SportOracle: Event does not exist");

        return eventIdToIndex[_eventId] - 1;
    }

    /**
     * @notice Determines whether a sport event exists with the given id
     * @param _eventId the id of a sport event id
     * @return true if sport event exists and its id is valid
     */
    function eventExists(bytes32 _eventId)
        public view override
        returns (bool)
    {
        if (events.length == 0) {
            return false;
        }
        uint index = eventIdToIndex[_eventId];
        return (index > 0);
    }

    /**
     * @notice Sets the outcome of a predefined match, permanently on the blockchain
     * @param _eventId unique id of the match to modify
     * @param _outcome outcome of the match
     * @param _realTeamAScore teamA score for the sport event
     * @param _realTeamBScore teamB score for the sport event
     */
    function declareOutcome(bytes32 _eventId, 
        EventOutcome _outcome, 
        string memory _realTeamAScore, 
        string memory _realTeamBScore)
        onlyOwner external
    {
        // Require that it exists
        require(eventExists(_eventId), "SportOracle: Event does not exist");

        // Get the event
        uint index = _getMatchIndex(_eventId);
        SportEvent storage theMatch = events[index];

        // Set the outcome
        theMatch.outcome = _outcome;
        theMatch.realTeamAScore = _realTeamAScore;
        theMatch.realTeamBScore = _realTeamBScore;    

    }

    /**
     * @notice gets the unique ids of all pending events, in reverse chronological order
     * @return an array of unique pending events ids
     */
    function getPendingEvents()
        public view override
        returns (bytes32[] memory)
    {
        uint count = 0;

        // Get the count of pending events
        for (uint i = 0; i < events.length; i = i + 1) {
            if (events[i].outcome == EventOutcome.Pending)
                count = count + 1;
        }

        // Collect up all the pending events
        bytes32[] memory output = new bytes32[](count);

        if (count > 0) {
            uint index = 0;
            for (uint n = events.length;  n > 0;  n = n - 1) {
                if (events[n - 1].outcome == EventOutcome.Pending) {
                    output[index] = events[n - 1].id;
                    index = index + 1;
                }
            }
        }

        return output;
    }

     
    /**
     * @notice gets the specified sport event and return its data
     * @param _eventId the unique id of the desired event
     * @return id   the id of the event
     * @return teamA the teamA of the event
     * @return teamB a string with the teamA of the event's teamB separated with a pipe symbol ('|')
     * @return startTimestamp when the event takes place
     * @return outcome an integer that represents the event outcome
     * @return realTeamAScore teamA score for the sport event
     * @return realTeamBScore teamA score for the sport event
     */
    function getEvent(bytes32 _eventId)
        public view override
        returns (
            bytes32,
            string memory,
            string memory,
            uint,
            EventOutcome,
            string memory,
            string memory
        )
    {
        // Get the sport event
        SportEvent storage theMatch = events[_getMatchIndex(_eventId)];
        return (theMatch.id, 
        theMatch.teamA, 
        theMatch.teamB, 
        theMatch.startTimestamp, 
        theMatch.outcome,
        theMatch.realTeamAScore,
        theMatch.realTeamBScore);
    }

}