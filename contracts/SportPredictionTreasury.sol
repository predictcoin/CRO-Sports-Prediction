//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ISportPredictionTreasury.sol";

// A Smart-contract that holds the sport prediction funds
contract SportPredictionTreasury is AccessControl, ISportPredictionTreasury{
    using SafeERC20 for IERC20;

    // other ERC20 token address
    IERC20 internal token; 

    //sport prediction address
    address internal sportPrediction;

    // Event triggered once an address deposited in the contract
    event Deposit(address indexed user, uint amount);

    // Event triggered once an address withdrawn in the contract
    event Withdraw(address indexed user, uint amount);

    // Emitted when sport prediction address is set
    event SportPredictionSet( address _address);

    // Restricted to authorised accounts.
    modifier onlyAuthorized() {
        require(isAuthorized(msg.sender), 
        "SportPredictionTreasury:Restricted to only authorized accounts.");
        _;
    }


    constructor(){
        _setupRole("deployer", msg.sender); 
        _revokeRole("sportPrediction", sportPrediction);
    }


    function isAuthorized(address account)
        public view returns (bool)
    {
        if(hasRole("deployer",account)) return true;

        else if(hasRole("sportPrediction", account)) return true;

        return false;
    }

    function setSportPredictionAddress(address _address)
        external 
        onlyRole("deployer")
    {
        sportPrediction = _address;
        _grantRole("sportPrediction", sportPrediction);
        emit SportPredictionSet(_address);
    }

    /**
     * @notice deposit bnb
     */
    function deposit() public override payable{
        require(msg.value != 0, 
        "SportPredictionTreasury: Deposit Amount should be > than 0");
        emit Deposit(msg.sender, msg.value);
    }


    /**
     * @notice deposit other token
     * @param _token the token address
     * @param _from the sender address
     * @param _amount the deposited amount
     */
    function depositToken(address _token, address _from, uint _amount) public override{
        token = IERC20(_token);
        require(token.balanceOf(_from) > _amount, 
        "SportPredictionTreasury: user balance should exceed amount given");
        token.safeTransferFrom(_from, address(this), _amount);
        emit Deposit(msg.sender, _amount); 
    }


    /**
     * @notice withdraw bnb
     * @param _amount the withdrawal amount
     */
    function withdraw(uint _amount) public override onlyRole("deployer"){
        payable(msg.sender).transfer(_amount);
        emit Withdraw(msg.sender, _amount);
    }

    /**
     * @notice withdraw other token
     * @param _token the token address
     * @param _to the spender address
     * @param _amount the deposited amount
     */
    function withdrawToken(address _token, address _to, uint _amount) 
        public 
        override
        onlyAuthorized{
        token = IERC20(_token);
        token.safeTransfer(_to, _amount);
        emit Withdraw(_to, _amount);
    }
    
}