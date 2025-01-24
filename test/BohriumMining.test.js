const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

// Clear console before tests
console.clear();

describe("Bohrium Mining System", function () {
    async function deployMiningSystemFixture() {
        const [owner, user1, user2] = await ethers.getSigners();

        // Deploy token
        const BohriumToken = await ethers.getContractFactory("BohriumToken");
        const token = await BohriumToken.deploy();

        // Deploy factory
        const Factory = await ethers.getContractFactory("BohriumMiningAccountFactory");
        const factory = await Factory.deploy();

        // Deploy mining contract
        const Mining = await ethers.getContractFactory("BohriumMining");
        const mining = await Mining.deploy(await token.getAddress());

        // Transfer token ownership to mining contract
        await token.transferOwnership(await mining.getAddress());

        return { token, factory, mining, owner, user1, user2 };
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
    });

    describe("Mining Account Creation", function () {
        it("Should create a mining account for a user", async function () {
            const { factory, user1 } = await loadFixture(deployMiningSystemFixture);
            await factory.connect(user1).createMiningAccount();
            const miningAccountAddress = await factory.userToMiningAccount(user1.address);
            expect(miningAccountAddress).to.not.equal(ethers.ZeroAddress);
        });
    });

    describe("Mining Mechanics - Core", function () {
        it("should allow miners to submit nonces", async function () {
            const { mining, factory, user1 } = await loadFixture(deployMiningSystemFixture);
            
            // Create and fund mining account
            await factory.connect(user1).createMiningAccount();
            const miningAccountAddress = await factory.userToMiningAccount(user1.address);
            const miningAccount = await ethers.getContractAt("BohriumMiningAccount", miningAccountAddress);

            await user1.sendTransaction({
                to: miningAccountAddress,
                value: ethers.parseEther("1.0")
            });

            const nonce = 12345;
            await miningAccount.connect(user1).submitNonce(
                await mining.getAddress(),
                nonce
            );

            // Verify the nonce was recorded
            const roundId = await mining.roundId();
            const noncesSubmitted = await mining.noncesSubmitted(roundId);
            expect(noncesSubmitted).to.be.gt(0);
        });
        
        it("should calculate hashes consistently with the contract", async function () {
            const { mining, factory, user1 } = await loadFixture(deployMiningSystemFixture);
            
            // Create and fund mining account
            await factory.connect(user1).createMiningAccount();
            const miningAccount = await ethers.getContractAt(
                "BohriumMiningAccount",
                await factory.userToMiningAccount(user1.address)
            );

            await user1.sendTransaction({
                to: await miningAccount.getAddress(),
                value: ethers.parseEther("1.0")
            });

            const nonce = 12345;
            const initialBestHash = await mining.bestHash();
            await miningAccount.connect(user1).submitNonce(await mining.getAddress(), nonce);
            
            // Calculate hash the same way the contract does
            const calculatedHash = ethers.keccak256(
                ethers.solidityPacked(
                    ["address", "bytes32", "uint256"],
                    [await miningAccount.getAddress(), initialBestHash, nonce]
                )
            );
            
            // Get the actual hash from the contract
            const actualBestHash = await mining.bestHash();
            expect(actualBestHash).to.equal(calculatedHash);
        });

        it("should reward the miner with the lowest computed hash", async function () {
            const { mining, factory, token, user1, user2 } = await loadFixture(deployMiningSystemFixture);
            
            // Setup mining accounts for both users
            await factory.connect(user1).createMiningAccount();
            await factory.connect(user2).createMiningAccount();
            
            const miningAccount1 = await ethers.getContractAt(
                "BohriumMiningAccount",
                await factory.userToMiningAccount(user1.address)
            );
            const miningAccount2 = await ethers.getContractAt(
                "BohriumMiningAccount",
                await factory.userToMiningAccount(user2.address)
            );

            // Fund accounts
            await user1.sendTransaction({
                to: await miningAccount1.getAddress(),
                value: ethers.parseEther("1.0")
            });
            await user2.sendTransaction({
                to: await miningAccount2.getAddress(),
                value: ethers.parseEther("1.0")
            });

            const nonce1 = 123;
            const nonce2 = 321;
            
            // Get initial best hash before any submissions
            const initialBestHash = await mining.bestHash();
            
            // Submit nonces
            await miningAccount1.connect(user1).submitNonce(await mining.getAddress(), nonce1);
            await miningAccount2.connect(user2).submitNonce(await mining.getAddress(), nonce2);
            
            // Calculate hashes the same way the contract does
            const hash1 = ethers.keccak256(
                ethers.solidityPacked(
                    ["address", "bytes32", "uint256"],
                    [await miningAccount1.getAddress(), initialBestHash, nonce1]
                )
            );
            const hash2 = ethers.keccak256(
                ethers.solidityPacked(
                    ["address", "bytes32", "uint256"],
                    [await miningAccount2.getAddress(), initialBestHash, nonce2]
                )
            );
            
            const hashValue1 = BigInt(hash1);
            const hashValue2 = BigInt(hash2);
            
            const expectedWinner = hashValue1 < hashValue2 ? 
                await miningAccount1.getAddress() : 
                await miningAccount2.getAddress();
            
            // Wait for round to end and distribute rewards
            await time.increase(60);
            await mining.endRound();
            
            // Check winner's balance
            const balance = await token.balanceOf(expectedWinner);
            expect(balance).to.equal(ethers.parseEther("10"));
        });

        it("should track the best hash correctly", async function () {
            const { mining, factory, user1 } = await loadFixture(deployMiningSystemFixture);
            
            await factory.connect(user1).createMiningAccount();
            const miningAccountAddress = await factory.userToMiningAccount(user1.address);
            const MiningAccount = await ethers.getContractFactory("BohriumMiningAccount");
            const miningAccount = MiningAccount.attach(miningAccountAddress);

            await user1.sendTransaction({
                to: miningAccountAddress,
                value: ethers.parseEther("1.0")
            });

            await miningAccount.connect(user1).submitNonce(await mining.getAddress(), 12345);
            expect(await mining.bestMiner()).to.equal(miningAccountAddress);
        });
    });

    describe("Mining Mechanics - Round Management", function () {
        it("should not allow ending round before time", async function () {
            const { mining, factory, user1 } = await loadFixture(deployMiningSystemFixture);
            
            await factory.connect(user1).createMiningAccount();
            const miningAccount = await ethers.getContractAt(
                "BohriumMiningAccount",
                await factory.userToMiningAccount(user1.address)
            );

            await user1.sendTransaction({
                to: await miningAccount.getAddress(),
                value: ethers.parseEther("1.0")
            });

            await miningAccount.connect(user1).submitNonce(await mining.getAddress(), 12345);
            await expect(mining.endRound()).to.be.revertedWith("Round minimum duration not met");
        });

        it("should allow explicit round ending", async function () {
            const { mining, factory, user1 } = await loadFixture(deployMiningSystemFixture);
            
            await factory.connect(user1).createMiningAccount();
            const miningAccount = await ethers.getContractAt(
                "BohriumMiningAccount",
                await factory.userToMiningAccount(user1.address)
            );

            await user1.sendTransaction({
                to: await miningAccount.getAddress(),
                value: ethers.parseEther("1.0")
            });

            await miningAccount.connect(user1).submitNonce(await mining.getAddress(), 12345);
            await time.increase(60);
            await mining.endRound();
            
            expect(await mining.bestMiner()).to.equal(ethers.ZeroAddress);
            expect(await mining.bestHashValue()).to.equal(ethers.MaxUint256);
        });
    });

    describe("Session Keys", function () {
        it("Should set and use session keys", async function () {
            const { factory, mining, user1 } = await loadFixture(deployMiningSystemFixture);

            // Create mining account
            await factory.connect(user1).createMiningAccount();
            const miningAccountAddress = await factory.userToMiningAccount(user1.address);
            
            const MiningAccount = await ethers.getContractFactory("BohriumMiningAccount");
            const miningAccount = MiningAccount.attach(miningAccountAddress);

            const sessionKey = ethers.Wallet.createRandom();
            const duration = 24 * 60 * 60;
            
            await miningAccount.connect(user1).setSessionKey(sessionKey.address, duration);

            // Fund accounts
            await user1.sendTransaction({
                to: miningAccountAddress,
                value: ethers.parseEther("1.0")
            });

            const sessionKeyWithProvider = new ethers.Wallet(sessionKey.privateKey, ethers.provider);
            await user1.sendTransaction({
                to: sessionKeyWithProvider.address,
                value: ethers.parseEther("1.0")
            });
            
            const nonce = 12345;
            await miningAccount.connect(sessionKeyWithProvider).submitNonce(
                await mining.getAddress(),
                nonce
            );

            const roundId = await mining.roundId();
            const noncesSubmitted = await mining.noncesSubmitted(roundId);
            expect(noncesSubmitted).to.be.gt(0);
        });
    });

    describe("Reward System", function () {
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

    describe("Session Key Security", function () {
        it("should not allow setting session keys longer than 30 days", async function () {
            const { factory, user1 } = await loadFixture(deployMiningSystemFixture);
            await factory.connect(user1).createMiningAccount();
            const miningAccount = await ethers.getContractAt(
                "BohriumMiningAccount",
                await factory.userToMiningAccount(user1.address)
            );

            const sessionKey = ethers.Wallet.createRandom();
            const thirtyOneDays = 31 * 24 * 60 * 60;
            
            await expect(
                miningAccount.connect(user1).setSessionKey(sessionKey.address, thirtyOneDays)
            ).to.be.revertedWith("Max duration 30 days");
        });

        it("should not allow using expired session keys", async function () {
            const { factory, mining, user1 } = await loadFixture(deployMiningSystemFixture);
            await factory.connect(user1).createMiningAccount();
            const miningAccount = await ethers.getContractAt(
                "BohriumMiningAccount",
                await factory.userToMiningAccount(user1.address)
            );

            const sessionKey = ethers.Wallet.createRandom();
            const duration = 1 * 60 * 60; // 1 hour
            
            await miningAccount.connect(user1).setSessionKey(sessionKey.address, duration);
            
            // Fund the session key
            const sessionKeyWithProvider = new ethers.Wallet(sessionKey.privateKey, ethers.provider);
            await user1.sendTransaction({
                to: sessionKeyWithProvider.address,
                value: ethers.parseEther("1.0")
            });

            // Advance time beyond expiration
            await time.increase(duration + 1);

            await expect(
                miningAccount.connect(sessionKeyWithProvider).submitNonce(await mining.getAddress(), 12345)
            ).to.be.revertedWith("Unauthorized");
        });

        it("should allow owner to revoke session key", async function () {
            const { factory, mining, user1 } = await loadFixture(deployMiningSystemFixture);
            await factory.connect(user1).createMiningAccount();
            const miningAccount = await ethers.getContractAt(
                "BohriumMiningAccount",
                await factory.userToMiningAccount(user1.address)
            );

            const sessionKey = ethers.Wallet.createRandom();
            await miningAccount.connect(user1).setSessionKey(sessionKey.address, 24 * 60 * 60);
            
            const sessionKeyWithProvider = new ethers.Wallet(sessionKey.privateKey, ethers.provider);
            await user1.sendTransaction({
                to: sessionKeyWithProvider.address,
                value: ethers.parseEther("1.0")
            });

            await miningAccount.connect(user1).revokeSessionKey(sessionKey.address);

            await expect(
                miningAccount.connect(sessionKeyWithProvider).submitNonce(await mining.getAddress(), 12345)
            ).to.be.revertedWith("Unauthorized");
        });
    });

    describe("Mining System Edge Cases", function () {
        it("should handle multiple nonce submissions in same block", async function () {
            const { mining, factory, user1 } = await loadFixture(deployMiningSystemFixture);
            await factory.connect(user1).createMiningAccount();
            const miningAccount = await ethers.getContractAt(
                "BohriumMiningAccount",
                await factory.userToMiningAccount(user1.address)
            );

            await user1.sendTransaction({
                to: await miningAccount.getAddress(),
                value: ethers.parseEther("1.0")
            });

            const miningAddress = await mining.getAddress();
            const roundId = await mining.roundId();

            // Submit one at a time first to verify counter works
            await miningAccount.connect(user1).submitNonce(miningAddress, 12345);
            expect(await mining.noncesSubmitted(roundId)).to.equal(1);

            await miningAccount.connect(user1).submitNonce(miningAddress, 12346);
            expect(await mining.noncesSubmitted(roundId)).to.equal(2);

            await miningAccount.connect(user1).submitNonce(miningAddress, 12347);
            expect(await mining.noncesSubmitted(roundId)).to.equal(3);
        });

        it("should handle round transitions correctly", async function () {
            const { mining, factory, user1 } = await loadFixture(deployMiningSystemFixture);
            await factory.connect(user1).createMiningAccount();
            const miningAccount = await ethers.getContractAt(
                "BohriumMiningAccount",
                await factory.userToMiningAccount(user1.address)
            );

            await user1.sendTransaction({
                to: await miningAccount.getAddress(),
                value: ethers.parseEther("1.0")
            });

            const initialRoundId = await mining.roundId();
            
            // Submit nonce and end round
            await miningAccount.connect(user1).submitNonce(await mining.getAddress(), 12345);
            await time.increase(60);
            await mining.endRound();
            
            // Verify new round started correctly
            const newRoundId = await mining.roundId();
            expect(newRoundId).to.equal(initialRoundId + 1n);  // Using BigInt addition
            expect(await mining.bestMiner()).to.equal(ethers.ZeroAddress);
            expect(await mining.bestHashValue()).to.equal(ethers.MaxUint256);
            
            // Verify can submit in new round
            await miningAccount.connect(user1).submitNonce(await mining.getAddress(), 12346);
            const newNoncesSubmitted = await mining.noncesSubmitted(newRoundId);
            expect(newNoncesSubmitted).to.equal(1);
        });
    });

    describe("Mining Account Factory Security", function () {
        it("should not allow creating multiple accounts for same user", async function () {
            const { factory, user1 } = await loadFixture(deployMiningSystemFixture);
            
            await factory.connect(user1).createMiningAccount();
            await expect(
                factory.connect(user1).createMiningAccount()
            ).to.be.revertedWith("Account exists");
        });
    });

    describe("Mining Account Withdrawals", function () {
        it("should allow owner to withdraw ETH", async function () {
            const { factory, user1 } = await loadFixture(deployMiningSystemFixture);
            await factory.connect(user1).createMiningAccount();
            const miningAccount = await ethers.getContractAt(
                "BohriumMiningAccount",
                await factory.userToMiningAccount(user1.address)
            );

            const depositAmount = ethers.parseEther("1.0");
            await user1.sendTransaction({
                to: await miningAccount.getAddress(),
                value: depositAmount
            });

            const initialBalance = await ethers.provider.getBalance(user1.address);
            await miningAccount.connect(user1).withdrawETH(depositAmount);
            
            const finalBalance = await ethers.provider.getBalance(user1.address);
            expect(finalBalance).to.be.gt(initialBalance - ethers.parseEther("0.1")); // Accounting for gas
        });

        it("should not allow non-owner to withdraw", async function () {
            const { factory, user1, user2 } = await loadFixture(deployMiningSystemFixture);
            await factory.connect(user1).createMiningAccount();
            const miningAccount = await ethers.getContractAt(
                "BohriumMiningAccount",
                await factory.userToMiningAccount(user1.address)
            );

            await user1.sendTransaction({
                to: await miningAccount.getAddress(),
                value: ethers.parseEther("1.0")
            });

            await expect(
                miningAccount.connect(user2).withdrawETH(ethers.parseEther("1.0"))
            ).to.be.revertedWith("Only owner");
        });
    });
});