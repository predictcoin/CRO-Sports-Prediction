// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/ISportPrediction.sol";
import "hardhat/console.sol";


/**
 * @title A smart-contract Oracle that register sport events, retrieve their outcomes and 
 * communicate their results when asked for.
 * @notice Collects and provides information on sport events and their outcomes
 */
contract SportOracle is ISportPrediction, Initializable, UUPSUpgradeable, OwnableUpgradeable {
   
    /** 
    * @dev Address of the admin
    */
     address public adminAddress;

    /**
    * @dev all the sport events
    */
    ISportPrediction.SportEvent[] private events;

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
        uint         _endTimestamp,
        EventOutcome _eventOutcome,
        int8         _realTeamAScore,
        int8         _realTeamBScore
    );

    /**
    * @dev Emitted when the Admin Address is set
    */
    event AdminAddressSet( address _address);


    /**
     * @dev check that the address passed is not 0. 
     */
    modifier onlyAdmin() {
        require(msg.sender == adminAddress , "SportOracle: Not an Admin");
        _;
    }

    /**
     * @dev check that the address passed is not 0. 
     */
    modifier notAddress0(address _address) {
        require(_address != address(0), "SportPrediction: Address 0 is not allowed");
        _;
    }


    /**
     * @notice Contract constructor
     */
    function initialize(address _adminAddress)public initializer{
        __Ownable_init();
        adminAddress = _adminAddress;
    }


    /**
     * @notice Authorizes upgrade allowed to only proxy 
     * @param newImplementation the address of the new implementation contract 
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner{}

    /**
     * @notice sets the adminaddress
     * @param _adminAddress the address of the sport event oracle 
     */
    function setAdminAddress(address _adminAddress)
        external 
        onlyOwner notAddress0(_adminAddress)
    {
        adminAddress = _adminAddress;
        emit AdminAddressSet(adminAddress);
    }

    /**
     * @notice Add a new pending sport event into the blockchain
     * @param _teamA descriptive teamA for the sport event
     * @param _teamB descriptive teamB for the sport event
     * @param _startTimestamp _startTimestamp set for the sport event
     * @param _endTimestamp _endTimestamp set for the sport event
     * @return eventId unique id of the newly created sport event
     */
    function addSportEvent(
        string memory _teamA,
        string memory _teamB,
        uint          _startTimestamp,
        uint          _endTimestamp
    ) 
        public onlyAdmin returns (bytes32)
    {
        require(
            _startTimestamp >= block.timestamp + 12 hours,
            "SportOracle: Time must be >= 12 hours from now"
        );

        // Hash key fields of the sport event to get a unique id
        bytes32 eventId = keccak256(abi.encodePacked(
            _teamA,
            _teamB,
            _startTimestamp,
            _endTimestamp
        ));

        // Make sure that the sport event is unique and does not exist yet
        require( !eventExists(eventId)  , "SportOracle: Event already exists");

        // Add the sport event
        events.push( ISportPrediction.SportEvent(
            eventId, 
            _teamA, 
            _teamB, 
            _startTimestamp,
            _endTimestamp, 
            EventOutcome.Pending, 
            -1, -1
        ));
        uint newIndex = events.length - 1;
        eventIdToIndex[eventId] = newIndex + 1;

        emit SportEventAdded(
            eventId,
            _teamA,
            _teamB,
            _startTimestamp,
            _endTimestamp,
            EventOutcome.Pending,
            -1,
            -1
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
        int8 _realTeamAScore, 
        int8 _realTeamBScore)
        onlyAdmin external
    {
        // Require that it exists
        require(eventExists(_eventId), "SportOracle: Event does not exist");

        // Get the event
        uint index = _getMatchIndex(_eventId);
        ISportPrediction.SportEvent storage theMatch = events[index];

        // Set the outcome
        theMatch.outcome = _outcome;
        theMatch.realTeamAScore = _realTeamAScore;
        theMatch.realTeamBScore = _realTeamBScore;    

    }

    /**
     * @notice gets the unique ids of all pending events, in reverse chronological order
     * @return output array of unique pending events ids
     */
    function getPendingEvents()
        public view override
        returns (ISportPrediction.SportEvent[] memory)
    {
        uint count = 0;

        // Get the count of pending events
        for (uint i = 0; i < events.length; i = i + 1) {
            if (events[i].outcome == EventOutcome.Pending)
                count = count + 1;
        }

        // Collect up all the pending events
        ISportPrediction.SportEvent[] memory output = 
            new ISportPrediction.SportEvent[](count);

        if (count > 0) {
            uint index = 0;
            for (uint n = events.length;  n > 0;  n = n - 1) {
                if (events[n - 1].outcome == EventOutcome.Pending) {
                    output[index] = events[n - 1];
                    index = index + 1;
                }
            }
        }

        return output;
    }

     
    /**
     * @notice gets the specified sport event and return its data
     * @param indexes array of event index 
     * @return array of all events
     */
    function getIndexedEvents(uint[] memory indexes)
        public view override
        returns (ISportPrediction.SportEvent[] memory)
    {   
        uint count = indexes.length; 
        ISportPrediction.SportEvent[] memory output = 
            new ISportPrediction.SportEvent[](count);

        if(count > 0){
            uint index = 0;
            for (uint n = 0;  n < count;  n = n + 1) {
                output[index] = events[indexes[n]];
                index = index + 1;
            }
        }
        
        return output;
    }

    /**
     * @notice gets the specified sport event and return its data
     * @param eventIds array of event index 
     * @return array of all events
     */
    function getEvents(bytes32[] memory eventIds)
        public view override
        returns (ISportPrediction.SportEvent[] memory)
    {  
        uint count = eventIds.length; 
        ISportPrediction.SportEvent[] memory output = 
            new ISportPrediction.SportEvent[](count);

        if(count > 0){
            uint index = 0;
            for (uint n = 0;  n < count;  n = n + 1) {
                uint eventIndex = _getMatchIndex(eventIds[n]);
                output[index] = events[eventIndex];
                index = index + 1;
            }
        }
        
        return output;
    }


    /**
     * @notice gets the specified sport event and return its data
     * @param cursor index start from in events array 
     * @param length length of events array to return
     * @return array of all events
     */
    function getAllEvents(uint cursor, uint length) 
        public view override 
        returns (SportEvent[] memory)
    {
        ISportPrediction.SportEvent[] memory output = 
            new ISportPrediction.SportEvent[](length);

        if(length > 0){
            uint index = 0;
            for (uint n = cursor;  n < length;  n = n + 1) {
                output[index] = events[n];
                index = index + 1;
            }
        }
        
        return output;
    }

}