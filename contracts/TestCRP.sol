// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestCRP is ERC20("Test Token","CRP"){
    constructor(){
        _mint(msg.sender, 1000000000000000000000000000);
    }
}