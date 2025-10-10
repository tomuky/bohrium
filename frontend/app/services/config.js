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
            mining: '0x287D90c5dB28b44b3D097902661a100e490d0f0B',
            bohrToken: '0x14999c62D4e3E957b9Cc3532cb9e9218217f502C',
            stakedBohrToken: '0x357960FBe6Adbb57176B036ec8b5fC6170D04D9d'
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