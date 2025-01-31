// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IBohriumMining {
    function submitNonce(uint256 nonce) external;
    function endRound() external;
}

contract BohriumMiningAccount {
    struct SessionKey {
        bool isValid;
        uint256 expiry;
        uint256 lastUsed;
        uint256 gasLimit;  // Maximum gas allowed per transaction
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
            lastUsed: block.timestamp,
            gasLimit: 500000  // Add default gas limit
        });
        emit SessionKeySet(key, block.timestamp + duration);
    }
    
    function revokeSessionKey(address key) external onlyOwner {
        delete sessionKeys[key];
        emit SessionKeyRevoked(key);
    }
    
    function setSessionKeyWithGasLimit(
        address key, 
        uint256 duration,
        uint256 gasLimit
    ) external onlyOwner {
        require(duration <= 30 days, "Max duration 30 days");
        require(gasLimit <= 500000, "Gas limit too high"); // Reasonable maximum
        
        sessionKeys[key] = SessionKey({
            isValid: true,
            expiry: block.timestamp + duration,
            lastUsed: block.timestamp,
            gasLimit: gasLimit
        });
        
        emit SessionKeySet(key, block.timestamp + duration);
    }
    
    function submitNonce(
        address miningContract, 
        uint256 nonce,
        uint256 maxGas
    ) external {
        bool isAuthorized = msg.sender == owner;
        uint256 gasToUse;
        
        if (!isAuthorized) {
            SessionKey storage key = sessionKeys[msg.sender];
            isAuthorized = key.isValid && block.timestamp < key.expiry;
            require(isAuthorized, "Unauthorized");
            require(maxGas <= key.gasLimit, "Gas limit exceeded");
            gasToUse = maxGas;
            key.lastUsed = block.timestamp;
        } else {
            gasToUse = maxGas;
        }
        
        // Call mining contract with specified gas limit
        (bool success, ) = miningContract.call{gas: gasToUse}(
            abi.encodeWithSelector(
                IBohriumMining.submitNonce.selector,
                nonce
            )
        );
        require(success, "Mining call failed");
    }
    
    function endRound(
        address miningContract,
        uint256 maxGas
    ) external {
        bool isAuthorized = msg.sender == owner;
        uint256 gasToUse;
        
        if (!isAuthorized) {
            SessionKey storage key = sessionKeys[msg.sender];
            isAuthorized = key.isValid && block.timestamp < key.expiry;
            require(isAuthorized, "Unauthorized");
            require(maxGas <= key.gasLimit, "Gas limit exceeded");
            gasToUse = maxGas;
            key.lastUsed = block.timestamp;
        } else {
            gasToUse = maxGas;
        }
        
        // Call mining contract with specified gas limit
        (bool success, ) = miningContract.call{gas: gasToUse}(
            abi.encodeWithSelector(
                IBohriumMining.endRound.selector
            )
        );
        require(success, "Mining call failed");
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
