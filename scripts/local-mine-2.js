const { ethers } = require("ethers");

// Configuration
const MINING_CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const MIN_ROUND_DURATION = 60;
const NONCE_RANGE = 100000;
const MINING_BATCH_SIZE = 1000;
const TX_BUFFER = 3;
const END_ROUND_WAIT = 5;

const MINING_ABI = [
    "function submitNonce(uint256 nonce) external",
    "function endRound() external",
    "function roundId() view returns (uint256)",
    "function roundStartTime() view returns (uint256)",
    "function bohriumToken() view returns (address)"
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
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const wallet = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider);
    const miningContract = new ethers.Contract(MINING_CONTRACT_ADDRESS, MINING_ABI, wallet);
    
    const bohrTokenAddress = await miningContract.bohriumToken();
    const bohrToken = new ethers.Contract(bohrTokenAddress, TOKEN_ABI, wallet);
    
    console.log("\n🚀 Starting Bohrium Mining...");
    console.log(`📍 BOHR Token Address: ${bohrTokenAddress}`);
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
            if (roundAge >= MIN_ROUND_DURATION + END_ROUND_WAIT) {
                console.log("\n🏁 Ending round...");
                const tx = await miningContract.endRound();
                await tx.wait();
                console.log("✅ Round ended successfully");
                await logBalances(provider, wallet, bohrToken);
                continue;
            }

            // If we're in the end-round waiting period, just wait
            if (roundAge >= MIN_ROUND_DURATION) {
                const remainingWait = (MIN_ROUND_DURATION + END_ROUND_WAIT) - roundAge;
                await countdownLog("⏳ Waiting before ending round:", remainingWait);
                continue;
            }

            // Calculate mining duration
            const miningDuration = Math.max(0, MIN_ROUND_DURATION - roundAge - TX_BUFFER);
            
            if (miningDuration > 0) {
                const startTime = Date.now();
                const endTime = startTime + (miningDuration * 1000);
                
                const bestNonce = await findBestNonce(roundId, wallet.address, miningDuration * 1000, 
                    // Progress callback
                    (remainingTime) => {
                        const remaining = Math.ceil(remainingTime / 1000);
                        process.stdout.write(`\r⛏️  Mining... ${remaining}s remaining   `);
                    }
                );
                console.log('\n✨ Found best nonce:', bestNonce);
                
                const tx = await miningContract.submitNonce(bestNonce);
                process.stdout.write('📝 Confirming transaction...');
                await tx.wait();
                console.log('\r✅ Nonce submitted successfully    ');
            }

        } catch (error) {
            console.error("\n❌ Error:", error.message);
            await sleep(1000);
        }
    }
}

async function findBestNonce(roundId, minerAddress, duration, onProgress) {
    let bestNonce = 0;
    let bestHash = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    const endTime = Date.now() + duration;
    let lastProgressUpdate = Date.now();

    while (Date.now() < endTime) {
        // Update progress every 100ms
        if (Date.now() - lastProgressUpdate > 100) {
            onProgress?.(endTime - Date.now());
            lastProgressUpdate = Date.now();
        }

        for (let i = 0; i < MINING_BATCH_SIZE; i++) {
            const nonce = Math.floor(Math.random() * NONCE_RANGE);
            const hash = ethers.keccak256(
                ethers.AbiCoder.defaultAbiCoder().encode(
                    ["uint256", "address", "uint256"],
                    [roundId, minerAddress, nonce]
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