const { ethers } = require("ethers");
const { getNetworkConfig } = require("./config");
const { getWallet } = require("./wallet");

// Replace the existing network selection and config merge with:
const config = getNetworkConfig();

const MINING_ABI = [
    // Human-readable function signatures
    "function submitBlock(uint256 nonce) external",
    "function currentReward() view returns (uint256)",
    "function currentDifficulty() view returns (uint256)",
    "function lastBlockHash() view returns (bytes32)",
    "function blockHeight() view returns (uint256)",
    "function bohriumToken() view returns (address)",

    // Events
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "address", "name": "miner", "type": "address"},
            {"indexed": true, "internalType": "uint256", "name": "blockHeight", "type": "uint256"},
            {"indexed": false, "internalType": "uint256", "name": "nonce", "type": "uint256"},
            {"indexed": false, "internalType": "uint256", "name": "reward", "type": "uint256"},
            {"indexed": false, "internalType": "uint256", "name": "timeTaken", "type": "uint256"}
        ],
        "name": "BlockMined",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": false, "internalType": "uint256", "name": "newDifficulty", "type": "uint256"}
        ],
        "name": "DifficultyAdjusted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": false, "internalType": "uint256", "name": "newReward", "type": "uint256"}
        ],
        "name": "RewardHalved",
        "type": "event"
    }
];

const TOKEN_ABI = [
    {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "balance", type: "uint256" }]
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    },
    {
        "name": "transfer",
        "type": "function",
        "inputs": [
            {
                "name": "recipient",
                "type": "address"
            },
            {
                "name": "amount",
                "type": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ]
    }
];

async function formatBalance(balance) {
    return ethers.formatEther(balance);
}

