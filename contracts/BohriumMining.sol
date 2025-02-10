// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBohriumToken {
    function mint(address to, uint256 amount) external;
}

contract BohriumMining {
    IBohriumToken public immutable bohriumToken;
    
    uint256 public constant INITIAL_REWARD = 10 * 10**18; // 10 BOHR
    uint256 public constant HALVING_INTERVAL = 365 days;
    uint256 public constant TARGET_BLOCK_TIME = 60 seconds;
    uint256 public constant DIFFICULTY_ADJUSTMENT_INTERVAL = 360; // 6 hours
    
    uint256 public currentDifficulty; // The current difficulty target
    uint256 public lastHalvingTimestamp;
    uint256 public lastBlockTimestamp;
    uint256 public blockHeight;
    bytes32 public lastBlockHash;
    
    event BlockMined(
        address indexed miner,
        uint256 indexed blockHeight,
        uint256 nonce,
        uint256 reward,
        uint256 timeTaken
    );
    event DifficultyAdjusted(uint256 newDifficulty);
    event RewardHalved(uint256 newReward);

    constructor(address _bohriumTokenAddress) {
        bohriumToken = IBohriumToken(_bohriumTokenAddress);
        lastHalvingTimestamp = block.timestamp;
        lastBlockTimestamp = block.timestamp;
        currentDifficulty = type(uint256).max >> 16;
        lastBlockHash = bytes32(0);
    }

    function currentReward() public view returns (uint256) {
        uint256 elapsedTime = block.timestamp - lastHalvingTimestamp;
        uint256 halvings = elapsedTime / HALVING_INTERVAL;
        uint256 reward = INITIAL_REWARD >> halvings;
        return reward > 1e14 ? reward : 1e14; // Minimum reward of 0.0001 BOHR
    }

    function submitBlock(uint256 nonce) external {
        bytes32 hash = keccak256(abi.encodePacked(
            msg.sender,
            lastBlockHash,
            currentDifficulty,
            nonce
        ));
        
        uint256 hashValue = uint256(hash);
        require(hashValue <= currentDifficulty, "Hash doesn't meet difficulty");

        // Calculate block time
        uint256 timeElapsed = block.timestamp - lastBlockTimestamp;
        
        // Adjust difficulty every block with a moderate step
        adjustDifficulty(timeElapsed);
        
        // Mint reward
        uint256 reward = currentReward();
        bohriumToken.mint(msg.sender, reward);
        
        // Update state
        lastBlockHash = hash;
        lastBlockTimestamp = block.timestamp;
        blockHeight++;
        
        // Check for halving
        if (block.timestamp >= lastHalvingTimestamp + HALVING_INTERVAL) {
            lastHalvingTimestamp = block.timestamp;
            emit RewardHalved(currentReward());
        }
        
        emit BlockMined(msg.sender, blockHeight, nonce, reward, timeElapsed);
    }
    
    function adjustDifficulty(uint256 timeElapsed) internal {
        // Target is 120 seconds (2 minutes)
        if (timeElapsed < 120) {
            // Block was too fast - increase difficulty by 10%
            currentDifficulty = currentDifficulty * 90 / 100;
        } else if (timeElapsed > 120) {
            // Block was too slow - decrease difficulty by 10%
            currentDifficulty = currentDifficulty * 110 / 100;
        }
        
        // Safety bounds
        if (currentDifficulty == 0) currentDifficulty = 1;
        if (currentDifficulty > type(uint256).max >> 1) {
            currentDifficulty = type(uint256).max >> 1;
        }
        
        emit DifficultyAdjusted(currentDifficulty);
    }

    // Add this function for testing purposes only
    function setCurrentDifficulty(uint256 _difficulty) external {
        currentDifficulty = _difficulty;
    }
}