//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title the interface for the sport prediction treasury
/// @notice Declares the functions that the `SportPredictionTreasury` contract exposes externally
interface ISportPredictionTreasury {
    

    // deposit bnb token
    function deposit(uint _amount)external;

    // deposit other token
    function depositToken(address _token, uint _amount)external;
    
    // withdraw bnb token
    function withdraw(uint _amount)external;

    // withdraw other token
    function withdrawToken(address _token, uint _amount)external;

    // get reward multiplier
    function getMultiplier()external returns(uint);
}

