// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./interfaces/ISportPrediction.sol";
import "./interfaces/ISportPredictionTreasury.sol";
import "hardhat/console.sol";

/** 
 * This smart-contract takes predictions placed on sport events.
 * Then once the event outcome is confirmed,
 * it makes the earnings ready for the winners 
 * to claim
 * @notice Takes predictions and handles payouts for sport events
 * @title  a Smart-Contract in charge of handling predictions on a sport events.
 */
contract SportPrediction is 
    Initializable, 
    UUPSUpgradeable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable{

    using SafeMathUpgradeable for uint;

    address internal crp;

    /**
    *  @dev Instance of the sport events Oracle (used to register sport events get their outcome).
    */
    ISportPrediction public sportOracle;


    /**
    *  @dev Instance of the sport prediction treasury (used to handle sport prediction funds).
    */
    ISportPredictionTreasury public treasury;

    /** 
    * @dev predicting amount
    */
    uint public predictAmount;

    /** 
    * @dev reward multiplier for winner
    */
    uint internal multiplier;

    /**
     *  @dev for any given event, get the prediction that have been made by a user for that event
     *  map composed of (event id => address of user => prediction ) pairs
     */
    mapping(bytes32 => mapping(address => Prediction)) private eventToPrediction;


    /**
     * @dev list of all predictions per player,
     * ie. a map composed (player address => predictions) pairs
     */
    mapping(address => Prediction[]) private userToPredictions;

     /**
     * @dev payload of a prediction on a sport event
     */
    struct Prediction {
        address user;          // who placed it
        bytes32 eventId;       // id of the sport event as registered in the Oracle
        uint    amount;        // prediction amount
        uint    reward;        // user reward
        int8    teamAScore;    // user predicted score for teamA
        int8    teamBScore;     // user predicted score for teamB
        bool    predicted;       // check if user predcited  
        bool    claimed;        // check if user(winner) claimed his/her reward
    }


    /**
     * @dev Emitted when a prediction is placed
     */
    event PredictionPlaced(
        bytes32 _eventId,
        address _player,
        int8    _teamAScore,
        int8    _teamBScore, 
        uint    _amount,
        uint    _reward,
        bool    _predicted,
        bool    _claimed
    );

    /**
    * @dev Emitted when the Sport Event Oracle is set
    */
    event OracleAddressSet( address _address);

    /**
    * @dev Emitted when prediction amount is set
    */
    event PredictAmountSet( uint _address);

    /**
    * @dev Emitted when the sport prediction treasury is set
    */
    event TreasuryAddressSet(address _address);

    /**
    * @dev Emitted when user claims reward
    */
    event Claim( address user, uint reward);

    /**
    * @dev Emitted once multiplier is 
    */
    event MultiplierSet(uint multiplier);


    /**
     * @dev check that the address passed is not 0. 
     */
    modifier notAddress0(address _address) {
        require(_address != address(0), "SportPrediction: Address 0 is not allowed");
        _;
    }

    
    /**
     * @notice Contract constructor
     * @param _oracleAddress oracle contract address
     * @param _treasuryAddress treasury contract address
     * @param _crp CRP token address
     * @param _predictAmount predict amount
     */
    function initialize(
        address _oracleAddress,
        address _treasuryAddress,
        address _crp,
        uint _predictAmount,
        uint _multiplier
        )public initializer{
            __Ownable_init();

            sportOracle = ISportPrediction(_oracleAddress);
            treasury = ISportPredictionTreasury(_treasuryAddress);
            crp = _crp;
            predictAmount = _predictAmount;
            multiplier = _multiplier;
    }

    /**
     * @notice Authorizes upgrade allowed to only proxy 
     * @param newImplementation the address of the new implementation contract 
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner{}

    /**
     * @notice sets the address of the sport event oracle contract to use 
     * @dev setting a wrong address may result in false return value, or error 
     * @param _oracleAddress the address of the sport event oracle 
     */
    function setOracleAddress(address _oracleAddress)
        external 
        onlyOwner notAddress0(_oracleAddress)
    {
        sportOracle = ISportPrediction(_oracleAddress);
        emit OracleAddressSet(_oracleAddress);
    }

    /**
     * @notice sets the address of the sport prediction treasury contract to use 
     * @param _treasuryAddress the address of the sport prediction treasury
     */
    function setTreasuryAddress(address _treasuryAddress)
        external 
        onlyOwner notAddress0(_treasuryAddress)
    {
        treasury = ISportPredictionTreasury(_treasuryAddress);
        emit TreasuryAddressSet(_treasuryAddress);
    }


    /**
     * @notice sets the prediction amount 
     * @param _predictAmount the prediction amount 
     */
    function setPredictAmount(uint _predictAmount)
        external onlyOwner
    {
        require(_predictAmount > 0, "SportPrediction: Predict Amount should be greater than 0");
        predictAmount = _predictAmount;
        emit PredictAmountSet(_predictAmount);
    }


    /**
     * @notice set the reward multiplier
     * @param _multiplier the reward multiplier
     */
    function setMultiplier(uint _multiplier)external  onlyOwner
    {
        require(_multiplier > 0, "SportPredictionTreasury: Multiplier should be greater than 0");
        multiplier = _multiplier;
        emit MultiplierSet(_multiplier);
    }


    /**
     * @notice get the reward multiplier
     * @return _multiplier reward multiplier
     */
    function getMultiplier()private view returns(uint)
    {
        return multiplier;
    }

    /**
    * @notice gets a list of all currently predictable events
    * @return pendingEvents the list of pending sport events 
    */
    function getPredictableEvents()
        public view returns (ISportPrediction.SportEvent[] memory)
    {
        return sportOracle.getPendingEvents(); 
    }

    /**
     * @notice determines whether or not the user has already predict on the given sport event
     * @param _user address of a player
     * @param _eventId id of a event 
     * @return bool true if user predicted and false if not predicted
     */
    function _predictIsValid(address _user, bytes32 _eventId)
        private view returns (bool)
    {
        // Make sure this sport event exists 
        require(sportOracle.eventExists(_eventId), "SportPrediction: Specified event not found");

        Prediction memory userPrediction = eventToPrediction[_eventId][_user];
        
        return userPrediction.predicted;
    }

    /**
     * @notice predict on the given event 
     * @param _eventId      id of the sport event on which to bet 
     * @param _teamAScore the predicted score of teamA
     * @param _teamBScore the predicted score of teamB
     */
    function predict(
        bytes32 _eventId,
        int8 _teamAScore, 
        int8 _teamBScore)
        public nonReentrant
    {

        // Make sure this sport event exists 
        require(sportOracle.eventExists(_eventId), "SportPrediction: Specified event not found");
        // Make sure user predict once
        require(!_predictIsValid(msg.sender, _eventId), "SportPrediction: User can only predict once");
      

        // add new prediction
        treasury.depositToken(crp, msg.sender, predictAmount);

        eventToPrediction[_eventId][msg.sender] = 
            Prediction(
                msg.sender,
                _eventId,
                predictAmount,
                0,
                _teamAScore,
                _teamBScore,
                true,
                false) ;

        Prediction[] storage userPredictions = userToPredictions[msg.sender]; 
        userPredictions.push(eventToPrediction[_eventId][msg.sender]);

        emit PredictionPlaced(
            _eventId,
            msg.sender,    
            _teamAScore,
            _teamBScore, 
            predictAmount,
            0,
            true,
            false
        );
    }


    /**
     * @notice get the user predictions on events 
     * @param _user  user who made the prediction
     * @return  bool return array of predicted events
     */
    function getUserPredictions(address _user,bytes32[] memory _eventIds)
        public
        view returns(Prediction[] memory)
    {
        Prediction[] memory output = new Prediction[](_eventIds.length);
        
        for (uint i = 0; i < _eventIds.length; i = i + 1 ) {
            // Require that event id exists
            require(sportOracle.eventExists(_eventIds[i]), "SportPrediction: Event does not exist"); 
            output[i] = eventToPrediction[_eventIds[i]][_user];
            
        }

        return output;

    }


    /**
     * @notice get the users status on an event if he win or loss 
     * @param _user  user who made the prediction 
     * @param _eventIds id of the predicted events
     * @return  bool return true if user win and false when loss
     */
    function userPredictStatus(
        address _user, 
        bytes32[] memory _eventIds)
        public
        view returns(bool[] memory)
    {
        bool[] memory output = new bool[](_eventIds.length);
        ISportPrediction.SportEvent[] memory events =  sportOracle.getEvents(_eventIds);
        
        for (uint i = 0; i < _eventIds.length; i = i + 1 ) {

            // Require that event id exists
            require(sportOracle.eventExists(_eventIds[i]), "SportPrediction: Event does not exist"); 
            // Require that the event is decided
            require(events[i].outcome == 
            ISportPrediction.EventOutcome.Decided, "SportPrediction: Event status not decided");

            Prediction memory userPrediction = eventToPrediction[_eventIds[i]][_user];
            
            if((userPrediction.teamAScore == events[i].realTeamAScore)
                && (userPrediction.teamBScore == events[i].realTeamBScore)){
                
                output[i] = true;
            } else{
                output[i] = false;
            }

        }

        return output;
    }


    /**
     * @notice claim reward
     * @param _eventId id of specified event
     */
    function claim(bytes32 _eventId)
        external nonReentrant
    {
        bytes32[] memory eventArr = new bytes32[](1); 
        eventArr[0] = _eventId;

        require(userPredictStatus(msg.sender, eventArr)[0],
        "SportPrediction: Only Winner can claim reward");
        require(!eventToPrediction[_eventId][msg.sender].claimed,
        "SportPrediction: Only winner that doesn't claim reward is allow");

        
        Prediction storage userPrediction = eventToPrediction[_eventId][msg.sender];
        userPrediction.claimed = true;
        userPrediction.reward = predictAmount.mul(getMultiplier());
        treasury.withdrawToken(crp, msg.sender, userPrediction.reward);

        emit Claim(msg.sender, predictAmount);

    } 

}