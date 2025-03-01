export const MINING_CONFIG = {
    MINING_BATCH_SIZE: 1000,
    BASE_GAS_LIMIT: 200000,
    CONFIRMATIONS: 2,
    GAS_MULTIPLIER: 1.5
};

export const MINING_ABI = [
    // Human-readable function signatures
    "function submitBlock(uint256 nonce) external",
    "function currentReward() view returns (uint256)",
    "function currentDifficulty() view returns (uint256)",
    "function lastBlockHash() view returns (bytes32)",
    "function blockHeight() view returns (uint256)",
    "function bohriumToken() view returns (address)",
    "function stake(uint256 amount) external",
    "function requestUnstake() external",
    "function completeUnstake() external",
    "function getMinerDifficulty(address miner) view returns (uint256)",
    "function miners(address) view returns (uint256 stakedAmount, uint256 unstakeRequestBlock, uint256[] recentWinBlocks)",

    // Events
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "address", "name": "miner", "type": "address"},
            {"indexed": true, "internalType": "uint256", "name": "blockHeight", "type": "uint256"},
            {"indexed": false, "internalType": "uint256", "name": "nonce", "type": "uint256"},
            {"indexed": false, "internalType": "uint256", "name": "reward", "type": "uint256"},
            {"indexed": false, "internalType": "uint256", "name": "timeTaken", "type": "uint256"},
            {"indexed": false, "internalType": "address", "name": "rewardRecipient", "type": "address"}
        ],
        "name": "BlockMined",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": false, "internalType": "uint256", "name": "newDifficulty", "type": "uint256"}
        ],
        "name": "DifficultyAdjusted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": false, "internalType": "uint256", "name": "newReward", "type": "uint256"}
        ],
        "name": "RewardHalved",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "address", "name": "miner", "type": "address"},
            {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "StakeDeposited",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "address", "name": "miner", "type": "address"},
            {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "UnstakeRequested",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "address", "name": "miner", "type": "address"},
            {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "UnstakeCompleted",
        "type": "event"
    }
];

export const TOKEN_ABI = [
    {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "balance", type: "uint256" }]
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    },
    {
        "name": "transfer",
        "type": "function",
        "inputs": [
            {
                "name": "recipient",
                "type": "address"
            },
            {
                "name": "amount",
                "type": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ]
    }
];

export const STAKED_BOHR_ABI = [
    // Existing methods
    "function stake(uint256 amount) external",
    "function requestUnstake(uint256 amount) external",
    "function completeUnstake() external",
    "function cancelUnstake() external",
    "function balanceOf(address account) view returns (uint256)",
    "function getEffectiveBalance(address account) view returns (uint256)",
    
    // Add delegation methods
    "function setDelegation(address sessionWallet) external",
    "function removeDelegation() external",
    "function delegatedBy(address) view returns (address)",
    "function delegatedTo(address) view returns (address)",
    
    // Add delegation events
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "address", "name": "sessionWallet", "type": "address"},
            {"indexed": true, "internalType": "address", "name": "mainWallet", "type": "address"}
        ],
        "name": "DelegationSet",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "address", "name": "sessionWallet", "type": "address"},
            {"indexed": true, "internalType": "address", "name": "mainWallet", "type": "address"}
        ],
        "name": "DelegationRemoved",
        "type": "event"
    }
];