const { ethers } = require("ethers");
const { COMMON_CONFIG, ENV_CONFIG } = require("./miner-config");

// Get network from command line argument or default to local
const network = process.argv[2] || 'local';
if (!ENV_CONFIG[network]) {
    console.error(`Invalid network: ${network}. Available networks: ${Object.keys(ENV_CONFIG).join(', ')}`);
    process.exit(1);
}

// Merge configs
const config = {
    ...COMMON_CONFIG,
    ...ENV_CONFIG[network]
};

const MINING_ABI = [
    "function submitNonce(uint256 nonce) external",
    "function endRound() external",
    "function roundId() view returns (uint256)",
    "function roundStartTime() view returns (uint256)",
    "function bohriumToken() view returns (address)",
    "function bestHash() view returns (bytes32)"
];

const TOKEN_ABI = [
    "function balanceOf(address account) view returns (uint256)"
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

async function mine() {
    const provider = new ethers.JsonRpcProvider(config.RPC_URL);
    const wallet = new ethers.Wallet(config.PRIVATE_KEY, provider);
    const miningContract = new ethers.Contract(config.MINING_CONTRACT_ADDRESS, MINING_ABI, wallet);
    const bohrTokenAddress = await miningContract.bohriumToken();
    
    console.log(`\n🌍 Network: ${network}`);
    console.log("\n🚀 Starting Bohrium Mining...");
    console.log(`📍 Mining Contract: ${config.MINING_CONTRACT_ADDRESS}`);
    console.log(`📍 BOHR Token Address: ${bohrTokenAddress}`);
    
    const bohrToken = new ethers.Contract(bohrTokenAddress, TOKEN_ABI, wallet);
    

    await logBalances(provider, wallet, bohrToken);

    let lastRoundId = 0;

    while (true) {
        try {
            const roundId = await miningContract.roundId();
            const roundStart = BigInt(await miningContract.roundStartTime());
            const currentTime = BigInt(Math.floor(Date.now() / 1000));
            const roundAge = Number(currentTime - roundStart);

            if (roundId !== lastRoundId) {
                console.log(`\n📊 Round ${roundId} Started`);
                await logBalances(provider, wallet, bohrToken);
                lastRoundId = roundId;
            }

            // If round is old enough plus our wait period, end it
            if (roundAge >= config.MIN_ROUND_DURATION + config.END_ROUND_WAIT) {
                console.log("\n🏁 Ending round...");
                const tx = await miningContract.endRound();
                await tx.wait();
                console.log("✅ Round ended successfully");
                await logBalances(provider, wallet, bohrToken);
                continue;
            }

            // If we're in the end-round waiting period, just wait
            if (roundAge >= config.MIN_ROUND_DURATION) {
                const remainingWait = (config.MIN_ROUND_DURATION + config.END_ROUND_WAIT) - roundAge;
                await countdownLog("⏳ Waiting before ending round:", remainingWait);
                continue;
            }

            // Calculate mining duration
            const miningDuration = Math.max(0, config.MIN_ROUND_DURATION - roundAge - config.TX_BUFFER);
            
            if (miningDuration > 0) {
                const startTime = Date.now();
                const endTime = startTime + (miningDuration * 1000);
                
                const bestNonce = await findBestNonce(wallet.address, miningDuration * 1000, miningContract,
                    // Progress callback
                    (remainingTime) => {
                        const remaining = Math.ceil(remainingTime / 1000);
                        process.stdout.write(`\r⛏️  Mining... ${remaining}s remaining   `);
                    }
                );
                console.log('\n✨ Found best nonce:', bestNonce);
                
                const tx = await miningContract.submitNonce(bestNonce, {
                    gasLimit: Math.floor(config.GAS_MULTIPLIER * config.BASE_GAS_LIMIT)
                });
                process.stdout.write('📝 Confirming transaction...');
                await tx.wait(config.CONFIRMATIONS);
                console.log('\r✅ Nonce submitted successfully    ');
            }

        } catch (error) {
            console.error("\n❌ Error:", error.message);
            await sleep(1000);
        }
    }
}

async function findBestNonce(minerAddress, duration, miningContract, onProgress) {
    let bestNonce = 0;
    let bestHash = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    const endTime = Date.now() + duration;
    let lastProgressUpdate = Date.now();

    // Get the current bestHash from the contract
    const currentBestHash = await miningContract.bestHash();

    while (Date.now() < endTime) {
        // Update progress every 100ms
        if (Date.now() - lastProgressUpdate > 100) {
            onProgress?.(endTime - Date.now());
            lastProgressUpdate = Date.now();
        }

        for (let i = 0; i < config.MINING_BATCH_SIZE; i++) {
            const nonce = Math.floor(Math.random() * config.NONCE_RANGE);
            const hash = ethers.keccak256(
                ethers.solidityPacked(
                    ["address", "bytes32", "uint256"],
                    [minerAddress, currentBestHash, nonce]
                )
            );

            const hashValue = BigInt(hash);
            if (hashValue < bestHash) {
                bestHash = hashValue;
                bestNonce = nonce;
            }
        }
        
        // Yield to event loop occasionally
        await new Promise(r => setImmediate(r));
    }

    return bestNonce;
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log("\n\n👋 Mining stopped");
    process.exit();
});

mine().catch(console.error);