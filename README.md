# Bohrium Mining Project

A decentralized mining system for the Bohrium (BOHR) token on Base network. This project includes smart contracts for the token and mining mechanism, along with mining scripts for participation.

## Prerequisites

- Node.js (v16 or later)
- npm or yarn
- A Base network RPC URL
- A wallet private key for deploying/mining

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bohrium
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_RPC_URL=your_base_sepolia_rpc_url
BASE_MAINNET_RPC_URL=your_base_mainnet_rpc_url
BASESCAN_API_KEY=your_basescan_api_key
```

## Smart Contracts

- `BohriumToken.sol`: ERC20 token contract for BOHR
- `BohriumMining.sol`: Mining contract that manages rounds and rewards

### Deployment

Deploy to Base Sepolia testnet:
```bash
npx hardhat ignition deploy ./ignition/modules/deployBohriumMining.js --network baseSepolia
```

## Mining

Start mining with:
```bash
node scripts/miner-1.js baseSepolia
```

Available networks:
- `local`: Local development
- `baseSepolia`: Base Sepolia testnet
- `baseMainnet`: Base mainnet

## Testing

Run the test suite:
```bash
npx hardhat test
```

Run tests with gas reporting:
```bash
REPORT_GAS=true npx hardhat test
```

## Contract Verification

Verify contracts on Basescan:
```bash
npx hardhat verify --network baseSepolia <contract-address> <constructor-arguments>
```

## Mining Configuration

Key parameters can be adjusted in `scripts/mineConfig.js`:
- `MIN_ROUND_DURATION`: Duration of each mining round (seconds)
- `NONCE_RANGE`: Range for nonce submissions
- `MINING_BATCH_SIZE`: Nonces per transaction
- `TX_BUFFER`: Buffer time for submissions
- `END_ROUND_WAIT`: Wait time after round ends

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.