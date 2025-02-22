#!/usr/bin/env node

const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const path = require('path');
const { createWallet, getWallet } = require('./wallet');
const ethers = require('ethers');

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
            let credentials = null;  // Store credentials for reuse
            try {
                // Get wallet and store credentials
                ({ wallet, credentials } = await getWallet());
            } catch (error) {
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

                // Create wallet and store credentials
                ({ wallet, credentials } = await createWallet());
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
                await miner.mine(wallet, credentials);
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
      const {wallet} = await getWallet();
      if (!wallet) {
        console.log(chalk.yellow('\n⚠️  No wallet found. Create one first with:'));
        console.log(chalk.cyan('bohrium create-wallet'));
        return;
      }
      
      console.log(chalk.green('Start mining...'));
      console.log(chalk.blue(`Mining with wallet address: ${wallet.address}`));
      console.log('\n💡 Remember: Press Ctrl+C to stop mining safely');
      
      await miner.mine(wallet);
    } catch (error) {
      console.error(chalk.red('\n❌ Error starting mining:', error.message));
    }
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
            const { wallet } = await getWallet();
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

// Add after other wallet-related commands
program
    .command('reveal-credentials')
    .description('Securely reveal wallet credentials')
    .action(async () => {
        try {
            console.log(chalk.yellow('\n⚠️  WARNING: You are about to reveal sensitive wallet information'));
            console.log(chalk.yellow('Never share these credentials with anyone!'));

            const { wallet, credentials } = await getWallet();
            
            if (!wallet) {
                console.log(chalk.red('\n❌ Invalid password or no wallet found'));
                return;
            }

            console.log(chalk.green('\n✅ Credentials verified'));
            console.log(chalk.yellow('\n⚠️  IMPORTANT: Store these securely and never share them!'));
            console.log('\n📬 Address:', chalk.cyan(wallet.address));
            console.log('🔑 Private Key:', chalk.cyan(wallet.privateKey));
            
            if (wallet.mnemonic?.phrase) {
                console.log('🔐 Secret Recovery Phrase:', chalk.cyan(wallet.mnemonic.phrase));
            } else {
                console.log('🔐 Secret Recovery Phrase:', chalk.gray('Not available for this wallet'));
            }

            console.log(chalk.yellow('\n⚠️  WARNING:'));
            console.log(chalk.yellow('  • Clear your terminal history after viewing these credentials'));
            console.log(chalk.yellow('  • Never store these credentials in plain text'));
            console.log(chalk.yellow('  • If someone gets access to these, they can steal your funds'));

        } catch (error) {
            console.error(chalk.red('\n❌ Error revealing credentials:', error.message));
        }
    });

// Add after other commands
program
    .command('withdraw')
    .description('Withdraw ETH or BOHR from your wallet')
    .action(async () => {
        try {
            const { wallet } = await getWallet();
            if (!wallet) {
                console.log(chalk.red('\n❌ No wallet found. Create one first with:'));
                console.log(chalk.cyan('bohrium create-wallet'));
                return;
            }

            // Show current balances
            console.log(chalk.gray('\nFetching current balances...'));
            const ethBalance = await miner.getETHBalance(wallet.address);
            const bohrBalance = await miner.getBohrBalance(wallet.address);
            
            console.log('\n📊 Current balances:');
            console.log(`ETH: ${chalk.cyan(ethBalance)} ETH`);
            console.log(`BOHR: ${chalk.cyan(bohrBalance)} BOHR`);

            // Get withdrawal details
            const tokenAnswer = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'token',
                    message: 'Which token would you like to withdraw?',
                    choices: ['ETH', 'BOHR']
                }
            ]);

            const maxBalance = tokenAnswer.token === 'ETH' ? ethBalance : bohrBalance;

            const withdrawalDetails = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'address',
                    message: 'Enter the destination address:',
                    validate: (input) => {
                        return ethers.isAddress(input) || 'Please enter a valid Ethereum address';
                    }
                },
                {
                    type: 'input',
                    name: 'amount',
                    message: 'Enter the amount to withdraw:',
                    validate: (input) => {
                        if (isNaN(input) || input <= 0) return 'Please enter a valid number';
                        return parseFloat(input) <= parseFloat(maxBalance) || 'Amount exceeds balance';
                    }
                }
            ]);

            const confirmation = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: `Confirm sending ${withdrawalDetails.amount} ${tokenAnswer.token} to ${withdrawalDetails.address}?`,
                    default: false
                }
            ]);

            if (!confirmation.confirm) {
                console.log(chalk.yellow('\n❌ Transaction cancelled'));
                return;
            }

            console.log(chalk.gray('\nProcessing withdrawal...'));
            
            let tx;
            if (tokenAnswer.token === 'ETH') {
                tx = await miner.withdrawETH(wallet, withdrawalDetails.address, withdrawalDetails.amount);
            } else {
                tx = await miner.withdrawBOHR(wallet, withdrawalDetails.address, withdrawalDetails.amount);
            }

            console.log(chalk.gray('\nWaiting for confirmation...'));
            await tx.wait();
            
            console.log(chalk.green('\n✅ Withdrawal successful!'));
            console.log('Transaction hash:', chalk.cyan(tx.hash));
            
            // Show updated balances
            console.log(chalk.gray('\nFetching updated balances...'));
            const newEthBalance = await miner.getETHBalance(wallet.address);
            const newBohrBalance = await miner.getBohrBalance(wallet.address);
            
            console.log('\n📊 Updated balances:');
            console.log(`ETH: ${chalk.cyan(newEthBalance)} ETH`);
            console.log(`BOHR: ${chalk.cyan(newBohrBalance)} BOHR`);

        } catch (error) {
            console.error(chalk.red('\n❌ Error processing withdrawal:', error.message));
        }
    });

program.parse(process.argv);
