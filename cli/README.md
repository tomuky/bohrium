# Bohrium CLI

A command-line interface for mining BOHR tokens on Base.

## Installation

Open a terminal and run:
`npm install -g bohrium`

## Usage

After installation, you can use the `bohrium` command from anywhere in your terminal.

### Available Commands

- `bohrium start` - Interactive guide to start mining
- `bohrium create-wallet` - Create a new wallet
- `bohrium wallet` - Show wallet information and balances
- `bohrium mine` - Start mining BOHR
- `bohrium withdraw` - Withdraw ETH or BOHR from your wallet
- `bohrium network` - Show current network
- `bohrium set-network <network>` - Change network (baseSepolia or baseMainnet)
- `bohrium reward-amount` - Show current mining reward amount

## Configuration

The CLI stores configuration in `~/.bohrium/`:
- Wallet information is encrypted and stored in `wallet.json`
- Network settings are stored in `settings.json`

## Security

- Your wallet is encrypted with a password of your choice
- Private keys and recovery phrases are shown once when creating a wallet, and can be shown again with the password
- Never share your private keys or recovery phrases with anyone

## Requirements

- Node.js 16 or higher
- Internet connection
- Small amount of ETH for transaction fees

## Support

For issues and feature requests, please visit our [GitHub repository](https://github.com/tomuky/bohrium/issues).