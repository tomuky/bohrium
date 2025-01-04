// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBohriumToken {
    function mint(address to, uint256 amount) external;
}

contract BohriumMining {
    IBohriumToken public bohriumToken;

    uint256 public initialReward = 10 * 10**18; // Initial reward (10 BOH)
    uint256 public halvingInterval = 365 * 24 * 60 * 60; // Halve every 1 year (31,536,000 seconds)
    uint256 public lastHalvingTimestamp; // Last time the reward was halved
    uint256 public roundDuration = 10 minutes; // Duration of each mining round
    uint256 public lastRoundEnd; // Timestamp of the last round end
    uint256 public roundId; // Unique ID for each mining round

    address public bestMiner; // Address of the miner with the best hash
    uint256 public bestHashValue; // Value of the best hash (smallest)

    event NewBestHash(address indexed miner, uint256 nonce, uint256 hashValue);
    event RoundEnded(uint256 indexed roundId, address winner, uint256 reward);
    event RewardHalved(uint256 newReward);

    constructor(address _bohriumTokenAddress) {
        bohriumToken = IBohriumToken(_bohriumTokenAddress);
        lastRoundEnd = block.timestamp + roundDuration; // Start the first round
        lastHalvingTimestamp = block.timestamp; // Set initial halving time to contract creation
    }

    function currentReward() public view returns (uint256) {
        // Calculate how many halvings should have occurred
        uint256 elapsedTime = block.timestamp - lastHalvingTimestamp;
        uint256 halvings = elapsedTime / halvingInterval;

        // Calculate the current reward based on halvings
        uint256 reward = initialReward >> halvings; // Divide by 2 for each halving
        return reward > 1e14 ? reward : 1e14; // Minimum reward is 0.0001 BOH
    }

    function submitHash(uint256 nonce) external {
        require(block.timestamp < lastRoundEnd, "Round has ended");

        // Generate the hash
        bytes32 hash = keccak256(abi.encodePacked(roundId, msg.sender, nonce));
        uint256 hashValue = uint256(hash);

        // Check if this is the best hash
        if (bestMiner == address(0) || hashValue < bestHashValue) {
            bestMiner = msg.sender;
            bestHashValue = hashValue;

            emit NewBestHash(msg.sender, nonce, hashValue);
        }
    }

    function endRound() external {
        require(block.timestamp >= lastRoundEnd, "Round is still ongoing");

        uint256 reward = currentReward(); // Get the current reward based on halvings

        // Reward the best miner
        if (bestMiner != address(0)) {
            bohriumToken.mint(bestMiner, reward);
            emit RoundEnded(roundId, bestMiner, reward);
        }

        // Halve the reward if needed
        if (block.timestamp >= lastHalvingTimestamp + halvingInterval) {
            lastHalvingTimestamp = block.timestamp;
            emit RewardHalved(reward >> 1); // Log the new reward
        }

        // Reset state for the next round
        bestMiner = address(0);
        bestHashValue = type(uint256).max;
        roundId++;
        lastRoundEnd = block.timestamp + roundDuration;
    }
}
