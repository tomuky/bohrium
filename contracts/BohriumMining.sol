// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBohriumToken {
    function mint(address to, uint256 amount) external;
}

interface IBohriumMiningAccountFactory {
    function getMiningAccount(address user) external view returns (address);
    function getUser(address miningAccount) external view returns (address);
}

contract BohriumMining {
    IBohriumToken public bohriumToken;
    IBohriumMiningAccountFactory public miningAccountFactory;
    uint256 public initialReward = 10 * 10**18; // Initial reward (10 BOH)
    uint256 public halvingInterval = 365 * 24 * 60 * 60; // Halve every 1 year
    uint256 public lastHalvingTimestamp;
    uint256 public roundDuration = 60 seconds;
    uint256 public roundStartTime;
    uint256 public roundEndTime;
    uint256 public roundId;

    address public bestMiner;
    uint256 public bestHashValue;
    bytes32 public bestHash;
    
    mapping(uint256 => uint256) public noncesSubmitted;
    event NewBestHash(address indexed miner, uint256 nonce, uint256 hashValue);
    event RoundEnded(uint256 indexed roundId, address winner, uint256 reward);
    event RoundStarted(uint256 indexed roundId, uint256 startTime, uint256 endTime);
    event RewardHalved(uint256 newReward);

    constructor(address _bohriumTokenAddress, address _miningAccountFactoryAddress) {
        bohriumToken = IBohriumToken(_bohriumTokenAddress);
        miningAccountFactory = IBohriumMiningAccountFactory(_miningAccountFactoryAddress);
        lastHalvingTimestamp = block.timestamp;
        startNewRound();
    }

    function startNewRound() private {
        roundId++;
        roundStartTime = block.timestamp;
        roundEndTime = roundStartTime + roundDuration;
        bestMiner = address(0);
        bestHashValue = type(uint256).max;
        emit RoundStarted(roundId, roundStartTime, roundEndTime);
    }

    function currentReward() public view returns (uint256) {
        uint256 elapsedTime = block.timestamp - lastHalvingTimestamp;
        uint256 halvings = elapsedTime / halvingInterval;
        uint256 reward = initialReward >> halvings;
        return reward > 1e14 ? reward : 1e14;
    }

    function submitNonce(uint256 nonce) external {
        require(block.timestamp < roundEndTime, "Round has ended");
        
        bytes32 hash = keccak256(abi.encodePacked(
            msg.sender,
            bestHash, 
            nonce
        ));
        uint256 hashValue = uint256(hash);

        noncesSubmitted[roundId]++;

        if (bestMiner == address(0) || hashValue < bestHashValue) {
            bestMiner = msg.sender;
            bestHashValue = hashValue;
            bestHash = hash;
            emit NewBestHash(msg.sender, nonce, hashValue);
        }
    }

    function endRound() public {
        require(block.timestamp >= roundStartTime + roundDuration, "Round minimum duration not met");
        
        // If there was a miner, mint their reward
        if (bestMiner != address(0)) {
            uint256 reward = currentReward();
            
            // Mint BOHR directly to the mining account address
            bohriumToken.mint(bestMiner, reward);
            emit RoundEnded(roundId, bestMiner, reward);
        } else {
            emit RoundEnded(roundId, address(0), 0);
        }

        // Check for halving 
        if (block.timestamp >= lastHalvingTimestamp + halvingInterval) {
            lastHalvingTimestamp = block.timestamp;
            emit RewardHalved(currentReward() >> 1);
        }

        startNewRound();
    }
}
