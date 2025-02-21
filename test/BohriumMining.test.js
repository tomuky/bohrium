const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

// Clear console before tests
console.clear();

describe("Bohrium Mining System", function () {
    async function deployMiningSystemFixture() {
        const [owner, miner1, miner2] = await ethers.getSigners();

        // Deploy token
        const BohriumToken = await ethers.getContractFactory("BohriumToken");
        const token = await BohriumToken.deploy();

        // Deploy mining contract
        const Mining = await ethers.getContractFactory("BohriumMining");
        const mining = await Mining.deploy(await token.getAddress());

        // Transfer token ownership to mining contract
        await token.transferOwnership(await mining.getAddress());

        return { token, mining, owner, miner1, miner2 };
    }

    describe("Initial Setup", function () {
        it("should set the correct initial reward to 10 BOHR", async function () {
            const { mining } = await loadFixture(deployMiningSystemFixture);
            const reward = await mining.currentReward();
            expect(reward).to.equal(ethers.parseEther("10"));
        });

        it("should set the correct token address", async function () {
            const { mining, token } = await loadFixture(deployMiningSystemFixture);
            expect(await mining.bohriumToken()).to.equal(await token.getAddress());
        });

        it("should set initial difficulty", async function () {
            const { mining } = await loadFixture(deployMiningSystemFixture);
            const difficulty = await mining.currentDifficulty();
            expect(difficulty).to.equal(ethers.MaxUint256 >> 16n);
        });
    });

    describe("Mining Mechanics", function () {
        it("should reject hashes that don't meet difficulty", async function () {
            const { mining, miner1 } = await loadFixture(deployMiningSystemFixture);
            
            // Using a very high nonce to ensure hash is above difficulty
            const highNonce = ethers.MaxUint256;
            await expect(
                mining.connect(miner1).submitBlock(highNonce)
            ).to.be.revertedWith("Hash doesn't meet difficulty");
        });

        it("should accept valid blocks and mint rewards", async function () {
            const { mining, token, miner1 } = await loadFixture(deployMiningSystemFixture);
            
            // Temporarily increase the difficulty to make it easier to find a valid hash
            const difficulty = ethers.MaxUint256 >> 4n; // Much easier difficulty for testing
            await mining.setCurrentDifficulty(difficulty); // We'll need to add this function to the contract
            
            // Find a valid nonce (with a reasonable limit)
            let nonce = 0;
            let validNonce = null;
            const maxAttempts = 100;
            
            while (validNonce === null && nonce < maxAttempts) {
                const hash = ethers.keccak256(
                    ethers.solidityPacked(
                        ["address", "bytes32", "uint256", "uint256"],
                        [miner1.address, await mining.lastBlockHash(), difficulty, nonce]
                    )
                );
                if (BigInt(hash) <= difficulty) {
                    validNonce = nonce;
                    break;
                }
                nonce++;
            }
            
            // If we couldn't find a valid nonce, use a predetermined one for testing
            if (validNonce === null) {
                console.log("Could not find valid nonce, using test value");
                validNonce = 0;
            }
            
            await mining.connect(miner1).submitBlock(validNonce);
            const balance = await token.balanceOf(miner1.address);
            expect(balance).to.equal(ethers.parseEther("10"));
        });

        it("should update block height after successful mining", async function () {
            const { mining, miner1 } = await loadFixture(deployMiningSystemFixture);
            
            // Set an easier difficulty for testing
            const difficulty = ethers.MaxUint256 >> 4n;
            await mining.setCurrentDifficulty(difficulty);
            
            // Find a valid nonce (simplified for testing)
            let nonce = 0;
            let validNonce = null;
            
            while (validNonce === null && nonce < 100) {
                const hash = ethers.keccak256(
                    ethers.solidityPacked(
                        ["address", "bytes32", "uint256", "uint256"],
                        [miner1.address, await mining.lastBlockHash(), difficulty, nonce]
                    )
                );
                if (BigInt(hash) <= difficulty) {
                    validNonce = nonce;
                    break;
                }
                nonce++;
            }
            
            // If we couldn't find a valid nonce, use a predetermined one for testing
            if (validNonce === null) {
                validNonce = 0;
            }
            
            const initialHeight = await mining.blockHeight();
            await mining.connect(miner1).submitBlock(validNonce);
            expect(await mining.blockHeight()).to.equal(initialHeight + 1n);
        });
    });

    // hard to test
    describe("Difficulty Adjustment", function () {
        it("should adjust difficulty after DIFFICULTY_ADJUSTMENT_INTERVAL blocks", async function () {
            const { mining, miner1 } = await loadFixture(deployMiningSystemFixture);
            const ADJUSTMENT_INTERVAL = 360; // 6 hours worth of blocks
            
            // Set a known difficulty
            await mining.setCurrentDifficulty(1000);
            const initialDifficulty = await mining.currentDifficulty();
            
            // Mine blocks until just before adjustment
            for (let i = 0; i < ADJUSTMENT_INTERVAL - 1; i++) {
                await mining.connect(miner1).submitBlock(0);
                await time.increase(30); // Half the target time (60s) to make difficulty increase
            }
            
            // Mine the final block that triggers adjustment
            await mining.connect(miner1).submitBlock(0);
            
            const newDifficulty = await mining.currentDifficulty();
            console.log("Initial difficulty:", initialDifficulty.toString());
            console.log("New difficulty:", newDifficulty.toString());
            
            expect(newDifficulty).to.not.equal(initialDifficulty);
            // Since blocks came in 2x faster than target, difficulty should roughly double
            expect(newDifficulty).to.be.gt(initialDifficulty);
        });
    });

    describe("Reward Halving", function () {
        it("should halve rewards after one year", async function () {
            const { mining } = await loadFixture(deployMiningSystemFixture);
            await time.increase(365 * 24 * 60 * 60);
            const reward = await mining.currentReward();
            expect(reward).to.equal(ethers.parseEther("5"));
        });

        it("should respect minimum reward", async function () {
            const { mining } = await loadFixture(deployMiningSystemFixture);
            await time.increase(100 * 365 * 24 * 60 * 60);
            const reward = await mining.currentReward();
            expect(reward).to.equal(ethers.parseEther("0.0001"));
        });
    });

    describe("Mining Edge Cases", function () {
        it("should handle multiple miners finding blocks close together", async function () {
            const { mining, token, miner1, miner2 } = await loadFixture(deployMiningSystemFixture);
            
            // Set an easier difficulty for testing
            const difficulty = ethers.MaxUint256 >> 4n;
            await mining.setCurrentDifficulty(difficulty);
            
            // Both miners find valid nonces
            let nonce1 = 0, nonce2 = 1000; // Start from different points
            let validNonce1 = null, validNonce2 = null;
            
            // Find valid nonces for both miners
            while (validNonce1 === null && nonce1 < 100) {
                const hash = ethers.keccak256(
                    ethers.solidityPacked(
                        ["address", "bytes32", "uint256", "uint256"],
                        [miner1.address, await mining.lastBlockHash(), difficulty, nonce1]
                    )
                );
                if (BigInt(hash) <= difficulty) {
                    validNonce1 = nonce1;
                }
                nonce1++;
            }
            
            while (validNonce2 === null && nonce2 < 100) {
                const hash = ethers.keccak256(
                    ethers.solidityPacked(
                        ["address", "bytes32", "uint256", "uint256"],
                        [miner2.address, await mining.lastBlockHash(), difficulty, nonce2]
                    )
                );
                if (BigInt(hash) <= difficulty) {
                    validNonce2 = nonce2;
                }
                nonce2++;
            }
            
            // If we couldn't find valid nonces, use predetermined ones for testing
            if (validNonce1 === null) validNonce1 = 0;
            if (validNonce2 === null) validNonce2 = 0;
            
            // First miner submits
            await mining.connect(miner1).submitBlock(validNonce1);
            
            // Second miner tries to submit for same block height (should fail)
            await expect(
                mining.connect(miner2).submitBlock(validNonce2)
            ).to.be.reverted; // Hash won't match because lastBlockHash changed
            
            // Verify only first miner got reward
            expect(await token.balanceOf(miner1.address)).to.equal(ethers.parseEther("10"));
            expect(await token.balanceOf(miner2.address)).to.equal(0);
        });
    });
});