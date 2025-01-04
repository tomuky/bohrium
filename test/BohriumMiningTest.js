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
        it("should set the correct initial reward", async function () {
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
        it("should allow miners to submit hashes", async function () {
            const tx = await miningContract.connect(miner1).submitHash(12345);
            await expect(tx).to.not.be.reverted;
        });

        it("should track the best hash correctly", async function () {
            await miningContract.connect(miner1).submitHash(12345);
            expect(await miningContract.bestMiner()).to.equal(miner1.address);
        });

        it("should reward the miner with the lowest computed hash", async function () {
            // Submit nonces from different miners
            const nonce1 = 54321;
            const nonce2 = 12345;
            
            await miningContract.connect(miner1).submitHash(nonce1);
            await miningContract.connect(miner2).submitHash(nonce2);
            
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
            await miningContract.endRound();
            
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

    describe("Round Management", function () {
        it("should not allow submitting hash after round ends", async function () {
            await time.increase(600); // 10 minutes
            await expect(
                miningContract.connect(miner1).submitHash(12345)
            ).to.be.revertedWith("Round has ended");
        });

        it("should not allow ending round before duration", async function () {
            await expect(
                miningContract.endRound()
            ).to.be.revertedWith("Round is still ongoing");
        });
    });
});