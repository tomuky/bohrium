// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBohriumToken {
    function mint(address to, uint256 amount) external;
}

contract BohriumMining {
    IBohriumToken public bohriumToken;

    uint256 public reward = 10 * 10**18; // Reward: 10 BOH
    uint256 public roundDuration = 10 minutes; // Mining round duration
    uint256 public lastRoundEnd; // Timestamp of the last round end

    address public bestMiner; // Miner with the best hash
    bytes32 public bestHash; // Current best hash
    uint256 public bestHashValue; // Numerical value of the best hash

    event NewBestHash(address indexed miner, bytes32 hash, uint256 value);
    event RoundEnded(address winner, uint256 reward);

    constructor(address _bohriumTokenAddress) {
        bohriumToken = IBohriumToken(_bohriumTokenAddress);
        lastRoundEnd = block.timestamp + roundDuration; // Start first round
    }

    function submitHash(uint256 nonce) external {
        require(block.timestamp < lastRoundEnd, "Round has ended");

        // Calculate the hash
        bytes32 hash = keccak256(abi.encodePacked(msg.sender, nonce));
        uint256 hashValue = uint256(hash); // Convert to numerical value

        // Check if this hash is better (lower value) than the current best
        if (bestMiner == address(0) || hashValue < bestHashValue) {
            bestMiner = msg.sender;
            bestHash = hash;
            bestHashValue = hashValue;

            emit NewBestHash(msg.sender, hash, hashValue);
        }
    }

    function endRound() external {
        require(block.timestamp >= lastRoundEnd, "Round is still ongoing");

        // Reward the best miner
        if (bestMiner != address(0)) {
            bohriumToken.mint(bestMiner, reward);

            emit RoundEnded(bestMiner, reward);
        }

        // Reset for the next round
        bestMiner = address(0);
        bestHash = 0;
        bestHashValue = type(uint256).max;
        lastRoundEnd = block.timestamp + roundDuration;
    }

    function setReward(uint256 _reward) external {
        reward = _reward;
    }

    function setRoundDuration(uint256 _duration) external {
        roundDuration = _duration;
    }
}
