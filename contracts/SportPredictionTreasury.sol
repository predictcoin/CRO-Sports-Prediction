//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ISportPredictionTreasury.sol";

// A Smart-contract that holds the sport prediction funds
contract SportPredictionTreasury is AccessControl, ISportPredictionTreasury{
    using SafeERC20 for IERC20;

    //sport prediction address
    address public sportPrediction;

    // Event triggered once an address withdraws from the contract
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
    }


    /**
     * @notice check if address is authorized 
     * @param account the address of account to be checked
     * @return bool return true if account is authorized and false otherwise
     */
    function isAuthorized(address account)
        public view returns (bool)
    {
        if(hasRole("deployer",account)) return true;

        else if(hasRole("sportPrediction", account)) return true;

        return false;
    }


    /**
     * @notice sets the address of the sport prediction contract to use 
     * @param _address the address of the sport prediction contracts
     */
    function setSportPredictionAddress(address _address)
        external 
        onlyRole("deployer")
    {

        _revokeRole("sportPrediction", sportPrediction);
        sportPrediction = _address;
        _grantRole("sportPrediction", sportPrediction);
        emit SportPredictionSet(_address);
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
        IERC20(_token).safeTransfer(_to, _amount);
        emit Withdraw(_to, _amount);
    }

    receive () external payable{
        
    }
    
}