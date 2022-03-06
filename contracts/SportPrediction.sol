// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/ISportPrediction.sol";
import "hardhat/console.sol";

/** 
 * This smart-contract takes predictions placed on sport events.
 * Then once the event outcome is confirmed,
 * it makes the earnings ready for the winners 
 * to claim
 * @notice Takes predictions and handles payouts for sport events
 * @title  a Smart-Contract in charge of handling predictions on a sport events.
 */
contract SportPrediction is Ownable, ReentrancyGuard {

    /** 
    * @dev Address of the sport events Oracle
    */
    address internal oracleAddress;

    /**
    *  @dev Instance of the sport events Oracle (used to register sport events get their outcome).
    */
    ISportPrediction internal sportOracle;

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


    /**
     * @dev Triggered when once a prediction is placed
     */
    event PredictionPlaced(
        bytes32 _eventId,
        address _player,
        string  _teamAScore,
        string  _teamBScore, 
        uint    _amount
    );

    /**
    * @dev Sent once the Sport Event Oracle is set
    */
    event OracleAddressSet( address _address);

    /**
     * @dev check that the passed in address is not 0. 
     */
    modifier notAddress0(address _address) {
        require(_address != address(0), "Address 0 is not allowed");
        _;
    }

    /**
     * @notice sets the address of the sport event oracle contract to use 
     * @dev setting a wrong address may result in false return value, or error 
     * @param _oracleAddress the address of the sport event oracle 
     */
    function setOracleAddress(address _oracleAddress)
        external 
        onlyOwner notAddress0(_oracleAddress)
    {
        oracleAddress = _oracleAddress;
        sportOracle = ISportPrediction(oracleAddress);
        emit OracleAddressSet(oracleAddress);
    }

    /**
    * @notice gets a list ids of all currently predictable events
    * @return pendingEvents the list of pending sport events 
    */
    function getPredictableEvents()
        public view returns (bytes32[] memory pendingEvents)
    {
        return sportOracle.getPendingEvents(); 
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
        public view returns (
            bytes32,
            string memory,
            string memory,
            uint,
            ISportPrediction.EventOutcome,
            string memory,
            string memory
        )
    {
        return sportOracle.getEvent(_eventId);
    }

    /**
     * @notice predict on the given event 
     * @param _eventId      id of the sport event on which to bet 
     * @param _teamAScore the predicted score of teamA
     * @param _teamBScore the predicted score of teamB
     */
    function predict(
        bytes32 _eventId, 
        uint _amount, 
        string memory _teamAScore, 
        string memory _teamBScore)
        public
        notAddress0(msg.sender) 
        nonReentrant
    {

        // Make sure this sport event exists 
        require(sportOracle.eventExists(_eventId), "Specified event not found"); 

        // add the new prediction
        Prediction[] storage prediction = eventToPredictions[_eventId]; 
        prediction.push( Prediction(msg.sender, _eventId, _amount, _teamAScore, _teamBScore)); 

        // add the mapping
        bytes32[] storage userPredictions = userToPredictions[msg.sender]; 
        userPredictions.push(_eventId);

        emit PredictionPlaced(
            _eventId,
            msg.sender,    
            _teamAScore,
            _teamBScore, 
            _amount     
        );
    }

    /**
     * @notice check the users status on an event if he win or loss 
     * @param _user  user who made the prediction 
     * @param _eventId id of the predicted event
     * @return  bool return true if user win and false when loss
     */
    function userPredictStatus(
        address _user, 
        bytes32 _eventId)
        public
        notAddress0(_user)
        view returns(bool)
    {

        // Require that it exists
        require(sportOracle.eventExists(_eventId));

        ( 
            bytes32       id,
            string memory teamA,
            string memory teamB,
            uint          startTimestamp,
            ISportPrediction.EventOutcome  outcome,
            string memory realTeamAScore,
            string memory realTeamBScore
        ) = getEvent(_eventId);

        Prediction[] memory predictions = eventToPredictions[_eventId];

        Prediction memory userPrediction;

        // Get the count of predictions
        for (uint i = 0; i < predictions.length; i = i + 1) {
            if (predictions[i].user == _user)
                userPrediction = predictions[i]; 
        }

        if((keccak256(bytes(userPrediction.teamAScore))
            == keccak256(bytes(realTeamAScore)))
            && (keccak256(bytes(userPrediction.teamBScore))
            == keccak256(bytes(realTeamBScore)))){
                return true;
        }

        return false;
    }

}