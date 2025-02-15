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
        contracts: {
            mining: '0xACeE79D68d42d2f2d71Aa96D0F8510A8ADD4a8B3',
            bohr: '0xe248Dc8Ef9163DADDbd65609413F7b3d16A22Ecb'
        }
    },
    baseMainnet: {
        name: 'Base',
        chainId: 8453,
        rpcUrl: 'https://mainnet.base.org',
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