#!/usr/bin/env node

const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const path = require('path');
const { createWallet, getWallet } = require('./wallet');

// Import mining script
const miner = require(path.resolve(__dirname, './miner'));
const config = require(path.resolve(__dirname, './config'));

const program = new Command();

program
  .name('bohrium')
  .description('CLI tool for mining BOHR')
  .version('1.0.0');

// 1. Interactive start command
program
    .command('start')
    .description('Interactive guide to start mining BOHR')
    .action(async () => {
        try {
            console.log(chalk.cyan('\n🚀 Welcome to Bohrium Mining! Let\'s get you set up.\n'));
            
            // Step 1: Check/Create Wallet
            let wallet = null;
            try {
                wallet = await getWallet();
            } catch (error) {
                // If there's an error getting the wallet, we'll create a new one
                wallet = null;
            }

            if (!wallet) {
                console.log(chalk.yellow('Step 1: Creating a new wallet\n'));
                console.log('You\'ll need a wallet to store your mining rewards.');
                const proceed = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'createWallet',
                        message: 'Would you like to create a new wallet now?',
                        default: true
                    }
                ]);

                if (!proceed.createWallet) {
                    console.log(chalk.red('\n❌ A wallet is required to mine. Exiting...'));
                    return;
                }

                wallet = await createWallet();
                console.log(chalk.green('\n✅ Wallet created successfully!'));
                console.log('\n⚠️  IMPORTANT: Please store your recovery phrase and private key safely!');
            } else {
                console.log(chalk.green('\n✅ Using existing wallet'));
            }

            // Step 2: Display funding instructions
            console.log(chalk.yellow('\nStep 2: Fund your wallet\n'));
            console.log('To start mining, you\'ll need a small amount of ETH in your wallet to pay for transaction fees.');
            console.log('\n📬 Your wallet address:', chalk.cyan(wallet.address));
            console.log('\nPlease send some ETH (0.01-0.05 ETH recommended) to this address.');
            
            const waitForFunds = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'funded',
                    message: 'Have you funded your wallet with ETH?',
                    default: false
                }
            ]);

            if (!waitForFunds.funded) {
                console.log(chalk.yellow('\nCome back and run "bohrium start" again once you\'ve funded your wallet!'));
                return;
            }

            // Step 3: Start Mining
            console.log(chalk.yellow('\nStep 3: Start Mining\n'));
            console.log('You\'re all set! Here are some important things to know:');
            console.log(chalk.cyan('\n• Mining will run continuously until you stop it'));
            console.log(chalk.cyan('• You can stop mining at any time by pressing Ctrl+C'));
            console.log(chalk.cyan('• Use "bohrium wallet" to check your balances'));
            console.log(chalk.cyan('• Mining rewards are paid in BOHR tokens\n'));

            const startMining = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'begin',
                    message: 'Ready to start mining?',
                    default: true
                }
            ]);

            if (startMining.begin) {
                console.log(chalk.green('\n🎮 Starting mining process...'));
                console.log(chalk.gray('Press Ctrl+C at any time to stop mining\n'));
                await miner.mine();
            } else {
                console.log(chalk.yellow('\nOK! You can start mining later using "bohrium mine"'));
            }

        } catch (error) {
            console.error(chalk.red('\n❌ Error during setup:', error.message));
        }
    });

// 2. Start mining command
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

// 3. Check balance command
program
  .command('balance')
  .description('Check your BOHR token balance')
  .action(() => {
    console.log(chalk.green('Fetching balance...'));
    const balance = miner.getBalance(config); // Assuming a getBalance function
    console.log(chalk.blue(`Your BOHR token balance is: ${balance}`));
  });

// 4. Create wallet command
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

// 5. Comprehensive wallet info command
program
    .command('wallet')
    .description('Show wallet information including address and balances')
    .action(async () => {
        try {
            const wallet = getWallet();
            if (!wallet) {
                console.log(chalk.yellow('\n⚠️  No wallet found. Create one first with:'));
                console.log(chalk.cyan('bohrium create-wallet'));
                return;
            }

            console.log(chalk.bold('\n📊 Wallet Information:'));
            console.log('📬 Address:', chalk.cyan(wallet.address));
            
            const network = config.getCurrentNetwork();
            console.log('🌐 Network:', chalk.cyan(network));

            console.log(chalk.gray('\nFetching balances...'));
            
            try {
                const ethBalance = await miner.getETHBalance(wallet.address);
                console.log('💎 ETH Balance:', chalk.cyan(ethBalance));
            } catch (error) {
                console.log('💎 ETH Balance:', chalk.red('Error fetching ETH balance'));
            }

            try {
                const bohrBalance = await miner.getBohrBalance(wallet.address);
                console.log('🪙 BOHR Balance:', chalk.cyan(bohrBalance));
            } catch (error) {
                console.log('🪙 BOHR Balance:', chalk.red('Error fetching BOHR balance'));
            }
        } catch (error) {
            console.error(chalk.red('\n❌ Error retrieving wallet information:', error.message));
        }
    });

// 6. Get current network
program
    .command('network')
    .description('Show current network')
    .action(() => {
        try {
            const currentNetwork = config.getCurrentNetwork();
            console.log('\n🌐 Current network:', chalk.cyan(currentNetwork));
        } catch (error) {
            console.error(chalk.red('\n❌ Error getting network:', error.message));
        }
    });

// 7. Change network
program
    .command('set-network')
    .description('Change the network (baseSepolia or baseMainnet)')
    .argument('<network>', 'Network to switch to')
    .action((network) => {
        try {
            config.validateNetwork(network);
            config.saveNetwork(network);
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

// 8. Get current reward amount
program
    .command('reward-amount')
    .description('Show current mining reward amount')
    .action(async () => {
        try {
            console.log(chalk.gray('\nFetching current reward amount...'));
            const rewardAmount = await miner.getRewardAmount();
            console.log('🎁 Current reward per round:', chalk.cyan(`${rewardAmount} BOHR`));
        } catch (error) {
            console.error(chalk.red('\n❌ Error fetching reward amount:', error.message));
        }
    });

// 9. Setup configuration
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

program.parse(process.argv);
