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
            mining: '0x2cE3701eDCcA9d6Aa62402F113c661fBBEC0896a',
            bohr: '0xE3967B9a9cB47c4E3108C149f52722f938442139'
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