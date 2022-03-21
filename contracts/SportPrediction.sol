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
    * @dev Address of the sport events Oracle
    */
    address internal oracleAddress;

    /**
    *  @dev Instance of the sport events Oracle (used to register sport events get their outcome).
    */
    ISportPrediction internal sportOracle;

    /** 
    * @dev Address of the sport prediction treasury
    */
    address internal treasuryAddress;

    /**
    *  @dev Instance of the sport prediction treasury (used to handle sport prediction funds).
    */
    ISportPredictionTreasury internal treasury;

    /** 
    * @dev predicting amount
    */
    uint public predictAmount;

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
        int8    teamAScore;    // user predicted score for teamA
        int8    teamBScore;     // user predicted score for teamB
        bool    predicted;       // check if user predcited
        uint    reward;          // winner's reward
        bool    claimed;        // check if user(winner) claimed his/her reward
        bool    rewarded;       // check if user(winner) withdrawn his/her reward
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
        bool    _predicted,
        uint    _reward,
        bool    _claimed,
        bool    _rewarded
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
    * @dev Emitted when user is claim reward
    */
    event Claim( address user, uint reward);


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
        uint _predictAmount
        )public initializer{
            __Ownable_init();

            oracleAddress = _oracleAddress;
            treasuryAddress = _treasuryAddress;
            sportOracle = ISportPrediction(_oracleAddress);
            treasury = ISportPredictionTreasury(_treasuryAddress);
            crp = _crp;
            predictAmount = _predictAmount;
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
        oracleAddress = _oracleAddress;
        sportOracle = ISportPrediction(oracleAddress);
        emit OracleAddressSet(oracleAddress);
    }

    /**
     * @notice sets the address of the sport prediction treasury contract to use 
     * @param _treasuryAddress the address of the sport prediction treasury
     */
    function setTreasuryAddress(address _treasuryAddress)
        external 
        onlyOwner notAddress0(_treasuryAddress)
    {
        treasuryAddress = _treasuryAddress;
        treasury = ISportPredictionTreasury(treasuryAddress);
        emit TreasuryAddressSet(treasuryAddress);
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
        bytes32[] memory userPredictions = userToPredictions[_user];
        bool isValid;
        if (userPredictions.length > 0) {
            for (uint i = 0; i < userPredictions.length; i = i + 1 ) {
                if (userPredictions[i] == _eventId ) {
                    isValid = false;
                } 

                isValid = false;
            }
        }
        return true;
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
        require(_predictIsValid(msg.sender, _eventId), "SportPrediction: User can only predict once");
      

        // add new prediction
        uint _amount = predictAmount;
        treasury.depositToken(crp, msg.sender, _amount);
        Prediction[] storage prediction = eventToPredictions[_eventId]; 
        prediction.push( Prediction(
            msg.sender, _eventId, _amount, _teamAScore, _teamBScore, true, 0,false,false)); 

        // add the mapping
        bytes32[] storage userPredictions = userToPredictions[msg.sender]; 
        userPredictions.push(_eventId);

        emit PredictionPlaced(
            _eventId,
            msg.sender,    
            _teamAScore,
            _teamBScore, 
            _amount,
            true,
            0,
            false,
            false
        );
    }


    /**
     * @notice get the user predictions on events 
     * @param _user  user who made the prediction 
     * @param _eventIds id of the predicted events
     * @return  bool return array of predicted events
     */
    function getUserPredictions(address _user, bytes32[] memory _eventIds)
        public
        view returns(Prediction[] memory)
    {
        Prediction[] memory output = 
            new Prediction[](_eventIds.length);

        if(_eventIds.length > 0){
            uint index = 0;
            for (uint i = 0;  i < _eventIds.length;  i = i + 1) {
                Prediction[] memory predictions = eventToPredictions[_eventIds[i]];
                Prediction memory userPrediction;

                // Get the count of predictions
                for (uint n = 0; n < predictions.length; n = n + 1) {
                    if (predictions[n].user == _user){
                        userPrediction = predictions[n];
                        break;
                    } 
                }
                output[index] = userPrediction;
                index = index + 1;
            }
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
        uint index = 0;
        
        for (uint i = 0; i < _eventIds.length; i = i + 1 ) {
            ISportPrediction.SportEvent[] memory events =  sportOracle.getEvents(_eventIds);
            Prediction[] memory userPredictions = getUserPredictions(_user,_eventIds);
            // Require that event id exists
            require(sportOracle.eventExists(_eventIds[i]), "SportPrediction: Event does not exist"); 
            // Require that the event is decided
            require(events[i].outcome == 
            ISportPrediction.EventOutcome.Decided, "SportPrediction: Event status not decided");
            // Make sure user predict in specified event
            require(userPredictions[i].predicted,"SportPrediction: User does not predict on this event");

            if((userPredictions[i].teamAScore == events[i].realTeamAScore)
                && (userPredictions[i].teamBScore == events[i].realTeamBScore)){
                
                output[index] = true;
                index = index + 1;
            } else{
                output[index] = false;
                index = index + 1;
            }

        }

        return output;
    }


    function claim(bytes32 _eventId)
        external
    {
        bytes32[] memory eventArr = new bytes32[](1); 
        eventArr[0] = _eventId;

        require(userPredictStatus(msg.sender,eventArr)[0],
        "SportPrediction: Only Winner can claim reward");

        uint index;

        Prediction[] storage predictions = eventToPredictions[_eventId];

        // Get the count of predictions
        for (uint n = 0; n < predictions.length; n = n + 1) {
            if (predictions[n].user == msg.sender){
                index = n;
                break;
            } 
        }

        Prediction storage userPrediction = predictions[index];
        userPrediction.claimed = true;
        userPrediction.reward = predictAmount.mul(treasury.getMultiplier());

        emit Claim(msg.sender, predictAmount);

    } 

    function withdrawReward(bytes32 _eventId)
        external 
        nonReentrant
    {
        bytes32[] memory eventArr = new bytes32[](1); 
        eventArr[0] = _eventId;

        // Require that event id exists
        require(sportOracle.eventExists(_eventId), "SportPrediction: Event does not exist");

        uint index;

        Prediction[] storage predictions = eventToPredictions[_eventId];

        // Get the count of predictions
        for (uint n = 0; n < predictions.length; n = n + 1) {
            if (predictions[n].user == msg.sender){
                index = n;
                break;
            } 
        }

        Prediction storage userPrediction = predictions[index];

        // require that winner haven't withdraw reward
        require(!userPrediction.rewarded,
        "SportPrediction: Only winner that heven't withdraw reward is allow");

        // require that winner have claimed reward
        require(userPrediction.claimed,
        "SportPrediction: Only winner that claimed reward is allow");

        userPrediction.rewarded = true;
        uint amount = userPrediction.reward;
        treasury.withdrawToken(crp, msg.sender, amount);
    }

}