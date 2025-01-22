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