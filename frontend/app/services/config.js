// Network-specific configurations
export const NETWORKS = {
    local: {
        name: 'Local',
        chainId: 31337, // Hardhat's default chain ID
        rpcUrl: 'http://127.0.0.1:8545',
        contracts: {
            mining: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        }
    },
    baseSepolia: {
        name: 'Base Sepolia',
        chainId: 84532,
        rpcUrl: 'https://sepolia.base.org',
        baseScanUrl: 'https://sepolia.basescan.org',
        contracts: {
            mining: '0x92D682fcA9e2B3D2A04eDdC268Dc4AAAfD15D390'
        }
    },
    baseMainnet: {
        name: 'Base',
        chainId: 8453,
        rpcUrl: 'https://mainnet.base.org',
        baseScanUrl: 'https://basescan.org',
        contracts: {
            mining: '0x...' // mainnet address when deployed
        }
    }
};

// Helper function to get network config by chain ID
export const getNetworkConfig = (chainId) => {
    const network = Object.values(NETWORKS).find(n => n.chainId === chainId);
    if (!network) {
        throw new Error(`Unsupported network (chain ID: ${chainId})`);
    }
    return network;
};

// Default network
export const DEFAULT_NETWORK = NETWORKS.baseSepolia;