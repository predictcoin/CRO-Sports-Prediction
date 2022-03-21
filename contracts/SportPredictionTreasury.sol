//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IBEP20.sol";
import "./interfaces/ISportPredictionTreasury.sol";
import "./utils/SafeBEP20.sol"; 

// A Smart-contract that holds the sport prediction funds
contract SportPredictionTreasury is Ownable, ISportPredictionTreasury{
    using SafeBEP20 for IBEP20;
    using SafeERC20 for IERC20;

    // BNB contract address
    IBEP20 internal BNB;

    // other ERC20 token address
    IERC20 internal token; 

    // reward multiplier for winner
    uint internal multiplier;

    // Event triggered once an address deposited in the contract
    event Deposit(address indexed user, uint amount);

    // Event triggered once an address withdrawn in the contract
    event Withdraw(address indexed user, uint amount);

    // Event triggered once multiplier is set
    event MultiplierSet(uint multiplier);



    constructor(address _bnb, uint _multiplier){
        BNB = IBEP20(_bnb);
        multiplier = _multiplier;
    }

    function setMultiplier(uint _multiplier)external  onlyOwner
    {
        require(_multiplier > 0, "SportPredictionTreasury: Multiplier should be greater than 0");
        multiplier = _multiplier;
        emit MultiplierSet(_multiplier);
    }

    function getMultiplier()public override view returns(uint)
    {
        return multiplier;
    }

    function deposit(uint _amount) public override{
        require(BNB.balanceOf(msg.sender) > 0,
         "SportPredictionTreasury: user balance should exceed 0");
        BNB.safeTransferFrom(msg.sender, address(this), _amount);
        emit Deposit(msg.sender, _amount);
    }

    function depositToken(address _token, address _from, uint _amount) public override{
        token = IERC20(_token);
        require(token.balanceOf(_from) > _amount, 
        "SportPredictionTreasury: user balance should exceed amount given");
        token.safeTransferFrom(_from, address(this), _amount);
        emit Deposit(msg.sender, _amount); 
    }

    function withdraw(uint _amount) public override{
        BNB.safeTransfer(msg.sender, _amount);
        emit Withdraw(msg.sender, _amount);
    }

    function withdrawToken(address _token, address _to, uint _amount) public override{
        token = IERC20(_token);
        token.safeTransfer(_to, _amount);
        emit Withdraw(_to, _amount);
    }
    
}