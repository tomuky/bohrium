// Common configuration shared across all environments
const COMMON_CONFIG = {
    MIN_ROUND_DURATION: 60, // amount of seconds per round
    NONCE_RANGE: 100000, // amount of nonces to submit per round
    MINING_BATCH_SIZE: 1000, // amount of nonces to submit per transaction
    TX_BUFFER: 3, // amount of seconds to submit nonce before round ends
    END_ROUND_WAIT: 5, // amount of seconds to wait after round ends before submitting next nonce
    BASE_GAS_LIMIT: 100000 // base gas limit for transactions
};

// Environment-specific configurations
const ENV_CONFIG = {
    local: {
        RPC_URL: "http://127.0.0.1:8545",
        MINING_CONTRACT_ADDRESS: "0x70e0bA845a1A0F2DA3359C97E0285013525FFC49", // local address
        PRIVATE_KEY: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // hardhat default
        CONFIRMATIONS: 1,
        GAS_MULTIPLIER: 1
    },
    baseSepolia: {
        RPC_URL: process.env.BASE_SEPOLIA_RPC_URL,
        MINING_CONTRACT_ADDRESS: "0x50C40138D1043C55aF22d6e7E18ECbF2be6b0177", // testnet address
        PRIVATE_KEY: process.env.PRIVATE_KEY,
        CONFIRMATIONS: 2,
        GAS_MULTIPLIER: 2
    },
    baseMainnet: {
        RPC_URL: process.env.BASE_MAINNET_RPC_URL,
        MINING_CONTRACT_ADDRESS: "0x...", // mainnet address
        PRIVATE_KEY: process.env.PRIVATE_KEY,
        CONFIRMATIONS: 3,
        GAS_MULTIPLIER: 1.2
    }
};

module.exports = { COMMON_CONFIG, ENV_CONFIG };