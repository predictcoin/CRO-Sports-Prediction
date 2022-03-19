//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./BEP20.sol";

contract BNB is BEP20("CRO Prediction","BNB"){
    constructor(){
        _mint(msg.sender, 1000000000000000000000000000);
    }
}