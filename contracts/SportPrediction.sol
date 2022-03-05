// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ISportOracle.sol";
import "hardhat/console.sol";

/** 
 * This smart-contract takes predictions placed on sport events.
 * Then once the event outcome is confirmed,
 * it makes the earnings ready for the winners 
 * to claim
 * @notice Takes predictions and handles payouts for sport events
 * @title  a Smart-Contract in charge of handling predictions on a sport events.
 */
contract SportPrediction is ISportOracle, Ownable, ReentrancyGuard {

    
    /**
    * @dev An instance of ERC20 CRP Token
    */
    IERC20 private crp;
    
    /**
    * @dev minimum prediction amount 
    */
    uint internal minimumPredictAmount = 0.1 ether;

    /**
    * @dev all the sport events
    */
    SportEvent[] private events;

    /*
    * @dev map of composed {eventId (SHA3 of event key infos) => eventIndex (in events)} pairs
    */
    mapping(bytes32 => uint) private eventIdToIndex;

    /** 
     * @dev list of all predictions per player,
     * ie. a map composed (player address => predict id) pairs
     */
    mapping(address => bytes32[]) private userToPredictions;

    /**
     *  @dev for any given event, get a list of all predictions that have been made for that event
     *  map composed of (event id => array of predictions) pairs
     */
    mapping(bytes32 => Prediction[]) private eventToPredictions;

    /**
     * @dev payload of a prediction on a sport event
     */
    struct Prediction {
        address user;          // who placed it
        bytes32 eventId;       // id of the sport event as registered in the Oracle
        uint    amount;        // prediction amount
        string  teamAScore;    // user predicted score for teamA
        string  teamBScore;     // user predicted score for teamB
    }

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
     * @dev Sent when once a prediction is placed
     */
    event PredictionPlaced(
            bytes32 _eventId,
            address _player,
            string  _teamAScore,
            string  _teamBScore, 
            uint    _amount
    );

    /**
     * @dev check that the passed in address is not 0. 
     */
    modifier notAddress0(address _address) {
        require(_address != address(0), "Address 0 is not allowed");
        _;
    }


    /**
     * @param _tokenAddress the address of the deployed ERC20 CRP token 
     */
     constructor(address _tokenAddress)
        notAddress0(_tokenAddress)
     {
        crp = IERC20(_tokenAddress);
    }


      /**
      * @notice Moves `_amount` tokens from `_sender` to this contract
      * @param _sender the address that owns the tokens
      * @param _amount the amount to be deposited
      */
      function deposit(address _sender, uint _amount)
            external 
            notAddress0(_sender) 
    {
        // At least a minimum amount is required to be deposited
        require(_amount >= 10, "Amount deposited must be >= 10");
        crp.transferFrom(_sender, address(this), _amount);
    }

    /**
      * @notice Sets `_amount` as the allowance of `_spender` over the caller's tokens.
      * @param _spender an address allowed to spend user's CRP
      * @param _amount the amount approved to be used by _spender
      */
      function approve(address _spender, uint _amount)
         external 
         notAddress0(_spender) 
    {
        crp.approve(_spender, _amount);
    }

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
            _startTimestamp >= block.timestamp + 1 weeks,
            "time must be >= 1 week from now"
        );

        // Hash key fields of the sport event to get a unique id
        bytes32 eventId = keccak256(abi.encodePacked(_teamA, _teamB, _startTimestamp));

        // Make sure that the sport event is unique and does not exist yet
        require( !eventExists(eventId), "Event already exists");

        // Add the sport event
        events.push( SportEvent(eventId, _teamA, _teamB, _startTimestamp, EventOutcome.Pending, "",""));
        uint newIndex           = events.length - 1;
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
     * @return the array index of this event if it exists or else -1
     */
    function _getMatchIndex(bytes32 _eventId)
        private view
        returns (uint)
    {
        return eventIdToIndex[_eventId] - 1;
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
        onlyOwner private
    {
        // Require that it exists
        require(eventExists(_eventId),"Specified event doesn't exists");

        // Get the event
        uint index = _getMatchIndex(_eventId);
        SportEvent storage theMatch = events[index];

        // Set the outcome
        theMatch.outcome = _outcome;
        theMatch.realTeamAScore = _realTeamAScore;
        theMatch.realTeamBScore = _realTeamBScore;    

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
     * @notice gets the unique ids of all pending events, in reverse chronological order
     * @return an array of unique pending events ids
     */
    function getPredictableEvents()
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
            bytes32       id,
            string memory teamA,
            string memory teamB,
            uint          startTimestamp,
            EventOutcome  outcome,
            string memory realTeamAScore,
            string memory realTeamBScore
        )
    {
        // Get the sport event
        if (eventExists(_eventId)) {
            SportEvent storage theMatch = events[_getMatchIndex(_eventId)];
            return (theMatch.id, 
            theMatch.teamA, 
            theMatch.teamB, 
            theMatch.startTimestamp, 
            theMatch.outcome,
            theMatch.realTeamAScore,
            theMatch.realTeamBScore);
        }
        else {
            revert("not found");
        }
    }


    /**
     * @notice predict on the given event 
     * @param _eventId      id of the sport event on which to bet 
     * @param _teamAScore the predicted score of teamA
     * @param _teamBScore the predicted score of teamB
     */
    function predict(bytes32 _eventId, string memory _teamAScore, string memory _teamBScore) 
        public payable
        notAddress0(msg.sender) 
        nonReentrant
    {
        // At least a minimum amout is required to predict
        require(msg.value >= minimumPredictAmount, "predict amount not up to minimum");

        // Make sure this sport event exists 
        require(eventExists(_eventId), "Specified event not found"); 

        // add the new prediction
        Prediction[] storage prediction = eventToPredictions[_eventId]; 
        prediction.push( Prediction(msg.sender, _eventId, msg.value, _teamAScore, _teamBScore)); 

        // add the mapping
        bytes32[] storage userPredictions = userToPredictions[msg.sender]; 
        userPredictions.push(_eventId);

        emit PredictionPlaced(
            _eventId,
            msg.sender,    
            _teamAScore,
            _teamBScore, 
            msg.value     
        );
    }

}