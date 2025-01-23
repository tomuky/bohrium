const { ethers } = require("ethers");
const { COMMON_CONFIG, ENV_CONFIG, getNetworkConfig } = require("./config");

// Replace the existing network selection and config merge with:
const network = process.env.BOHRIUM_NETWORK;
const config = getNetworkConfig(network);

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

async function mine(createdWallet) {
    const provider = new ethers.JsonRpcProvider(config.RPC_URL);
    const wallet = createdWallet.connect(provider);
    const miningContract = new ethers.Contract(config.MINING_CONTRACT_ADDRESS, MINING_ABI, wallet);
    const bohrTokenAddress = await miningContract.bohriumToken();
    
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
                    // Updated progress callback
                    (remainingTime, hashRate) => {
                        const remaining = Math.ceil(remainingTime / 1000);
                        const hashRateFormatted = (hashRate / 1000).toFixed(2); // Convert to kH/s
                        process.stdout.write(`\r⛏️  Mining... ${remaining}s remaining | Hash rate: ${hashRateFormatted} kH/s   `);
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
    
    // Add hash rate tracking
    let hashCount = 0;
    let lastHashRateUpdate = Date.now();
    let currentHashRate = 0;

    // Get the current bestHash from the contract
    const currentBestHash = await miningContract.bestHash();

    while (Date.now() < endTime) {
        // Update progress and hash rate every 100ms
        if (Date.now() - lastProgressUpdate > 100) {
            const now = Date.now();
            // Calculate hash rate
            const timeDiff = (now - lastHashRateUpdate) / 1000; // convert to seconds
            currentHashRate = Math.floor(hashCount / timeDiff);
            
            process.stdout.write(`\r⛏️  Mining... ${Math.ceil((endTime - now) / 1000)}s remaining | Hash rate: ${(currentHashRate / 1000).toFixed(2)} kH/s   `);
            lastProgressUpdate = now;
        }

        for (let i = 0; i < config.MINING_BATCH_SIZE; i++) {
            const nonce = Math.floor(Math.random() * config.NONCE_RANGE);
            const hash = ethers.keccak256(
                ethers.solidityPacked(
                    ["address", "bytes32", "uint256"],
                    [minerAddress, currentBestHash, nonce]
                )
            );

            hashCount++;
            const hashValue = BigInt(hash);
            if (hashValue < bestHash) {
                bestHash = hashValue;
                bestNonce = nonce;
            }
        }
        
        await new Promise(r => setImmediate(r));
    }

    // Add a newline after mining is complete
    process.stdout.write('\n');
    return bestNonce;
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log("\n\n👋 Mining stopped");
    process.exit();
});

module.exports = { mine };