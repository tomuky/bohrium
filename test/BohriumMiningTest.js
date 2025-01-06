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
            const nonce1 = 123;
            const nonce2 = 321;
            
            // Submit nonces for different miners
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
            
            // Convert hashes to numbers like the contract does
            const hashValue1 = BigInt(hash1);
            const hashValue2 = BigInt(hash2);
            
            // Determine which hash is lower
            const expectedWinner = hashValue1 < hashValue2 ? miner1.address : miner2.address;
            const expectedHashValue = hashValue1 < hashValue2 ? hashValue1 : hashValue2;
            
            // Verify the contract picked the correct winner
            expect(await miningContract.bestMiner()).to.equal(expectedWinner);
            expect(await miningContract.bestHashValue()).to.equal(expectedHashValue);
            
            // Wait for round to end
            await time.increase(60);
            
            // End the round
            await miningContract.endRound();
            
            // Verify the winner got rewarded
            const balance = await bohriumToken.balanceOf(expectedWinner);
            expect(balance).to.equal(ethers.parseEther("10"));
        });

        it("should allow explicit round ending", async function () {
            await miningContract.connect(miner1).submitNonce(12345);
            
            // Wait for round to end
            await time.increase(60);
            
            // Explicitly end the round
            await miningContract.endRound();
            
            // Check that round was reset
            expect(await miningContract.bestMiner()).to.equal(ethers.ZeroAddress);
            expect(await miningContract.bestHashValue()).to.equal(ethers.MaxUint256);
        });

        it("should not allow ending round before time", async function () {
            await miningContract.connect(miner1).submitNonce(12345);
            
            // Try to end round early
            await expect(miningContract.endRound())
                .to.be.revertedWith("Round is still ongoing");
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
        it("should reset best hash and miner after explicit round end", async function () {
            await miningContract.connect(miner1).submitNonce(12345);
            
            // Wait for round to end
            await time.increase(60);
            
            // End the round explicitly
            await miningContract.endRound();
            
            // Check that round data was reset
            expect(await miningContract.bestMiner()).to.equal(ethers.ZeroAddress);
            expect(await miningContract.bestHashValue()).to.equal(ethers.MaxUint256);
        });

        it("should not allow submitting hash with previous round data", async function () {
            // Get initial round ID and submit first nonce
            const initialRoundId = await miningContract.roundId();
            await miningContract.connect(miner1).submitNonce(12345);
            
            // Wait for round to end
            await time.increase(60);
            
            // End the round explicitly
            await miningContract.endRound();
            
            // Verify round ID has increased
            const newRoundId = await miningContract.roundId();
            expect(newRoundId).to.be.greaterThan(initialRoundId);
            
            // Submit same nonce in new round
            await miningContract.connect(miner1).submitNonce(12345);
            
            // Get both hashes
            const oldHash = ethers.solidityPackedKeccak256(
                ["uint256", "address", "uint256"],
                [initialRoundId, miner1.address, 12345]
            );
            
            const newHash = ethers.solidityPackedKeccak256(
                ["uint256", "address", "uint256"],
                [newRoundId, miner1.address, 12345]
            );
            
            // Convert to numeric values like the contract does
            const oldHashValue = BigInt(oldHash);
            const newHashValue = BigInt(newHash);
            
            // Verify the hashes are different
            expect(newHashValue).to.not.equal(oldHashValue);
            
            // Verify the contract's stored hash matches our new calculated hash
            expect(await miningContract.bestHashValue()).to.equal(newHashValue);
        });

        it("should maintain correct timing between rounds", async function () {
            // Wait for first round to end
            await time.increase(61);
            const firstRoundEndTime = await time.latest();
            
            // End round explicitly
            await miningContract.endRound();
            
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