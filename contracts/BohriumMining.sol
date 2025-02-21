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
    uint256 public constant DIFFICULTY_ADJUSTMENT_BLOCKS = 5;
    
    uint256 public currentDifficulty; // The current difficulty target
    uint256 public lastHalvingTimestamp;
    uint256 public lastBlockTimestamp;
    uint256 public blockHeight;
    bytes32 public lastBlockHash;
    uint256 public adjustmentStartTimestamp;
    
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
        // If this is the start of a new adjustment period, store the timestamp
        if (blockHeight % DIFFICULTY_ADJUSTMENT_BLOCKS == 0) {
            adjustmentStartTimestamp = block.timestamp;
        }
        
        // Store the last block timestamp
        lastBlockTimestamp = block.timestamp;
        
        // Only adjust difficulty at the end of each period
        if ((blockHeight + 1) % DIFFICULTY_ADJUSTMENT_BLOCKS != 0) {
            return;
        }
        
        // Calculate actual timespan for the last DIFFICULTY_ADJUSTMENT_BLOCKS
        uint256 timespan = block.timestamp - adjustmentStartTimestamp;
        uint256 targetTimespan = TARGET_BLOCK_TIME * DIFFICULTY_ADJUSTMENT_BLOCKS;
        
        // Apply dampening to avoid drastic changes
        if (timespan < targetTimespan / 4) {
            timespan = targetTimespan / 4;
        }
        if (timespan > targetTimespan * 4) {
            timespan = targetTimespan * 4;
        }
        
        // Adjust difficulty based on timespan ratio
        uint256 newDifficulty = (currentDifficulty * timespan) / targetTimespan;
        
        // Apply safety bounds
        uint256 maxDifficulty = type(uint256).max >> 1;
        uint256 minDifficulty = type(uint256).max >> 32;
        
        currentDifficulty = newDifficulty < minDifficulty ? minDifficulty :
                           newDifficulty > maxDifficulty ? maxDifficulty :
                           newDifficulty;
        
        emit DifficultyAdjusted(currentDifficulty);
    }

    // Add this function for testing purposes only
    function setCurrentDifficulty(uint256 _difficulty) external {
        currentDifficulty = _difficulty;
    }
}