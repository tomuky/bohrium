import { ethers } from 'ethers';
import { BOHR_ABI, STAKED_BOHR_ABI } from './constants';
import { getContractAddresses } from './config';
import EventEmitter from 'events';

class StakingService extends EventEmitter {
    constructor() {
        super();
        this.provider = null;
        this.signer = null;
        this.address = null;
        this.bohrContract = null;
        this.sBohrContract = null;
        this.isConnected = false;
    }
    
    async connect() {
        if (this.isConnected) return;
        
        try {
            // Connect to provider
            if (window.ethereum) {
                this.provider = new ethers.BrowserProvider(window.ethereum);
                this.signer = await this.provider.getSigner();
                this.address = await this.signer.getAddress();
            } else {
                throw new Error("No Ethereum provider found");
            }
            
            // Get contract addresses
            const addresses = getContractAddresses();
            
            // Initialize contracts
            this.bohrContract = new ethers.Contract(
                addresses.bohrToken,
                BOHR_ABI,
                this.signer
            );
            
            this.sBohrContract = new ethers.Contract(
                addresses.stakedBohrToken,
                STAKED_BOHR_ABI,
                this.signer
            );
            
            this.isConnected = true;
            
            // Start listening for events
            this.setupEventListeners();
            
            this.emit('connected', { address: this.address });
        } catch (error) {
            console.error("Connection error:", error);
            this.emit('error', { message: "Failed to connect", error: error.message });
        }
    }
    
    setupEventListeners() {
        // Listen for delegation events
        this.sBohrContract.on("DelegationSet", (sessionWallet, mainWallet) => {
            if (mainWallet.toLowerCase() === this.address.toLowerCase() || 
                sessionWallet.toLowerCase() === this.address.toLowerCase()) {
                this.emit('delegation_set', {
                    sessionWallet,
                    mainWallet,
                    message: "Delegation set successfully",
                    icon: '/images/link.png'
                });
            }
        });
        
        this.sBohrContract.on("DelegationRemoved", (sessionWallet, mainWallet) => {
            if (mainWallet.toLowerCase() === this.address.toLowerCase() || 
                sessionWallet.toLowerCase() === this.address.toLowerCase()) {
                this.emit('delegation_removed', {
                    sessionWallet,
                    mainWallet,
                    message: "Delegation removed",
                    icon: '/images/unlink.png'
                });
            }
        });
    }
    
    async getBalances() {
        if (!this.isConnected) await this.connect();
        
        const bohrBalance = await this.bohrContract.balanceOf(this.address);
        const sBohrBalance = await this.sBohrContract.balanceOf(this.address);
        
        return {
            bohr: ethers.formatUnits(bohrBalance, 18),
            sBohr: ethers.formatUnits(sBohrBalance, 18)
        };
    }
    
    async getDelegationInfo() {
        if (!this.isConnected) await this.connect();
        
        const delegatedTo = await this.sBohrContract.delegatedTo(this.address);
        const delegatedBy = await this.sBohrContract.delegatedBy(this.address);
        
        return {
            isMainWallet: delegatedTo !== ethers.ZeroAddress,
            isSessionWallet: delegatedBy !== ethers.ZeroAddress,
            sessionWallet: delegatedTo !== ethers.ZeroAddress ? delegatedTo : null,
            mainWallet: delegatedBy !== ethers.ZeroAddress ? delegatedBy : null
        };
    }
    
    async stake(amount) {
        if (!this.isConnected) await this.connect();
        
        try {
            const amountWei = ethers.parseUnits(amount, 18);
            
            // First approve the transfer
            const approveTx = await this.bohrContract.approve(
                await this.sBohrContract.getAddress(),
                amountWei
            );
            await approveTx.wait();
            
            // Then stake
            const stakeTx = await this.sBohrContract.stake(amountWei);
            await stakeTx.wait();
            
            this.emit('stake_success', {
                message: "Staking successful",
                amount,
                icon: '/images/stake.png'
            });
            
            return true;
        } catch (error) {
            console.error("Staking error:", error);
            this.emit('error', { message: "Staking failed", error: error.message });
            return false;
        }
    }
    
    async requestUnstake(amount) {
        if (!this.isConnected) await this.connect();
        
        try {
            const amountWei = ethers.parseUnits(amount, 18);
            
            const tx = await this.sBohrContract.requestUnstake(amountWei);
            await tx.wait();
            
            this.emit('unstake_requested', {
                message: "Unstake requested",
                amount,
                icon: '/images/unstake.png'
            });
            
            return true;
        } catch (error) {
            console.error("Unstake request error:", error);
            this.emit('error', { message: "Unstake request failed", error: error.message });
            return false;
        }
    }
    
    async completeUnstake() {
        if (!this.isConnected) await this.connect();
        
        try {
            const tx = await this.sBohrContract.completeUnstake();
            await tx.wait();
            
            this.emit('unstake_completed', {
                message: "Unstake completed",
                icon: '/images/completed.png'
            });
            
            return true;
        } catch (error) {
            console.error("Complete unstake error:", error);
            this.emit('error', { message: "Complete unstake failed", error: error.message });
            return false;
        }
    }
    
    async cancelUnstake() {
        if (!this.isConnected) await this.connect();
        
        try {
            const tx = await this.sBohrContract.cancelUnstake();
            await tx.wait();
            
            this.emit('unstake_cancelled', {
                message: "Unstake cancelled",
                icon: '/images/cancel.png'
            });
            
            return true;
        } catch (error) {
            console.error("Cancel unstake error:", error);
            this.emit('error', { message: "Cancel unstake failed", error: error.message });
            return false;
        }
    }
    
    async setDelegation(sessionWalletAddress) {
        if (!this.isConnected) await this.connect();
        
        try {
            const tx = await this.sBohrContract.setDelegation(sessionWalletAddress);
            await tx.wait();
            
            this.emit('delegation_set', {
                message: "Delegation set successfully",
                sessionWallet: sessionWalletAddress,
                icon: '/images/link.png'
            });
            
            return true;
        } catch (error) {
            console.error("Set delegation error:", error);
            this.emit('error', { message: "Set delegation failed", error: error.message });
            return false;
        }
    }
    
    async removeDelegation() {
        if (!this.isConnected) await this.connect();
        
        try {
            const tx = await this.sBohrContract.removeDelegation();
            await tx.wait();
            
            this.emit('delegation_removed', {
                message: "Delegation removed",
                icon: '/images/unlink.png'
            });
            
            return true;
        } catch (error) {
            console.error("Remove delegation error:", error);
            this.emit('error', { message: "Remove delegation failed", error: error.message });
            return false;
        }
    }
    
    async getUnstakeRequest() {
        if (!this.isConnected) await this.connect();
        
        const request = await this.sBohrContract.unstakeRequests(this.address);
        
        if (request.amount.toString() === "0") {
            return null;
        }
        
        const currentBlock = await this.provider.getBlockNumber();
        const cooldownBlocks = 1000; // This should match the contract's UNSTAKING_COOLDOWN_BLOCKS
        const blocksRemaining = request.requestBlock + BigInt(cooldownBlocks) - BigInt(currentBlock);
        
        return {
            amount: ethers.formatUnits(request.amount, 18),
            requestBlock: request.requestBlock.toString(),
            currentBlock: currentBlock.toString(),
            blocksRemaining: blocksRemaining > 0 ? blocksRemaining.toString() : "0",
            canComplete: blocksRemaining <= 0
        };
    }
}

export default new StakingService(); 