async function logBalances(provider, wallet, bohrToken) {
    const ethBalance = await provider.getBalance(wallet.address);
    const bohrBalance = await bohrToken.balanceOf(wallet.address);
    
    console.log('\n💰 Balances:');
    console.log(`   ETH: ${await formatBalance(ethBalance)} ETH`);
    console.log(`   BOHR: ${await formatBalance(bohrBalance)} BOHR`);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function countdownLog(message, seconds) {
    process.stdout.write(`\r${message} ${seconds}s`);
    for (let i = seconds - 1; i >= 0; i--) {
        await sleep(1000);
        process.stdout.write(`\r${message} ${i}s   `);
    }
    console.log(); // New line after countdown
}

async function mine(providedWallet = null) {
    try {
        const provider = new ethers.JsonRpcProvider(config.RPC_URL);
        
        // Add RPC connection check
        await provider.getNetwork().catch(() => {
            throw new Error(`Cannot connect to ${config.RPC_URL}. Please check your internet connection.`);
        });

        // Add more specific error handling
        if (!providedWallet) {
            const walletData = await getWallet();
            if (!walletData.wallet) {
                throw new Error('No wallet found. Run "bohrium create-wallet" first.');
            }
            providedWallet = walletData.wallet;
        }
        
        const connectedWallet = providedWallet.connect(provider);
        const miningContract = new ethers.Contract(config.MINING_CONTRACT_ADDRESS, MINING_ABI, connectedWallet);
        const bohrTokenAddress = await miningContract.bohriumToken();
        
        console.log("\n🚀 Starting Bohrium Mining...");
        console.log(`📍 Mining Contract: ${config.MINING_CONTRACT_ADDRESS}`);
        console.log(`📍 BOHR Token Address: ${bohrTokenAddress}`);
        
        const bohrToken = new ethers.Contract(bohrTokenAddress, TOKEN_ABI, connectedWallet);
        await logBalances(provider, connectedWallet, bohrToken);

        let currentDifficulty = await miningContract.currentDifficulty();
        let lastBlockHash = await miningContract.lastBlockHash();
        let blockHeight = await miningContract.blockHeight();

        let lastReminderTime = Date.now();
        const REMINDER_INTERVAL = 5 * 60 * 1000; // Show reminder every 5 minutes

        while (true) {
            try {
                // Show periodic reminder
                const currentTime = Date.now();
                if (currentTime - lastReminderTime >= REMINDER_INTERVAL) {
                    console.log('\n💡 Remember: Press Ctrl+C to stop mining safely');
                    lastReminderTime = currentTime;
                }

                // Check wallet balance periodically
                const balance = await provider.getBalance(connectedWallet.address);
                const estimatedGas = Math.floor(config.BASE_GAS_LIMIT * config.GAS_MULTIPLIER);
                const feeData = await provider.getFeeData();
                const requiredBalance = BigInt(estimatedGas) * feeData.gasPrice;

                if (BigInt(balance) < BigInt(requiredBalance)) {
                    console.error("\n❌ Insufficient ETH balance for gas fees");
                    return;
                }

                // Check for new block parameters
                const newBlockHash = await miningContract.lastBlockHash();
                if (newBlockHash !== lastBlockHash) {
                    const newDifficulty = await miningContract.currentDifficulty();
                    const newBlockHeight = await miningContract.blockHeight();
                    
                    console.log(`\n📊 New Block #${newBlockHeight}`);
                    if (newDifficulty !== currentDifficulty) {
                        console.log(`📈 Difficulty changed: 0x${newDifficulty.toString(16)}`);
                    }
                    
                    currentDifficulty = newDifficulty;
                    lastBlockHash = newBlockHash;
                    blockHeight = newBlockHeight;
                    await logBalances(provider, connectedWallet, bohrToken);
                }

                const result = await findValidNonce(
                    connectedWallet.address,
                    lastBlockHash,
                    currentDifficulty,
                    (hashRate) => {
                        // Convert to number and divide by 1000 with decimal precision
                        const hashRateFormatted = formatHashRate(hashRate);
                        process.stdout.write(`\r⛏️  Mining... Hash rate: ${hashRateFormatted}   `);
                    }
                );

                if (result?.nonce) {
                    console.log('\n✨ Found valid nonce:', result.nonce);
                    const tx = await miningContract.submitBlock(result.nonce, {
                        gasLimit: Math.floor(config.GAS_MULTIPLIER * config.BASE_GAS_LIMIT)
                    });
                    process.stdout.write('📝 Confirming transaction...');
                    const receipt = await tx.wait(config.CONFIRMATIONS);
                    
                    // Find and parse the BlockMined event
                    const miningEvent = receipt.logs.find(log => {
                        try {
                            return miningContract.interface.parseLog(log)?.name === 'BlockMined';
                        } catch {
                            return false;
                        }
                    });

                    if (miningEvent) {
                        const args = miningContract.interface.parseLog(miningEvent).args;
                        const reward = ethers.formatEther(args.reward);
                        console.log(`\n🎉 Successfully mined block #${args.blockHeight} - Earned ${reward} BOHR`);
                        await logBalances(provider, connectedWallet, bohrToken);
                    }
                }

            } catch (error) {
                console.error("\n❌ Error:", error.message);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    } catch (error) {
        if (error.code === 'NETWORK_ERROR') {
            console.error('\n❌ Network connection lost. Please check your internet connection.');
        } else if (error.code === 'INSUFFICIENT_FUNDS') {
            console.error('\n❌ Insufficient ETH for gas fees. Please fund your wallet.');
        } else {
            console.error('\n❌ Error:', error.message);
        }
        process.exit(1);
    }
}

async function findValidNonce(minerAddress, blockHash, difficulty, onProgress) {
    const randomBuffer = new Uint32Array(config.MINING_BATCH_SIZE);
    let hashCount = 0;
    let lastHashRateUpdate = Date.now();
    let bestHash = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    
    while (true) {
        crypto.getRandomValues(randomBuffer);

        const now = Date.now();
        if (now - lastHashRateUpdate >= 1000) {
            onProgress(hashCount);
            hashCount = 0;
            lastHashRateUpdate = now;
        }

        for (let i = 0; i < config.MINING_BATCH_SIZE; i++) {
            const nonce = randomBuffer[i];
            const hash = ethers.keccak256(
                ethers.solidityPacked(
                    ["address", "bytes32", "uint256", "uint256"],
                    [minerAddress, blockHash, difficulty, nonce]
                )
            );

            const hashValue = BigInt(hash);
            
            if (hashValue < bestHash) {
                bestHash = hashValue;
            }
            
            if (hashValue <= difficulty) {
                return { nonce, hashValue };
            }
        }
        hashCount += config.MINING_BATCH_SIZE;
        
        await new Promise(resolve => setImmediate(resolve));
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log("\n\n👋 Mining stopped");
    process.exit();
});

async function getETHBalance(address) {
    const provider = new ethers.JsonRpcProvider(config.RPC_URL);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
}

async function getBohrBalance(address) {
    const provider = new ethers.JsonRpcProvider(config.RPC_URL);
    const miningContract = new ethers.Contract(config.MINING_CONTRACT_ADDRESS, MINING_ABI, provider);
    const bohrTokenAddress = await miningContract.bohriumToken();
    const bohrToken = new ethers.Contract(bohrTokenAddress, TOKEN_ABI, provider);
    const balance = await bohrToken.balanceOf(address);
    return ethers.formatEther(balance);
}

async function getRewardAmount() {
    const provider = new ethers.JsonRpcProvider(config.RPC_URL);
    const miningContract = new ethers.Contract(config.MINING_CONTRACT_ADDRESS, MINING_ABI, provider);
    const rewardAmountWei = await miningContract.currentReward();
    return ethers.formatEther(rewardAmountWei);
}

function formatHashRate(hashesPerSecond) {
    if (hashesPerSecond < 1000) {
        return `${hashesPerSecond.toFixed(1)} H/s`;
    } else if (hashesPerSecond < 1000000) {
        return `${(hashesPerSecond / 1000).toFixed(1)} kH/s`;
    } else if (hashesPerSecond < 1000000000) {
        return `${(hashesPerSecond / 1000000).toFixed(1)} MH/s`;
    } else {
        return `${(hashesPerSecond / 1000000000).toFixed(1)} GH/s`;
    }
}

async function withdrawETH(wallet, toAddress, amount) {
    const provider = new ethers.JsonRpcProvider(config.RPC_URL);
    const connectedWallet = wallet.connect(provider);
    
    // Convert amount from ETH to Wei
    const amountWei = ethers.parseEther(amount);
    
    // Get current balance
    const balance = await provider.getBalance(wallet.address);
    if (balance < amountWei) {
        throw new Error('Insufficient ETH balance');
    }

    // Estimate gas for the transfer
    const gasLimit = 21000; // Standard ETH transfer gas
    const feeData = await provider.getFeeData();
    const gasCost = BigInt(gasLimit) * feeData.gasPrice;
    
    // Check if we have enough ETH for transfer + gas
    if (balance < (amountWei + gasCost)) {
        throw new Error('Insufficient ETH balance to cover amount + gas fees');
    }

    // Send transaction
    const tx = await connectedWallet.sendTransaction({
        to: toAddress,
        value: amountWei,
        gasLimit: gasLimit
    });

    return tx;
}

async function withdrawBOHR(wallet, toAddress, amount) {
    const provider = new ethers.JsonRpcProvider(config.RPC_URL);
    const connectedWallet = wallet.connect(provider);
    
    // Get BOHR token contract
    const miningContract = new ethers.Contract(config.MINING_CONTRACT_ADDRESS, MINING_ABI, provider);
    const bohrTokenAddress = await miningContract.bohriumToken();
    const bohrToken = new ethers.Contract(bohrTokenAddress, TOKEN_ABI, connectedWallet);
    
    // Convert amount from BOHR to Wei
    const amountWei = ethers.parseEther(amount);
    
    // Check balance
    const balance = await bohrToken.balanceOf(wallet.address);
    if (balance < amountWei) {
        throw new Error('Insufficient BOHR balance');
    }

    // Send transaction
    const tx = await bohrToken.transfer(toAddress, amountWei, {
        gasLimit: Math.floor(config.BASE_GAS_LIMIT * config.GAS_MULTIPLIER)
    });

    return tx;
}

module.exports = {
    mine,
    getETHBalance,
    getBohrBalance,
    getRewardAmount,
    withdrawETH,
    withdrawBOHR
};