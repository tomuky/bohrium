// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BohriumMiningAccount.sol";

contract BohriumMiningAccountFactory {
    mapping(address => address) public userToMiningAccount;
    
    event MiningAccountCreated(address indexed user, address indexed account);
    
    function createMiningAccount() external returns (address) {
        require(userToMiningAccount[msg.sender] == address(0), "Account exists");
        
        BohriumMiningAccount account = new BohriumMiningAccount(msg.sender);
        userToMiningAccount[msg.sender] = address(account);
        
        emit MiningAccountCreated(msg.sender, address(account));
        return address(account);
    }
    
    function getMiningAccount(address user) external view returns (address) {
        return userToMiningAccount[user];
    }
}