// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IBohriumMining {
    function submitNonce(uint256 nonce) external;
}

contract BohriumMiningAccount {
    struct SessionKey {
        bool isValid;
        uint256 expiry;
        uint256 lastUsed;
    }
    
    address public immutable owner;
    mapping(address => SessionKey) public sessionKeys;
    
    event SessionKeySet(address indexed key, uint256 expiry);
    event SessionKeyRevoked(address indexed key);
    event ETHReceived(address indexed from, uint256 amount);
    
    constructor(address _owner) {
        owner = _owner;
    }
    
    // Add receive function to accept ETH
    receive() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }
    
    // Add fallback function as well
    fallback() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    function setSessionKey(address key, uint256 duration) external onlyOwner {
        require(duration <= 30 days, "Max duration 30 days");
        sessionKeys[key] = SessionKey({
            isValid: true,
            expiry: block.timestamp + duration,
            lastUsed: block.timestamp
        });
        emit SessionKeySet(key, block.timestamp + duration);
    }
    
    function revokeSessionKey(address key) external onlyOwner {
        delete sessionKeys[key];
        emit SessionKeyRevoked(key);
    }
    
    function submitNonce(address miningContract, uint256 nonce) external {
        bool isAuthorized = msg.sender == owner;
        
        if (!isAuthorized) {
            SessionKey storage key = sessionKeys[msg.sender];
            isAuthorized = key.isValid && block.timestamp < key.expiry;
            if (isAuthorized) {
                key.lastUsed = block.timestamp;
            }
        }
        
        require(isAuthorized, "Unauthorized");
        IBohriumMining(miningContract).submitNonce(nonce);
    }
    
    // Allow owner to withdraw ETH
    function withdrawETH(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        (bool success, ) = owner.call{value: amount}("");
        require(success, "ETH transfer failed");
    }
    
    // Allow owner to withdraw tokens
    function withdrawToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner, amount);
    }
}
