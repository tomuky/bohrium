const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("BohriumMining", function () {
    let bohriumToken;
    let miningContract;
    let owner;
    let miner1;
    let miner2;

    beforeEach(async function () {
        [owner, miner1, miner2] = await ethers.getSigners();

        // Deploy token
        const BohriumToken = await ethers.getContractFactory("BohriumToken");
        bohriumToken = await BohriumToken.deploy();
        await bohriumToken.waitForDeployment();

        // Deploy mining contract
        const BohriumMining = await ethers.getContractFactory("BohriumMining");
        miningContract = await BohriumMining.deploy(await bohriumToken.getAddress());
        await miningContract.waitForDeployment();

        // Transfer ownership to mining contract
        await bohriumToken.transferOwnership(await miningContract.getAddress());
    });

    describe("Initial Setup", function () {
        it("should set the correct initial reward to 10 BOHR", async function () {
            const reward = await miningContract.currentReward();
            expect(reward).to.equal(ethers.parseEther("10"));
        });

        it("should set the correct token address", async function () {
            expect(await miningContract.bohriumToken()).to.equal(
                await bohriumToken.getAddress()
            );
        });
    });

    describe("Mining Mechanics", function () {
        it("should allow miners to submit nonces", async function () {
            const tx = await miningContract.connect(miner1).submitNonce(12345);
            await expect(tx).to.not.be.reverted;
        });

        it("should track the best hash correctly", async function () {
            await miningContract.connect(miner1).submitNonce(12345);
            expect(await miningContract.bestMiner()).to.equal(miner1.address);
        });

        it("should reward the miner with the lowest computed hash", async function () {
            // Submit nonces from different miners
            const nonce1 = 54321;
            const nonce2 = 12345;
            
            await miningContract.connect(miner1).submitNonce(nonce1);
            await miningContract.connect(miner2).submitNonce(nonce2);
            
            // Get the current round ID
            const roundId = await miningContract.roundId();
            
            // Calculate expected hashes using the same algorithm as the contract
            const hash1 = ethers.solidityPackedKeccak256(
                ["uint256", "address", "uint256"],
                [roundId, miner1.address, nonce1]
            );
            const hash2 = ethers.solidityPackedKeccak256(
                ["uint256", "address", "uint256"],
                [roundId, miner2.address, nonce2]
            );
            
            // Determine which hash is lower
            const expectedWinner = BigInt(hash1) < BigInt(hash2) ? miner1.address : miner2.address;
            const expectedHash = BigInt(hash1) < BigInt(hash2) ? hash1 : hash2;
            
            // Verify the contract picked the correct winner
            expect(await miningContract.bestMiner()).to.equal(expectedWinner);
            expect(await miningContract.bestHashValue()).to.equal(expectedHash);
            
            // Wait for round to end
            await time.increase(600); // 10 minutes
            
            // Submit a new hash to trigger round end and reward distribution
            await miningContract.connect(miner1).submitNonce(99999);
            
            // Verify the winner got rewarded
            const balance = await bohriumToken.balanceOf(expectedWinner);
            expect(balance).to.equal(ethers.parseEther("10"));
        });
    });

    describe("Reward Halving", function () {
        it("should halve rewards after one year", async function () {
            // Advance time by 1 year
            await time.increase(365 * 24 * 60 * 60);
            
            const reward = await miningContract.currentReward();
            expect(reward).to.equal(ethers.parseEther("5"));
        });

        it("should respect minimum reward", async function () {
            // Advance time by 100 years
            await time.increase(100 * 365 * 24 * 60 * 60);
            
            const reward = await miningContract.currentReward();
            expect(reward).to.equal(ethers.parseEther("0.0001"));
        });
    });

    describe("Security Tests", function () {
        it("should reset best hash and miner after round ends automatically", async function () {
            await miningContract.connect(miner1).submitNonce(12345);
            
            // Wait for round to end
            await time.increase(60);
            
            // Submit a new hash to trigger round check/reset
            await miningContract.connect(miner2).submitNonce(54321);
            
            // Check that previous round data was reset
            expect(await miningContract.bestMiner()).to.equal(miner2.address);
            const newHash = await miningContract.bestHashValue();
            expect(newHash).to.not.equal(ethers.MaxUint256);
        });

        it("should not allow submitting hash with previous round data", async function () {
            const initialRoundId = await miningContract.roundId();
            await miningContract.connect(miner1).submitNonce(12345);
            
            // Wait for round to end
            await time.increase(600);
            
            // Submit new hash to trigger round transition
            await miningContract.connect(miner2).submitNonce(54321);
            
            // Try to submit hash in new round with data from old round
            const oldHash = ethers.solidityPackedKeccak256(
                ["uint256", "address", "uint256"],
                [initialRoundId, miner1.address, 12345]
            );
            
            // Submit same nonce, should produce different hash due to new roundId
            await miningContract.connect(miner1).submitNonce(12345);
            const newBestHash = await miningContract.bestHashValue();
            expect(newBestHash).to.not.equal(oldHash);
        });

        it("should maintain correct timing between rounds", async function () {
            // Wait for first round to end
            await time.increase(61);
            const firstRoundEndTime = await time.latest();
            
            // Submit hash to trigger new round
            await miningContract.connect(miner1).submitNonce(12345);
            
            // Check new round end time
            const nextRoundEnd = await miningContract.lastRoundEnd();
            // Allow for small timestamp variations (within 2 seconds)
            expect(nextRoundEnd).to.be.closeTo(
                firstRoundEndTime + 60,
                2 // delta of 2 seconds
            );
        });
    });
});