export const MINING_CONFIG = {
    MINING_BATCH_SIZE: 1000,
    BASE_GAS_LIMIT: 200000,
    CONFIRMATIONS: 2,
    GAS_MULTIPLIER: 1.5
};

export const MINING_ABI = [
    // Function definitions in full object format
    {
        "name": "submitBlock",
        "type": "function",
        "inputs": [{"name": "nonce", "type": "uint256"}],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "name": "currentReward",
        "type": "function",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view"
    },
    {
        "name": "baseDifficulty",
        "type": "function",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view"
    },
    {
        "name": "lastBlockHash",
        "type": "function",
        "inputs": [],
        "outputs": [{"name": "", "type": "bytes32"}],
        "stateMutability": "view"
    },
    {
        "name": "blockHeight",
        "type": "function",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view"
    },
    {
        "name": "bohriumToken",
        "type": "function",
        "inputs": [],
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view"
    },
    {
        "name": "stakedBohrToken",
        "type": "function",
        "inputs": [],
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view"
    },
    {
        "name": "getMinerDifficulty",
        "type": "function",
        "inputs": [{"name": "miner", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view"
    },
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
    },
    {
        "name": "getMiningParams",
        "type": "function",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "tuple",
                "components": [
                    {"name": "lastBlockHash", "type": "bytes32"},
                    {"name": "baseDifficulty", "type": "uint256"},
                    {"name": "blockHeight", "type": "uint256"},
                    {"name": "currentReward", "type": "uint256"}
                ]
            }
        ],
        "stateMutability": "view"
    },
    {
        "name": "getMinerParams",
        "type": "function",
        "inputs": [{"name": "miner", "type": "address"}],
        "outputs": [
            {"name": "_lastBlockHash", "type": "bytes32"},
            {"name": "_baseDifficulty", "type": "uint256"},
            {"name": "_blockHeight", "type": "uint256"},
            {"name": "_currentReward", "type": "uint256"},
            {"name": "_minerDifficulty", "type": "uint256"}
        ],
        "stateMutability": "view"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "uint256", "name": "blockHeight", "type": "uint256"},
            {"indexed": true, "internalType": "bytes32", "name": "newBlockHash", "type": "bytes32"},
            {"indexed": false, "internalType": "uint256", "name": "newBaseDifficulty", "type": "uint256"}
        ],
        "name": "MiningParamsChanged",
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
    },
    {
        "name": "approve",
        "type": "function",
        "inputs": [
            {
                "name": "spender",
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
    },
    {
        "name": "allowance",
        "type": "function",
        "stateMutability": "view",
        "inputs": [
            {
                "name": "owner",
                "type": "address"
            },
            {
                "name": "spender",
                "type": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ]
    }
];

export const STAKED_BOHR_ABI = [
    {
        "name": "stake",
        "type": "function",
        "inputs": [{"name": "amount", "type": "uint256"}],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "name": "requestUnstake",
        "type": "function",
        "inputs": [{"name": "amount", "type": "uint256"}],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "name": "completeUnstake",
        "type": "function",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "name": "cancelUnstake",
        "type": "function",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "name": "balanceOf",
        "type": "function",
        "inputs": [{"name": "account", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view"
    },
    {
        "name": "getEffectiveBalance",
        "type": "function",
        "inputs": [{"name": "account", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view"
    },
    
    // New delegation methods
    {
        "name": "requestDelegation",
        "type": "function",
        "inputs": [{"name": "sessionWallet", "type": "address"}],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "name": "acceptDelegation",
        "type": "function",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "name": "cancelDelegationRequest",
        "type": "function",
        "inputs": [{"name": "sessionWallet", "type": "address"}],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "name": "removeDelegation",
        "type": "function",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "name": "delegatedBy",
        "type": "function",
        "inputs": [{"name": "", "type": "address"}],
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view"
    },
    {
        "name": "delegatedTo",
        "type": "function",
        "inputs": [{"name": "", "type": "address"}],
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view"
    },
    {
        "name": "pendingDelegations",
        "type": "function",
        "inputs": [{"name": "", "type": "address"}],
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view"
    },
    
    // Contract events
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
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "address", "name": "sessionWallet", "type": "address"},
            {"indexed": true, "internalType": "address", "name": "mainWallet", "type": "address"}
        ],
        "name": "DelegationRequested",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "address", "name": "sessionWallet", "type": "address"},
            {"indexed": true, "internalType": "address", "name": "mainWallet", "type": "address"}
        ],
        "name": "DelegationRequestCancelled",
        "type": "event"
    },
    
    // Unstake requests mapping accessor
    {
        "name": "unstakeRequests",
        "type": "function",
        "inputs": [{"name": "", "type": "address"}],
        "outputs": [
            {"name": "amount", "type": "uint256"},
            {"name": "requestBohriumBlock", "type": "uint256"}
        ],
        "stateMutability": "view"
    },
    
    // Other contract functions
    {
        "name": "setMiningContract",
        "type": "function",
        "inputs": [{"name": "miningContract", "type": "address"}],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "name": "getCurrentBohriumBlock",
        "type": "function",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view"
    },
    {
        "name": "miningContract",
        "type": "function",
        "inputs": [],
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view"
    },
    {
        "name": "bohrToken",
        "type": "function",
        "inputs": [],
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view"
    },
    {
        "name": "UNSTAKING_COOLDOWN_BLOCKS",
        "type": "function",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view"
    },
    
    // Contract events
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
            {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
            {"indexed": false, "internalType": "uint256", "name": "requestBohriumBlock", "type": "uint256"}
        ],
        "name": "UnstakeRequested",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
            {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "UnstakeCompleted",
        "type": "event"
    }
];