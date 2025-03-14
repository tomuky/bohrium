const fs = require('fs');
const path = require('path');
const os = require('os');

// Common configuration shared across all environments
const COMMON_CONFIG = {
    NONCE_RANGE: 100000, // amount of nonces to submit per round
    MINING_BATCH_SIZE: 1000, // amount of nonces to check per batch
    BASE_GAS_LIMIT: 200000, // base gas limit for transactions
    GAS_MULTIPLIER: 1.5 // multiplier for gas limit
};

// Environment-specific configurations
const ENV_CONFIG = {
    local: {
        RPC_URL: "http://127.0.0.1:8545",
        MINING_CONTRACT_ADDRESS: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", // local address
        CONFIRMATIONS: 1,
        GAS_MULTIPLIER: 1.5
    },
    baseSepolia: {
        RPC_URL: "https://sepolia.base.org",
        MINING_CONTRACT_ADDRESS: "0xA9b60d4cAC4B0320cB974a9eC43b610df6E958B6", // testnet address
        BOHR_TOKEN_ADDRESS: "0xDBeDf34C4724DB2122BE07cf109593e5D46F907C", // testnet address
        STAKED_BOHR_TOKEN_ADDRESS: "0x57b26a9401Ef5CBAD49bF040B824f6dd6A9BAa90", // testnet address
        CONFIRMATIONS: 2,
        GAS_MULTIPLIER: 2
    },
    baseMainnet: {
        RPC_URL: "https://mainnet.base.org",
        MINING_CONTRACT_ADDRESS: "0x...", // mainnet address
        CONFIRMATIONS: 3,
        GAS_MULTIPLIER: 1.2
    }
};

// Default network
const DEFAULT_NETWORK = 'baseSepolia';

const SETTINGS_DIR = path.join(os.homedir(), '.bohrium');
const SETTINGS_PATH = path.join(SETTINGS_DIR, 'settings.json');

// Ensure settings directory exists
function ensureSettingsDir() {
    if (!fs.existsSync(SETTINGS_DIR)) {
        fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    }
}

// Get current network from settings file
function getCurrentNetwork() {
    ensureSettingsDir();
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
            return settings.network || DEFAULT_NETWORK;
        }
    } catch (error) {
        console.error('Error reading settings:', error);
    }
    return DEFAULT_NETWORK;
}

// Save network preference to settings file
function saveNetwork(network) {
    ensureSettingsDir();
    const settings = fs.existsSync(SETTINGS_PATH)
        ? JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'))
        : {};
    
    settings.network = network;
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

// Add function to validate network
function validateNetwork(network) {
    if (!ENV_CONFIG[network]) {
        throw new Error(`Invalid network: ${network}. Available networks: ${Object.keys(ENV_CONFIG).join(', ')}`);
    }
    return network;
}

// Update getNetworkConfig to use settings
function getNetworkConfig(network = null) {
    const validNetwork = validateNetwork(network || getCurrentNetwork());
    return {
        ...COMMON_CONFIG,
        ...ENV_CONFIG[validNetwork],
        NETWORK: validNetwork
    };
}

module.exports = { 
    COMMON_CONFIG, 
    ENV_CONFIG, 
    DEFAULT_NETWORK,
    getNetworkConfig,
    validateNetwork,
    getCurrentNetwork,
    saveNetwork
};