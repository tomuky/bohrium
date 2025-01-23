#!/usr/bin/env node

const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const path = require('path');

// Import mining script
const miner = require(path.resolve(__dirname, './miner'));
const config = require(path.resolve(__dirname, './config'));

const program = new Command();

program
  .name('bohrium')
  .description('CLI tool for mining BOHR')
  .version('1.0.0');

// Start mining command
program
  .command('mine')
  .description('Start mining BOHR')
  .action(async () => {
    try {
      const wallet = getWallet(); // Get the wallet created by create-wallet command
      if (!wallet) {
        console.log(chalk.yellow('\n⚠️  No wallet found. Create one first with:'));
        console.log(chalk.cyan('bohrium create-wallet'));
        return;
      }
      
      console.log(chalk.green('Start mining...'));
      console.log(chalk.blue(`Mining with wallet address: ${wallet.address}`));
      
      await miner.mine(wallet);
    } catch (error) {
      console.error(chalk.red('\n❌ Error starting mining:', error.message));
    }
  });

// create a new wallet
program
    .command('create-wallet')
    .description('Create a new wallet')
    .action(async () => {
        try {
            const wallet = await createWallet();
            console.log(chalk.green('\n✨ New wallet created successfully!'));
            console.log(chalk.yellow('\n⚠️  IMPORTANT: Save these credentials securely! They will only be shown ONCE!'));
            console.log('\n📬 Address:', chalk.cyan(wallet.address));
            console.log('🔑 Private Key:', chalk.cyan(wallet.privateKey));
            console.log('🔐 Secret Recovery Phrase:', chalk.cyan(wallet.mnemonic));
            console.log(chalk.yellow('\n⚠️  WARNING:'));
            console.log(chalk.yellow('  • Never share your private key or recovery phrase with anyone!'));
            console.log(chalk.yellow('  • Store them securely offline!'));
            console.log(chalk.yellow('  • If you lose them, you lose access to your funds!'));
            console.log(chalk.yellow('  • The CLI only stores your encrypted wallet - make sure to backup your credentials!'));
        } catch (error) {
            console.error(chalk.red('\n❌ Error creating wallet:', error.message));
        }
    });

// show current wallet address
program
    .command('wallet-address')
    .description('Show current wallet address')
    .action(() => {
        try {
            const wallet = getWallet();
            if (!wallet) {
                console.log(chalk.yellow('\n⚠️  No wallet found. Create one first with:'));
                console.log(chalk.cyan('bohrium create-wallet'));
                return;
            }
            console.log('\n📬 Your wallet address:', chalk.cyan(wallet.address));
        } catch (error) {
            console.error(chalk.red('\n❌ Error retrieving wallet:', error.message));
        }
    });

// Check balance command
program
  .command('balance')
  .description('Check your BOHR token balance')
  .action(() => {
    console.log(chalk.green('Fetching balance...'));
    const balance = miner.getBalance(config); // Assuming a getBalance function
    console.log(chalk.blue(`Your BOHR token balance is: ${balance}`));
  });

// Setup configuration
program
  .command('setup')
  .description('Configure mining settings')
  .action(async () => {
    const answers = await inquirer.prompt([
      { type: 'input', name: 'walletAddress', message: 'Enter your wallet address:' },
      { type: 'input', name: 'network', message: 'Enter the network to use (e.g., Mainnet):' },
    ]);

    console.log(chalk.green('Saving configuration...'));
    config.saveConfig(answers.walletAddress, answers.network); // Assuming a saveConfig function
    console.log(chalk.blue('Configuration saved.'));
  });

// Get current network
program
    .command('network')
    .description('Show current network')
    .action(() => {
        try {
            const currentNetwork = process.env.BOHRIUM_NETWORK || config.DEFAULT_NETWORK;
            console.log('\n🌐 Current network:', chalk.cyan(currentNetwork));
        } catch (error) {
            console.error(chalk.red('\n❌ Error getting network:', error.message));
        }
    });

// Change network
program
    .command('set-network')
    .description('Change the network (baseSepolia or baseMainnet)')
    .argument('<network>', 'Network to switch to')
    .action((network) => {
        try {
            config.validateNetwork(network);
            // Store network preference in environment
            process.env.BOHRIUM_NETWORK = network;
            console.log(chalk.green('\n✅ Network changed successfully!'));
            console.log('🌐 Current network:', chalk.cyan(network));
        } catch (error) {
            console.error(chalk.red('\n❌ Error changing network:', error.message));
            console.log(chalk.yellow('\nAvailable networks:'));
            Object.keys(config.ENV_CONFIG).forEach(net => {
                console.log(chalk.cyan(`- ${net}`));
            });
        }
    });

program.parse(process.argv);
