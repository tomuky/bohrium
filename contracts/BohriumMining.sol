// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IBohriumToken {
    function mint(address to, uint256 amount) external;
}

contract BohriumMining is Ownable {
    IBohriumToken public immutable bohriumToken;
    IERC20 public immutable stakedBohrToken;
    
    uint256 public constant INITIAL_REWARD = 10 * 10**18; // 10 BOHR
    uint256 public constant HALVING_INTERVAL = 262800; // Number of blocks in a year with 2-minute blocks
    uint256 public constant TARGET_BLOCK_TIME = 120 seconds; // 2 minutes
    uint256 public constant DIFFICULTY_ADJUSTMENT_BLOCKS = 5;
    
    // Additional state variables
    uint256 public baseDifficulty;
    uint256 public currentDifficulty;
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

    constructor(
        address _bohriumTokenAddress,
        address _stakedBohrTokenAddress
    ) Ownable(msg.sender) {
        bohriumToken = IBohriumToken(_bohriumTokenAddress);
        stakedBohrToken = IERC20(_stakedBohrTokenAddress);
        lastHalvingTimestamp = block.timestamp;
        lastBlockTimestamp = block.timestamp;
        baseDifficulty = type(uint256).max >> 16;
        currentDifficulty = baseDifficulty;
        lastBlockHash = bytes32(0);
    }

    function currentReward() public view returns (uint256) {
        uint256 halvings = blockHeight / HALVING_INTERVAL;
        uint256 reward = INITIAL_REWARD >> halvings;
        return reward > 1e14 ? reward : 1e14; // Minimum reward of 0.0001 BOHR
    }

    function getMinerDifficulty(address miner) public view returns (uint256) {
        uint256 stakedAmount = stakedBohrToken.balanceOf(miner);
        uint256 requiredStake = currentReward() * 10;
        uint256 difficulty = currentDifficulty;

        // Apply penalty for unstaked miners (make mining harder)
        if (stakedAmount < requiredStake) {
            // Using unchecked for intentional overflow protection
            unchecked {
                difficulty = difficulty * 2;
            }
            return difficulty;
        }

        // Calculate stake multiplier benefit
        if (stakedAmount >= requiredStake) {
            // Prevent division by zero and handle small required stakes
            if (requiredStake == 0) return difficulty;
            
            // Calculate multiplier safely
            uint256 multiplier = (stakedAmount * 100) / requiredStake;
            if (multiplier <= 100) return difficulty;  // No benefit if not over 100%

            // Calculate benefit (5% per 10x stake, capped at 50%)
            uint256 benefit = ((multiplier - 100) * 5) / 100;  // Simplified calculation
            benefit = benefit > 50 ? 50 : benefit;

            // Apply benefit by reducing difficulty
            difficulty = (difficulty * (100 - benefit)) / 100;
        }

        return difficulty;
    }

    function submitBlock(uint256 nonce) external {
        uint256 minerDifficulty = getMinerDifficulty(msg.sender);
        bytes32 hash = keccak256(abi.encodePacked(
            msg.sender,
            lastBlockHash,
            minerDifficulty,
            nonce
        ));
        
        require(uint256(hash) <= minerDifficulty, "Hash doesn't meet difficulty");

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
        
        // Check for halving based on block height
        if (blockHeight % HALVING_INTERVAL == 0) {
            emit RewardHalved(currentReward());
        }
        
        emit BlockMined(msg.sender, blockHeight, nonce, reward, timeElapsed);
    }
    
    function adjustDifficulty(uint256 timeElapsed) internal {
        // If this is the start of a new adjustment period, store the timestamp
        if (blockHeight % DIFFICULTY_ADJUSTMENT_BLOCKS == 0) {
            adjustmentStartTimestamp = block.timestamp;
        }
        
        lastBlockTimestamp = block.timestamp;
        
        // Only adjust difficulty at the end of each period
        if ((blockHeight + 1) % DIFFICULTY_ADJUSTMENT_BLOCKS != 0) {
            return;
        }
        
        uint256 timespan = block.timestamp - adjustmentStartTimestamp;
        uint256 targetTimespan = TARGET_BLOCK_TIME * DIFFICULTY_ADJUSTMENT_BLOCKS;
        
        // Apply dampening (4x max change)
        timespan = timespan < targetTimespan / 4 ? targetTimespan / 4 : 
                   timespan > targetTimespan * 4 ? targetTimespan * 4 : 
                   timespan;
        
        // Use bitwise operations for more gas-efficient adjustments
        // Shift right (divide by 2) if blocks are too slow
        // Shift left (multiply by 2) if blocks are too fast
        uint256 newDifficulty = currentDifficulty;
        if (timespan > targetTimespan * 2) {
            newDifficulty = newDifficulty >> 1;  // Halve difficulty
        } else if (timespan < targetTimespan / 2) {
            newDifficulty = newDifficulty << 1;  // Double difficulty
        }
        
        // Apply safety bounds
        uint256 minDifficulty = type(uint256).max >> 32;
        newDifficulty = newDifficulty < minDifficulty ? minDifficulty : newDifficulty;
        
        currentDifficulty = newDifficulty;
        emit DifficultyAdjusted(currentDifficulty);
    }

    // Add this function for testing purposes only
    function setCurrentDifficulty(uint256 _difficulty) external {
        currentDifficulty = _difficulty;
        emit DifficultyAdjusted(currentDifficulty);
    }

    // Add this function for testing purposes only
    function mintForTesting(address to, uint256 amount) external {
        bohriumToken.mint(to, amount);
    }
}