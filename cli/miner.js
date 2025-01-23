const { ethers } = require("ethers");
const { getNetworkConfig } = require("./config");
const { getWallet } = require("./wallet");

// Replace the existing network selection and config merge with:
const config = getNetworkConfig();

const MINING_ABI = [
    "function submitNonce(uint256 nonce) external",
    "function endRound() external",
    "function roundId() view returns (uint256)",
    "function roundStartTime() view returns (uint256)",
    "function bohriumToken() view returns (address)",
    "function bestHash() view returns (bytes32)",
    "function REWARD_AMOUNT() view returns (uint256)",
    "function currentReward() view returns (uint256)",
    "function roundEndTime() view returns (uint256)",
    "function roundDuration() view returns (uint256)",
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
    const wallet = await getWallet();
    if (!wallet) {
        throw new Error('No wallet found. Please create one first using "bohrium wallet create"');
    }
    
    // Connect the wallet to the provider
    const connectedWallet = wallet.connect(provider);
    const miningContract = new ethers.Contract(config.MINING_CONTRACT_ADDRESS, MINING_ABI, connectedWallet);
    const bohrTokenAddress = await miningContract.bohriumToken();
    
    console.log("\n🚀 Starting Bohrium Mining...");
    console.log(`📍 Mining Contract: ${config.MINING_CONTRACT_ADDRESS}`);
    console.log(`📍 BOHR Token Address: ${bohrTokenAddress}`);
    
    const bohrToken = new ethers.Contract(bohrTokenAddress, TOKEN_ABI, connectedWallet);
    
    await logBalances(provider, connectedWallet, bohrToken);

    let lastRoundId = 0;

    while (true) {
        try {
            const roundId = await miningContract.roundId();
            const roundStart = BigInt(await miningContract.roundStartTime());
            const roundDuration = BigInt(await miningContract.roundDuration());
            const currentTime = BigInt(Math.floor(Date.now() / 1000));
            const roundAge = Number(currentTime - roundStart);

            // Log new round information
            if (roundId !== lastRoundId) {
                console.log(`\n📊 Round ${roundId} Started`);
                await logBalances(provider, connectedWallet, bohrToken);
                lastRoundId = roundId;
            }

            // If round duration has passed plus buffer, try to end it
            if (roundAge >= Number(roundDuration) + config.END_ROUND_WAIT) {
                console.log("\n🏁 Attempting to end round...");
                const tx = await miningContract.endRound({
                    gasLimit: Math.floor(config.GAS_MULTIPLIER * config.BASE_GAS_LIMIT)
                });
                await tx.wait(config.CONFIRMATIONS);
                console.log("✅ Round ended successfully");
                await logBalances(provider, connectedWallet, bohrToken);
                continue;
            }

            // If we're in the waiting period, show countdown
            if (roundAge >= Number(roundDuration)) {
                const remainingWait = (Number(roundDuration) + config.END_ROUND_WAIT) - roundAge;
                await countdownLog("⏳ Waiting before ending round:", remainingWait);
                continue;
            }

            // Otherwise show current round status
            const timeLeft = Number(roundDuration) - roundAge;
            process.stdout.write(`\r⏳ Round ${roundId}: ${timeLeft}s remaining until round can be ended   `);
            await sleep(1000);

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

async function watchRounds() {
    const provider = new ethers.JsonRpcProvider(config.RPC_URL);
    const wallet = await getWallet();
    const connectedWallet = wallet.connect(provider);
    const miningContract = new ethers.Contract(config.MINING_CONTRACT_ADDRESS, MINING_ABI, connectedWallet);

    let lastRoundId = 0;

    while (true) {
        try {
            const roundId = await miningContract.roundId();
            const roundStart = BigInt(await miningContract.roundStartTime());
            const roundDuration = BigInt(await miningContract.roundDuration());
            const currentTime = BigInt(Math.floor(Date.now() / 1000));
            const roundAge = Number(currentTime - roundStart);

            // Log new round information
            if (roundId !== lastRoundId) {
                console.log(`\n📊 Round ${roundId} Started`);
                lastRoundId = roundId;
            }

            // If round duration has passed plus buffer, try to end it
            if (roundAge >= Number(roundDuration) + config.END_ROUND_WAIT) {
                console.log("\n🏁 Attempting to end round...");
                const tx = await miningContract.endRound({
                    gasLimit: Math.floor(config.GAS_MULTIPLIER * config.BASE_GAS_LIMIT)
                });
                await tx.wait(config.CONFIRMATIONS);
                console.log("✅ Round ended successfully");
                continue;
            }

            // If we're in the waiting period, show countdown
            if (roundAge >= Number(roundDuration)) {
                const remainingWait = (Number(roundDuration) + config.END_ROUND_WAIT) - roundAge;
                await countdownLog("⏳ Waiting before ending round:", remainingWait);
                continue;
            }

            // Otherwise show current round status
            const timeLeft = Number(roundDuration) - roundAge;
            process.stdout.write(`\r⏳ Round ${roundId}: ${timeLeft}s remaining until round can be ended   `);
            await sleep(1000);

        } catch (error) {
            console.error("\n❌ Error:", error.message);
            await sleep(1000);
        }
    }
}

module.exports = { mine, getETHBalance, getBohrBalance, getRewardAmount, watchRounds };