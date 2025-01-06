require('dotenv').config();
const { ethers } = require("ethers");

// Load environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INFURA_URL = process.env.INFURA_URL;
const MINING_CONTRACT_ADDRESS = process.env.MINING_CONTRACT_ADDRESS;

// Connect to Base Sepolia network
const provider = new ethers.providers.JsonRpcProvider(INFURA_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// ABI (Application Binary Interface) of BohriumMining contract
const MINING_CONTRACT_ABI = [
    "function roundId() public view returns (uint256)",
    "function submitHash(uint256 nonce) public",
];

// Initialize contract
const miningContract = new ethers.Contract(MINING_CONTRACT_ADDRESS, MINING_CONTRACT_ABI, wallet);

// Mining parameters
const MAX_NONCE = 100000;  // Number of nonces to try

async function mineBestNonce() {
    console.log("Starting off-chain mining...");

    // Get the current round ID
    const roundId = await miningContract.roundId();
    console.log(`Current round ID: ${roundId}`);

    let bestNonce = 0;
    let bestHash = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

    // Brute-force nonces to find the best hash
    for (let nonce = 1; nonce <= MAX_NONCE; nonce++) {
        // Generate the hash using keccak256
        const hash = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(["uint256", "address", "uint256"], [roundId, wallet.address, nonce])
        );

        const hashValue = BigInt(hash);

        // Keep track of the smallest hash
        if (hashValue < bestHash) {
            bestHash = hashValue;
            bestNonce = nonce;
        }

        if (nonce % 10000 === 0) {
            console.log(`Checked ${nonce} nonces...`);
        }
    }

    console.log(`Best nonce found: ${bestNonce} (Hash: ${bestHash.toString(16)})`);

    // Submit the best nonce on-chain
    const tx = await miningContract.submitHash(bestNonce);
    console.log(`Transaction submitted! Hash: ${tx.hash}`);
    await tx.wait();
    console.log("Transaction confirmed!");
}

mineBestNonce().catch((error) => {
    console.error("Error mining:", error);
});
