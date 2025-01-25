export const MINING_ABI = [
    "function submitNonce(uint256 nonce) external",
    "function endRound() external",
    "function roundId() view returns (uint256)",
    "function roundStartTime() view returns (uint256)",
    "function bohriumToken() view returns (address)",
    "function bestHash() view returns (bytes32)"
];

export const TOKEN_ABI = [
    "function balanceOf(address account) view returns (uint256)",
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
    }
];

export const FACTORY_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "userToMiningAccount",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "createMiningAccount",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "getMiningAccount",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
            {"indexed": true, "internalType": "address", "name": "account", "type": "address"}
        ],
        "name": "MiningAccountCreated",
        "type": "event"
    }
];

export const MINING_CONFIG = {
    MIN_ROUND_DURATION: 60,
    NONCE_RANGE: 100000,
    MINING_BATCH_SIZE: 1000,
    TX_BUFFER: 10,
    END_ROUND_WAIT: 5,
    BASE_GAS_LIMIT: 200000,
    CONFIRMATIONS: 2,
    GAS_MULTIPLIER: 1.5
};

export const MINING_EVENTS = {
    START: 'start',
    STOP: 'stop',
    ROUND_START: 'round_start',
    MINING: 'mining',
    NONCE_FOUND: 'nonce_found',
    SUBMIT: 'submit',
    CONFIRM: 'confirm',
    WAITING: 'waiting',
    ERROR: 'error',
    TRANSACTION: 'transaction',
    REWARD: 'reward',
    USER_REJECTED: 'user_rejected'
};

export const MINING_ACCOUNT_ABI = [
    "function owner() view returns (address)",
    "function setSessionKey(address key, uint256 duration) external",
    "function revokeSessionKey(address key) external",
    "function submitNonce(address miningContract, uint256 nonce) external",
    "function withdrawETH(uint256 amount) external",
    "function withdrawToken(address token, uint256 amount) external",
    "function sessionKeys(address) view returns (bool isValid, uint256 expiry, uint256 lastUsed)",
    "function endRound(address miningContract) external",
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "key",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "expiry",
                "type": "uint256"
            }
        ],
        "name": "SessionKeySet",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "key",
                "type": "address"
            }
        ],
        "name": "SessionKeyRevoked",
        "type": "event"
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
                "indexed": false,
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "ETHReceived",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "key",
                "type": "address"
            }
        ],
        "name": "isAuthorized",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "key",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "fundingAmount",
                "type": "uint256"
            }
        ],
        "name": "authorizeSessionKeyWithFunding",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
];