import { ethers } from 'ethers';
import { TOKEN_ABI as BOHR_ABI, STAKED_BOHR_ABI } from './constants';
import EventEmitter from 'events';
import { NETWORKS } from './config';

// Add Mining contract interface
const MINING_CONTRACT_ABI = [
    "function bohriumToken() external view returns (address)",
    "function stakedBohrToken() external view returns (address)"
];

// Known Mining contract address
const MINING_CONTRACT_ADDRESS = NETWORKS.baseSepolia.contracts.mining;

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
            
            // Get token addresses from mining contract
            const miningContract = new ethers.Contract(
                MINING_CONTRACT_ADDRESS,
                MINING_CONTRACT_ABI,
                this.provider
            );
            
            const bohrTokenAddress = await miningContract.bohriumToken();
            const sBohrTokenAddress = await miningContract.stakedBohrToken();
            
            // Initialize contracts
            this.bohrContract = new ethers.Contract(
                bohrTokenAddress,
                BOHR_ABI,
                this.signer
            );
            
            this.sBohrContract = new ethers.Contract(
                sBohrTokenAddress,
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
    
    async checkApproval(amount) {
        if (!this.isConnected) await this.connect();
        
        try {
            const amountWei = ethers.parseUnits(amount.toString(), 18);
            const sBohrAddress = await this.sBohrContract.getAddress();
            
            // Check if the user has already approved enough tokens
            const allowance = await this.bohrContract.allowance(this.address, sBohrAddress);
            
            return allowance >= amountWei;
        } catch (error) {
            console.error("Check approval error:", error);
            return false;
        }
    }
    
    async approve(amount) {
        if (!this.isConnected) await this.connect();
        
        try {
            const amountWei = ethers.parseUnits(amount.toString(), 18);
            const sBohrAddress = await this.sBohrContract.getAddress();
            
            const approveTx = await this.bohrContract.approve(
                sBohrAddress,
                amountWei
            );
            
            return { 
                success: true, 
                hash: approveTx.hash,
                wait: async () => {
                    try {
                        const receipt = await approveTx.wait();
                        return { success: true, receipt };
                    } catch (error) {
                        return { success: false, error };
                    }
                }
            };
        } catch (error) {
            console.error("Approval error:", error);
            return { success: false, error: error.message };
        }
    }
    
    async stake(amount) {
        if (!this.isConnected) await this.connect();
        
        try {
            const amountWei = ethers.parseUnits(amount.toString(), 18);
            
            // Stake tokens
            const stakeTx = await this.sBohrContract.stake(amountWei);
            await stakeTx.wait();
            
            return { success: true, txHash: stakeTx.hash };
        } catch (error) {
            console.error("Staking error:", error);
            return false;
        }
    }
    
    async requestUnstake(amount) {
        if (!this.isConnected) await this.connect();
        
        try {
            const amountWei = ethers.parseUnits(amount.toString(), 18);
            
            // Check if user has enough staked balance
            const sBohrBalance = await this.sBohrContract.balanceOf(this.address);
            if (sBohrBalance < amountWei) {
                throw new Error("Insufficient staked balance");
            }
            
            // Check if there's an existing unstake request
            const existingRequest = await this.sBohrContract.unstakeRequests(this.address);
            if (existingRequest.amount.toString() !== "0") {
                throw new Error("You already have an active unstake request");
            }
            
            const tx = await this.sBohrContract.requestUnstake(amountWei);
            const receipt = await tx.wait();
            
            return { success: true, txHash: receipt.hash };
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
            const receipt = await tx.wait();
            
            return { success: true, txHash: receipt.hash };
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
            const receipt = await tx.wait();
            
            return { success: true, txHash: receipt.hash };
        } catch (error) {
            console.error("Cancel unstake error:", error);
            this.emit('error', { message: "Cancel unstake failed", error: error.message });
            return false;
        }
    }
    
    async requestDelegation(sessionWalletAddress) {
        if (!this.isConnected) await this.connect();
        
        try {
            const tx = await this.sBohrContract.requestDelegation(sessionWalletAddress);
            const receipt = await tx.wait();
            
            return { success: true, txHash: receipt.hash };
        } catch (error) {
            console.error("Request delegation error:", error);
            this.emit('error', { message: "Request delegation failed", error: error.message });
            return false;
        }
    }
    
    async cancelDelegationRequest(sessionWalletAddress) {
        if (!this.isConnected) await this.connect();
        
        try {
            const tx = await this.sBohrContract.cancelDelegationRequest(sessionWalletAddress);
            const receipt = await tx.wait();
            
            return { success: true, txHash: receipt.hash };
        } catch (error) {
            console.error("Cancel delegation request error:", error);
            this.emit('error', { message: "Cancel delegation request failed", error: error.message });
            return false;
        }
    }
    
    async removeDelegation() {
        if (!this.isConnected) await this.connect();
        
        try {
            const tx = await this.sBohrContract.removeDelegation();
            const receipt = await tx.wait();
            
            return { success: true, txHash: receipt.hash };
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
        
        const currentBohriumBlock = await this.sBohrContract.getCurrentBohriumBlock();
        const cooldownBlocks = 1000; // This should match the contract's UNSTAKING_COOLDOWN_BLOCKS
        
        const blocksRemaining = request[1] + BigInt(cooldownBlocks) - BigInt(currentBohriumBlock);
        
        return {
            amount: ethers.formatUnits(request.amount, 18),
            requestBlock: request[1].toString(),
            currentBlock: currentBohriumBlock.toString(),
            blocksRemaining: blocksRemaining > 0 ? blocksRemaining.toString() : "0",
            canComplete: blocksRemaining <= 0
        };
    }
}

export default new StakingService(); 