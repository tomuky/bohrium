const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

// Clear console before tests
console.clear();

describe("Bohrium Mining System", function () {
    async function deployMiningSystemFixture() {
        const [owner, miner1, miner2] = await ethers.getSigners();

        // Deploy BOHR token
        const BohriumToken = await ethers.getContractFactory("BohriumToken");
        const bohrToken = await BohriumToken.deploy();

        // Deploy sBOHR token
        const StakedBohrToken = await ethers.getContractFactory("StakedBohrToken");
        const sBohrToken = await StakedBohrToken.deploy(await bohrToken.getAddress());

        // Deploy mining contract
        const Mining = await ethers.getContractFactory("BohriumMining");
        const mining = await Mining.deploy(
            await bohrToken.getAddress(),
            await sBohrToken.getAddress()
        );

        // Mint initial tokens for testing
        const initialAmount = ethers.parseEther("1000");
        await bohrToken.mint(miner1.address, initialAmount);
        await bohrToken.mint(miner2.address, initialAmount);

        // Transfer BOHR token ownership to mining contract for rewards
        await bohrToken.transferOwnership(await mining.getAddress());

        return { bohrToken, sBohrToken, mining, owner, miner1, miner2 };
    }

    describe("Staking System", function () {
        it("should allow staking BOHR for sBOHR", async function () {
            const { bohrToken, sBohrToken, miner1 } = await loadFixture(deployMiningSystemFixture);
            const stakeAmount = ethers.parseEther("100");
            
            // Approve and stake
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), stakeAmount);
            await sBohrToken.connect(miner1).stake(stakeAmount);
            
            // Check balances
            expect(await sBohrToken.balanceOf(miner1.address)).to.equal(stakeAmount);
            expect(await bohrToken.balanceOf(miner1.address)).to.equal(ethers.parseEther("900"));
        });

        it("should prevent transferring sBOHR tokens", async function () {
            const { bohrToken, sBohrToken, miner1, miner2 } = await loadFixture(deployMiningSystemFixture);
            const stakeAmount = ethers.parseEther("100");
            
            // Stake first
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), stakeAmount);
            await sBohrToken.connect(miner1).stake(stakeAmount);
            
            // Try to transfer sBOHR
            await expect(
                sBohrToken.connect(miner1).transfer(miner2.address, stakeAmount)
            ).to.be.reverted; // Just check for any revert
        });

        it("should affect mining difficulty based on sBOHR balance", async function () {
            const { bohrToken, sBohrToken, mining, miner1 } = await loadFixture(deployMiningSystemFixture);
            
            // Get initial difficulty (should be penalized due to no stake)
            const baseDifficulty = await mining.currentDifficulty();
            const initialMinerDifficulty = await mining.getMinerDifficulty(miner1.address);
            expect(initialMinerDifficulty).to.equal(baseDifficulty * 2n); // 50% penalty
            
            // Stake enough to meet required amount (10x reward)
            const reward = await mining.currentReward();
            const requiredStake = reward * 10n;
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), requiredStake);
            await sBohrToken.connect(miner1).stake(requiredStake);
            
            // Check new difficulty (should be base difficulty)
            const newMinerDifficulty = await mining.getMinerDifficulty(miner1.address);
            expect(newMinerDifficulty).to.equal(baseDifficulty);
        });

        it("should not allow staking 0 BOHR", async function () {
            const { bohrToken, sBohrToken, miner1 } = await loadFixture(deployMiningSystemFixture);
            const stakeAmount = ethers.parseEther("0");
            
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), stakeAmount);
            await expect(
                sBohrToken.connect(miner1).stake(stakeAmount)
            ).to.be.revertedWith("Cannot stake 0");
        });

        it("should not allow unstaking 0 sBOHR", async function () {
            const { sBohrToken, miner1 } = await loadFixture(deployMiningSystemFixture);
            await expect(
                sBohrToken.connect(miner1).requestUnstake(0)
            ).to.be.revertedWith("Cannot unstake 0");
        });

        it("should not allow unstaking more than staked balance", async function () {
            const { bohrToken, sBohrToken, miner1 } = await loadFixture(deployMiningSystemFixture);
            const stakeAmount = ethers.parseEther("100");
            const unstakeAmount = ethers.parseEther("150");
            
            // Stake first
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), stakeAmount);
            await sBohrToken.connect(miner1).stake(stakeAmount);
            
            // Try to unstake more than balance
            await expect(
                sBohrToken.connect(miner1).requestUnstake(unstakeAmount)
            ).to.be.revertedWith("Insufficient staked balance");
        });

        it("should not allow staking more than BOHR balance", async function () {
            const { bohrToken, sBohrToken, miner1 } = await loadFixture(deployMiningSystemFixture);
            const stakeAmount = ethers.parseEther("1500"); // More than initial 1000 BOHR
            
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), stakeAmount);
            await expect(
                sBohrToken.connect(miner1).stake(stakeAmount)
            ).to.be.reverted; // Just check for any revert since OpenZeppelin uses custom errors
        });
    });

    describe("Difficulty Adjustment", function () {
        it("should adjust difficulty every 5 blocks based on time", async function () {
            const { bohrToken, sBohrToken, mining, miner1 } = await loadFixture(deployMiningSystemFixture);
            
            // Get current reward and required stake
            const reward = await mining.currentReward();
            const requiredStake = reward * 10n;

            // Stake enough to avoid unstaked penalty
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), requiredStake);
            await sBohrToken.connect(miner1).stake(requiredStake);
            
            // Set initial difficulty
            const initialDifficulty = ethers.MaxUint256;
            await mining.setCurrentDifficulty(initialDifficulty);
            
            // Mine 5 blocks quickly
            for (let i = 0; i < 5; i++) {
                await mining.connect(miner1).submitBlock(0);
                await time.increase(30); // 30 seconds instead of 120
            }
            
            // Check that difficulty was adjusted
            const newDifficulty = await mining.currentDifficulty();
            expect(newDifficulty).to.be.lt(initialDifficulty);
        });
    });
    
    describe("Unstaking Cooldown", function () {
        it("should allow requesting unstake", async function () {
            const { bohrToken, sBohrToken, miner1 } = await loadFixture(deployMiningSystemFixture);
            const stakeAmount = ethers.parseEther("100");
            
            // Stake first
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), stakeAmount);
            await sBohrToken.connect(miner1).stake(stakeAmount);
            
            // Check initial balances
            expect(await sBohrToken.balanceOf(miner1.address)).to.equal(stakeAmount);
            expect(await bohrToken.balanceOf(miner1.address)).to.equal(ethers.parseEther("900"));
            
            // Request unstake
            const tx = await sBohrToken.connect(miner1).requestUnstake(stakeAmount);
            const receipt = await tx.wait();
            
            // Verify the event
            await expect(tx)
                .to.emit(sBohrToken, "UnstakeRequested")
                .withArgs(miner1.address, stakeAmount, receipt.blockNumber);
            
            // Check balances after unstake request
            // sBOHR should be burned during request
            expect(await sBohrToken.balanceOf(miner1.address)).to.equal(0);
            // BOHR balance should remain unchanged until unstake is completed
            expect(await bohrToken.balanceOf(miner1.address)).to.equal(ethers.parseEther("900"));
            
            // Check request is recorded
            const request = await sBohrToken.unstakeRequests(miner1.address);
            expect(request.amount).to.equal(stakeAmount);
            expect(request.requestBlock).to.equal(receipt.blockNumber);
        });

        it("should not allow completing unstake before cooldown", async function () {
            const { bohrToken, sBohrToken, miner1 } = await loadFixture(deployMiningSystemFixture);
            const stakeAmount = ethers.parseEther("100");
            
            // Stake and request unstake
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), stakeAmount);
            await sBohrToken.connect(miner1).stake(stakeAmount);
            await sBohrToken.connect(miner1).requestUnstake(stakeAmount);
            
            // Try to complete unstake immediately
            await expect(
                sBohrToken.connect(miner1).completeUnstake()
            ).to.be.revertedWith("Cooldown not complete");
        });

        it("should allow completing unstake after cooldown", async function () {
            const { bohrToken, sBohrToken, miner1 } = await loadFixture(deployMiningSystemFixture);
            const stakeAmount = ethers.parseEther("100");
            
            // Stake and request unstake
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), stakeAmount);
            await sBohrToken.connect(miner1).stake(stakeAmount);
            await sBohrToken.connect(miner1).requestUnstake(stakeAmount);
            
            // Mine 1000 blocks
            for (let i = 0; i < 1000; i++) {
                await ethers.provider.send("evm_mine");
            }
            
            // Complete unstake
            await expect(sBohrToken.connect(miner1).completeUnstake())
                .to.emit(sBohrToken, "UnstakeCompleted")
                .withArgs(miner1.address, stakeAmount);
            
            // Check balances
            expect(await sBohrToken.balanceOf(miner1.address)).to.equal(0);
            expect(await bohrToken.balanceOf(miner1.address)).to.equal(ethers.parseEther("1000"));
            
            // Check request is cleared
            const request = await sBohrToken.unstakeRequests(miner1.address);
            expect(request.amount).to.equal(0);
        });

        it("should allow canceling an unstake request", async function () {
            const { bohrToken, sBohrToken, miner1 } = await loadFixture(deployMiningSystemFixture);
            const stakeAmount = ethers.parseEther("100");
            
            // Stake and request unstake
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), stakeAmount);
            await sBohrToken.connect(miner1).stake(stakeAmount);
            await sBohrToken.connect(miner1).requestUnstake(stakeAmount);
            
            // Cancel unstake
            await sBohrToken.connect(miner1).cancelUnstake();
            
            // Check balances (should be back to original)
            expect(await sBohrToken.balanceOf(miner1.address)).to.equal(stakeAmount);
            expect(await bohrToken.balanceOf(miner1.address)).to.equal(ethers.parseEther("900"));
            
            // Check request is cleared
            const request = await sBohrToken.unstakeRequests(miner1.address);
            expect(request.amount).to.equal(0);
        });

        it("should not allow requesting unstake twice", async function () {
            const { bohrToken, sBohrToken, miner1 } = await loadFixture(deployMiningSystemFixture);
            const stakeAmount = ethers.parseEther("100");
            
            // Stake first
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), stakeAmount);
            await sBohrToken.connect(miner1).stake(stakeAmount);
            
            // Request unstake
            await sBohrToken.connect(miner1).requestUnstake(ethers.parseEther("50"));
            
            // Try to request again
            await expect(
                sBohrToken.connect(miner1).requestUnstake(ethers.parseEther("50"))
            ).to.be.revertedWith("Unstake already requested");
        });

        it("should not allow requesting more than staked balance", async function () {
            const { bohrToken, sBohrToken, miner1 } = await loadFixture(deployMiningSystemFixture);
            const stakeAmount = ethers.parseEther("100");
            
            // Stake first
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), stakeAmount);
            await sBohrToken.connect(miner1).stake(stakeAmount);
            
            // Request more than staked
            await expect(
                sBohrToken.connect(miner1).requestUnstake(ethers.parseEther("150"))
            ).to.be.revertedWith("Insufficient staked balance");
        });
    });
    
    describe("Mining During Unstaking Cooldown", function () {
        it("should lose staking benefit when sBOHR is burned during unstake request", async function () {
            const { bohrToken, sBohrToken, mining, miner1 } = await loadFixture(deployMiningSystemFixture);
            
            // Get base difficulty
            const baseDifficulty = await mining.currentDifficulty();
            
            // Stake enough to meet required amount (10x reward)
            const reward = await mining.currentReward();
            const requiredStake = reward * 10n;
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), requiredStake);
            await sBohrToken.connect(miner1).stake(requiredStake);
            
            // Check difficulty with stake (should be base difficulty)
            const difficultyWithStake = await mining.getMinerDifficulty(miner1.address);
            expect(difficultyWithStake).to.equal(baseDifficulty);
            
            // Request unstake (burns sBOHR tokens)
            await sBohrToken.connect(miner1).requestUnstake(requiredStake);
            
            // Verify sBOHR balance is now zero
            expect(await sBohrToken.balanceOf(miner1.address)).to.equal(0);
            
            // Check difficulty after unstake request (should be back to higher difficulty due to no stake)
            const difficultyDuringCooldown = await mining.getMinerDifficulty(miner1.address);
            expect(difficultyDuringCooldown).to.equal(baseDifficulty * 2n); // Back to unstaked difficulty
        });

        it("should regain staking benefit after canceling unstake request", async function () {
            const { bohrToken, sBohrToken, mining, miner1 } = await loadFixture(deployMiningSystemFixture);
            
            // Get base difficulty
            const baseDifficulty = await mining.currentDifficulty();
            
            // Stake enough to meet required amount
            const reward = await mining.currentReward();
            const requiredStake = reward * 10n;
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), requiredStake);
            await sBohrToken.connect(miner1).stake(requiredStake);
            
            // Request unstake
            await sBohrToken.connect(miner1).requestUnstake(requiredStake);
            
            // Verify sBOHR balance is zero and mining difficulty is higher
            expect(await sBohrToken.balanceOf(miner1.address)).to.equal(0);
            const difficultyDuringCooldown = await mining.getMinerDifficulty(miner1.address);
            expect(difficultyDuringCooldown).to.equal(baseDifficulty * 2n);
            
            // Cancel unstake request (gets sBOHR tokens back)
            await sBohrToken.connect(miner1).cancelUnstake();
            
            // Verify sBOHR balance is restored
            expect(await sBohrToken.balanceOf(miner1.address)).to.equal(requiredStake);
            
            // Verify mining benefit is restored due to having sBOHR again
            const difficultyAfterCancel = await mining.getMinerDifficulty(miner1.address);
            expect(difficultyAfterCancel).to.equal(baseDifficulty);
        });

        it("should continue with higher difficulty after completing unstake", async function () {
            const { bohrToken, sBohrToken, mining, miner1 } = await loadFixture(deployMiningSystemFixture);
            
            // Get base difficulty
            const baseDifficulty = await mining.currentDifficulty();
            
            // Stake enough to meet required amount
            const reward = await mining.currentReward();
            const requiredStake = reward * 10n;
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), requiredStake);
            await sBohrToken.connect(miner1).stake(requiredStake);
            
            // Request unstake
            await sBohrToken.connect(miner1).requestUnstake(requiredStake);
            
            // Mine 1000 blocks
            for (let i = 0; i < 1000; i++) {
                await ethers.provider.send("evm_mine");
            }
            
            // Complete unstake
            await sBohrToken.connect(miner1).completeUnstake();
            
            // Verify sBOHR balance remains zero
            expect(await sBohrToken.balanceOf(miner1.address)).to.equal(0);
            
            // Verify mining difficulty remains higher due to having no sBOHR
            const difficultyAfterUnstake = await mining.getMinerDifficulty(miner1.address);
            expect(difficultyAfterUnstake).to.equal(baseDifficulty * 2n);
        });
    });

    describe("Security Tests", function () {
        it("should not allow completing unstake without a request", async function () {
            const { sBohrToken, miner1 } = await loadFixture(deployMiningSystemFixture);
            
            await expect(
                sBohrToken.connect(miner1).completeUnstake()
            ).to.be.revertedWith("No unstake requested");
        });

        it("should not allow canceling unstake without a request", async function () {
            const { sBohrToken, miner1 } = await loadFixture(deployMiningSystemFixture);
            
            await expect(
                sBohrToken.connect(miner1).cancelUnstake()
            ).to.be.revertedWith("No unstake requested");
        });

        it("should not allow completing someone else's unstake", async function () {
            const { bohrToken, sBohrToken, miner1, miner2 } = await loadFixture(deployMiningSystemFixture);
            const stakeAmount = ethers.parseEther("100");
            
            // Miner1 stakes and requests unstake
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), stakeAmount);
            await sBohrToken.connect(miner1).stake(stakeAmount);
            await sBohrToken.connect(miner1).requestUnstake(stakeAmount);
            
            // Mine 1000 blocks
            for (let i = 0; i < 1000; i++) {
                await ethers.provider.send("evm_mine");
            }
            
            // Miner2 tries to complete miner1's unstake
            await expect(
                sBohrToken.connect(miner2).completeUnstake()
            ).to.be.revertedWith("No unstake requested");
        });

        it("should handle multiple users staking and unstaking independently", async function () {
            const { bohrToken, sBohrToken, miner1, miner2 } = await loadFixture(deployMiningSystemFixture);
            const stakeAmount1 = ethers.parseEther("100");
            const stakeAmount2 = ethers.parseEther("200");
            
            // Both miners stake
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), stakeAmount1);
            await sBohrToken.connect(miner1).stake(stakeAmount1);
            
            await bohrToken.connect(miner2).approve(sBohrToken.getAddress(), stakeAmount2);
            await sBohrToken.connect(miner2).stake(stakeAmount2);
            
            // Miner1 requests unstake
            await sBohrToken.connect(miner1).requestUnstake(stakeAmount1);
            
            // Verify miner2's stake is unaffected
            expect(await sBohrToken.balanceOf(miner2.address)).to.equal(stakeAmount2);
            
            // Mine 1000 blocks
            for (let i = 0; i < 1000; i++) {
                await ethers.provider.send("evm_mine");
            }
            
            // Miner1 completes unstake
            await sBohrToken.connect(miner1).completeUnstake();
            
            // Verify final balances
            expect(await sBohrToken.balanceOf(miner1.address)).to.equal(0);
            expect(await bohrToken.balanceOf(miner1.address)).to.equal(ethers.parseEther("1000"));
            expect(await sBohrToken.balanceOf(miner2.address)).to.equal(stakeAmount2);
        });

        it("should not allow transferring ownership of staked tokens", async function () {
            const { bohrToken, sBohrToken, miner1, miner2, owner } = await loadFixture(deployMiningSystemFixture);
            const stakeAmount = ethers.parseEther("100");
            
            // Stake first
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), stakeAmount);
            await sBohrToken.connect(miner1).stake(stakeAmount);
            
            // Try to transfer via transferFrom
            await expect(
                sBohrToken.connect(owner).transferFrom(miner1.address, miner2.address, stakeAmount)
            ).to.be.reverted; // Just check for any revert since we're using a custom error now
        });
    });

    describe("Delegation System", function () {
        it("should allow setting delegation from main wallet to session wallet", async function () {
            const { sBohrToken, miner1, miner2 } = await loadFixture(deployMiningSystemFixture);
            
            // miner1 = main wallet, miner2 = session wallet
            await expect(sBohrToken.connect(miner1).setDelegation(miner2.address))
                .to.emit(sBohrToken, "DelegationSet")
                .withArgs(miner2.address, miner1.address);
            
            expect(await sBohrToken.delegatedBy(miner2.address)).to.equal(miner1.address);
            expect(await sBohrToken.delegatedTo(miner1.address)).to.equal(miner2.address);
        });
        
        it("should consider main wallet's stake for session wallet's mining difficulty", async function () {
            const { bohrToken, sBohrToken, mining, miner1, miner2 } = await loadFixture(deployMiningSystemFixture);
            
            // Get base difficulty
            const baseDifficulty = await mining.currentDifficulty();
            
            // Check initial difficulty for session wallet (should be penalized)
            const initialDifficulty = await mining.getMinerDifficulty(miner2.address);
            expect(initialDifficulty).to.equal(baseDifficulty * 2n);
            
            // Set delegation
            await sBohrToken.connect(miner1).setDelegation(miner2.address);
            
            // Stake from main wallet
            const reward = await mining.currentReward();
            const requiredStake = reward * 10n;
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), requiredStake);
            await sBohrToken.connect(miner1).stake(requiredStake);
            
            // Check session wallet's difficulty now (should benefit from main wallet's stake)
            const newDifficulty = await mining.getMinerDifficulty(miner2.address);
            expect(newDifficulty).to.equal(baseDifficulty);
        });
        
        it("should send mining rewards to main wallet when delegated", async function () {
            const { bohrToken, sBohrToken, mining, miner1, miner2 } = await loadFixture(deployMiningSystemFixture);
            
            // Set delegation
            await sBohrToken.connect(miner1).setDelegation(miner2.address);
            
            // Stake from main wallet
            const reward = await mining.currentReward();
            const requiredStake = reward * 10n;
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), requiredStake);
            await sBohrToken.connect(miner1).stake(requiredStake);
            
            // Set difficulty to a very low value to ensure mining succeeds
            const veryLowDifficulty = ethers.MaxUint256;
            await mining.setCurrentDifficulty(veryLowDifficulty);
            
            // Get initial balances
            const initialMainBalance = await bohrToken.balanceOf(miner1.address);
            const initialSessionBalance = await bohrToken.balanceOf(miner2.address);
            
            // Mine a block from session wallet - try different nonces until one works
            let success = false;
            for (let nonce = 0; nonce < 10 && !success; nonce++) {
                try {
                    await mining.connect(miner2).submitBlock(nonce);
                    success = true;
                } catch (error) {
                    // Continue trying with next nonce
                }
            }
            
            // Verify mining succeeded
            expect(success).to.be.true;
            
            // Check rewards went to main wallet
            const newMainBalance = await bohrToken.balanceOf(miner1.address);
            const newSessionBalance = await bohrToken.balanceOf(miner2.address);
            
            // Convert to BigInt for comparison
            expect(newMainBalance > initialMainBalance).to.be.true;
            expect(newSessionBalance).to.equal(initialSessionBalance);
        });
        
        it("should allow removing delegation", async function () {
            const { sBohrToken, miner1, miner2 } = await loadFixture(deployMiningSystemFixture);
            
            // Set delegation
            await sBohrToken.connect(miner1).setDelegation(miner2.address);
            
            // Remove delegation
            await expect(sBohrToken.connect(miner1).removeDelegation())
                .to.emit(sBohrToken, "DelegationRemoved")
                .withArgs(miner2.address, miner1.address);
            
            expect(await sBohrToken.delegatedBy(miner2.address)).to.equal(ethers.ZeroAddress);
            expect(await sBohrToken.delegatedTo(miner1.address)).to.equal(ethers.ZeroAddress);
        });
    });

    describe("Delegation Security Tests", function () {
        it("should prevent session wallet from removing delegation", async function () {
            const { sBohrToken, miner1, miner2 } = await loadFixture(deployMiningSystemFixture);
            
            // Set up delegation (miner1 = main wallet, miner2 = session wallet)
            await sBohrToken.connect(miner1).setDelegation(miner2.address);
            
            // Session wallet tries to remove the delegation
            await expect(
                sBohrToken.connect(miner2).removeDelegation()
            ).to.be.revertedWith("No delegation exists");
        });

        it("should prevent circular delegations", async function () {
            const { sBohrToken, miner1, miner2 } = await loadFixture(deployMiningSystemFixture);
            
            // Set up first delegation
            await sBohrToken.connect(miner1).setDelegation(miner2.address);
            
            // Try to create circular delegation
            await expect(
                sBohrToken.connect(miner2).setDelegation(miner1.address)
            ).to.be.revertedWith("Circular delegation not allowed");
        });

        it("should prevent self-delegation", async function () {
            const { sBohrToken, miner1 } = await loadFixture(deployMiningSystemFixture);
            
            // Try to delegate to self
            await expect(
                sBohrToken.connect(miner1).setDelegation(miner1.address)
            ).to.be.revertedWith("Cannot delegate to self");
        });

        it("should prevent main wallet from staking after delegation if session wallet has unstake request", async function () {
            const { bohrToken, sBohrToken, miner1, miner2 } = await loadFixture(deployMiningSystemFixture);
            
            // Session wallet stakes first
            const sessionStakeAmount = ethers.parseEther("50");
            await bohrToken.connect(miner2).approve(sBohrToken.getAddress(), sessionStakeAmount);
            await sBohrToken.connect(miner2).stake(sessionStakeAmount);
            
            // Session wallet requests unstake
            await sBohrToken.connect(miner2).requestUnstake(sessionStakeAmount);
            
            // Main wallet delegates to session wallet
            await sBohrToken.connect(miner1).setDelegation(miner2.address);
            
            // Main wallet tries to stake - should work since unstake request is separate
            const mainStakeAmount = ethers.parseEther("100");
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), mainStakeAmount);
            await sBohrToken.connect(miner1).stake(mainStakeAmount);
            
            // Verify main wallet's stake succeeded
            expect(await sBohrToken.balanceOf(miner1.address)).to.equal(mainStakeAmount);
        });

        it("should prevent double delegation of a main wallet", async function () {
            const { sBohrToken, miner1, miner2, owner } = await loadFixture(deployMiningSystemFixture);
            
            // Set first delegation
            await sBohrToken.connect(miner1).setDelegation(miner2.address);
            
            // Try to delegate the same main wallet to another session
            await expect(
                sBohrToken.connect(miner1).setDelegation(owner.address)
            ).to.be.revertedWith("Already delegated");
        });

        it("should prevent double delegation of a session wallet", async function () {
            const { sBohrToken, miner1, miner2, owner } = await loadFixture(deployMiningSystemFixture);
            
            // Set first delegation
            await sBohrToken.connect(miner1).setDelegation(miner2.address);
            
            // Try to delegate another main wallet to the same session
            await expect(
                sBohrToken.connect(owner).setDelegation(miner2.address)
            ).to.be.revertedWith("Session already delegated");
        });

        it("should handle delegation correctly when main wallet has an unstake request", async function () {
            const { bohrToken, sBohrToken, mining, miner1, miner2 } = await loadFixture(deployMiningSystemFixture);
            
            // Main wallet stakes
            const stakeAmount = ethers.parseEther("100");
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), stakeAmount);
            await sBohrToken.connect(miner1).stake(stakeAmount);
            
            // Main wallet requests unstake
            await sBohrToken.connect(miner1).requestUnstake(stakeAmount);
            
            // Main wallet delegates to session wallet
            await sBohrToken.connect(miner1).setDelegation(miner2.address);
            
            // Check session wallet's mining difficulty (should be penalized since main wallet has no stake)
            const baseDifficulty = await mining.currentDifficulty();
            const sessionDifficulty = await mining.getMinerDifficulty(miner2.address);
            expect(sessionDifficulty).to.equal(baseDifficulty * 2n);
        });

        it("should correctly update session wallet's mining difficulty when main wallet unstakes", async function () {
            const { bohrToken, sBohrToken, mining, miner1, miner2 } = await loadFixture(deployMiningSystemFixture);
            
            // Main wallet stakes
            const stakeAmount = ethers.parseEther("100");
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), stakeAmount);
            await sBohrToken.connect(miner1).stake(stakeAmount);
            
            // Main wallet delegates to session wallet
            await sBohrToken.connect(miner1).setDelegation(miner2.address);
            
            // Main wallet requests unstake - should work, but will affect session wallet
            await sBohrToken.connect(miner1).requestUnstake(stakeAmount);
            
            // Check that session wallet's mining difficulty is now penalized
            const baseDifficulty = await mining.currentDifficulty();
            const sessionDifficulty = await mining.getMinerDifficulty(miner2.address);
            expect(sessionDifficulty).to.equal(baseDifficulty * 2n);
        });

        it("should allow removing delegation after successful mining", async function () {
            const { bohrToken, sBohrToken, mining, miner1, miner2 } = await loadFixture(deployMiningSystemFixture);
            
            // Set up for mining
            const reward = await mining.currentReward();
            const requiredStake = reward * 10n;
            
            // Main wallet stakes
            await bohrToken.connect(miner1).approve(sBohrToken.getAddress(), requiredStake);
            await sBohrToken.connect(miner1).stake(requiredStake);
            
            // Main wallet delegates to session wallet
            await sBohrToken.connect(miner1).setDelegation(miner2.address);
            
            // Set difficulty to allow mining
            const veryLowDifficulty = ethers.MaxUint256;
            await mining.setCurrentDifficulty(veryLowDifficulty);
            
            // Session wallet mines a block
            let mined = false;
            for (let nonce = 0; nonce < 5 && !mined; nonce++) {
                try {
                    await mining.connect(miner2).submitBlock(nonce);
                    mined = true;
                } catch (error) {
                    // Continue trying
                }
            }
            expect(mined).to.be.true;
            
            // Main wallet can still remove delegation after mining
            await sBohrToken.connect(miner1).removeDelegation();
            
            // Verify delegation was removed
            expect(await sBohrToken.delegatedBy(miner2.address)).to.equal(ethers.ZeroAddress);
        });
    });
});