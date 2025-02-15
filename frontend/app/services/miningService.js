import { ethers } from 'ethers';
import { MINING_ABI, TOKEN_ABI, MINING_CONFIG } from './constants';
import { sleep, getCurrentTimestamp } from './utils';
import { getNetworkConfig } from './config';

class MiningService {
    constructor() {
        this.isRunning = false;
        this.listeners = new Set();
        this.provider = null;
        this.signer = null;
        this.signerAddress = null;
        this.miningContract = null;
        this.bestHash = null;

        this.currentHashRate = 0;
        this.hashRateHistory = [];
        this.hashRateWindowSize = 10;
        this.hashRateUpdateInterval = 1000;
        this.hashRateWindowMs = 10000; // 10 second window

        this.bohrToken = null;
        this.rewardListener = null;

        this.currentDifficulty = null;
        this.latestBlockHash = null;
        this.currentBlockHeight = 0;
        this.startTime = null;

        this.currentCheckingHash = null;
        this.progress = 0;
        this.parameterCheckInterval = null;
        this.shouldRestartMining = false;
    }

    // Add event listener
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    // Emit events to update the console
    emit(event, data) {
        const timestamp = getCurrentTimestamp();
        this.listeners.forEach(listener => {
            listener({
                type: event,
                data,
                timestamp
            });
        });
    }

    async connect() {
        try {
            if (!window.ethereum) {
                throw new Error('MetaMask is not installed');
            }

            this.provider = new ethers.BrowserProvider(window.ethereum);
            this.signer = await this.provider.getSigner();
            this.signerAddress = await this.signer.getAddress();
            const chainId = (await this.provider.getNetwork()).chainId;
            const networkConfig = getNetworkConfig(Number(chainId));

            // Initialize mining contract
            this.miningContract = new ethers.Contract(
                networkConfig.contracts.mining,
                MINING_ABI,
                this.signer
            );
            
            // Initialize token contract
            const bohrTokenAddress = await this.miningContract.bohriumToken();
            this.bohrToken = new ethers.Contract(bohrTokenAddress, TOKEN_ABI, this.signer);
            
            await this.setupRewardListener();

        } catch (error) {
            throw error;
        }
    }

    async setupRewardListener() {
        if (this.rewardListener) {
            this.bohrToken.removeListener('Transfer', this.rewardListener);
        }

        const miningAddress = this.miningContract.target;
        const userAddress = await this.signer.getAddress();

        this.rewardListener = async (from, to, amount, event) => {
            // Get block timestamp
            const block = await this.provider.getBlock(event.blockNumber);
            const timestamp = block.timestamp;

            // Only process incoming transfers to the user from the mining contract or zero address
            if (to.toLowerCase() === userAddress.toLowerCase() && 
                (from.toLowerCase() === miningAddress.toLowerCase() ||
                 from.toLowerCase() === "0x0000000000000000000000000000000000000000")) {
                
                const formattedAmount = ethers.formatUnits(amount, 18);
                
                this.emit('reward', {
                    message: 'Earned BOHR',
                    reward: formattedAmount,
                    pill: `+${formattedAmount} BOHR`,
                    icon: '/images/wand.png',
                    timestamp
                });
            }
        };

        // Add error handling for the event listener
        this.bohrToken.on('Transfer', this.rewardListener)
            .catch(error => {
                console.error('Error in transfer listener:', error);
                this.emit('error', { 
                    error: error.message, 
                    message: "Error listening for rewards" 
                });
            });
    }

    async start(restart = false) {
        if (this.isRunning) return; // already running
        
        try {
            if(!restart) {
                await this.connect(); // setup signers and contracts

                this.emit('start',{ // Emit start event to frontend
                    icon: '/images/rocket.png',
                    text: 'Mining started'
                });
                
                this.startParameterCheck(); // Start mining parameters checking timer
            }
            
            this.isRunning = true;
            this.bestHash = null;
            this.bestNonce = null;

            // Update mining parameters
            this.latestBlockHash = await this.miningContract.lastBlockHash();
            this.currentDifficulty = await this.miningContract.currentDifficulty();
            this.currentBlockHeight = await this.miningContract.blockHeight();
            this.startTime = Date.now();
            
            
            
            while (this.isRunning) { // Main mining loop
                await this.miningLoop();
            }
        } catch (error) {
            this.emit('error', { 
                error: error.message, 
                message: "There was an error" 
            });
            console.log('Mining error:', error);
            this.stop();
        }
    }

    startParameterCheck() {
        // Clear any existing interval
        if (this.parameterCheckInterval) {
            clearInterval(this.parameterCheckInterval);
        }

        this.parameterCheckInterval = setInterval(async () => {
            try {
                // Get current params from contract
                const currentLastBlockHash = await this.miningContract.lastBlockHash();

                // Compare with current values before updating the latest values
                if (currentLastBlockHash !== this.latestBlockHash) {
                    console.log('Mining parameters changed, flagging for restart');

                    this.emit('new_block', {
                        message: "New block",
                        icon: '/images/new-block.png',
                        blockHeight: this.currentBlockHeight,
                        lastBlockHash: this.latestBlockHash,
                        pill: `#${this.currentBlockHeight}`
                    });

                    // Update mining parameters
                    this.latestBlockHash = currentLastBlockHash;
                    this.currentDifficulty = await this.miningContract.currentDifficulty();
                    this.currentBlockHeight = await this.miningContract.blockHeight();
                    this.startTime = Date.now();

                    if(!this.isRunning) {
                        this.isRunning = true;
                        this.start(true); // restart mining
                    }else{
                        this.shouldRestartMining = true; // flag for restart
                    }
                }
            } catch (error) {
                console.error('Error checking mining parameters:', error);
            }
        }, 2000); // check every 2 seconds  
    }

    async stop() {
        if (this.isRunning) {
            this.isRunning = false;
            this.startTime = null;
            this.emit('stop',{
                icon: '/images/stop.png',
                text: 'Mining stopped'
            });

            // Clear parameter check interval
            if (this.parameterCheckInterval) {
                clearInterval(this.parameterCheckInterval);
                this.parameterCheckInterval = null;
            }
            
            // Clean up listeners
            if (this.rewardListener && this.bohrToken) {
                try {
                    this.bohrToken.removeListener('Transfer', this.rewardListener);
                    this.rewardListener = null;
                } catch (error) {
                    console.error('Error removing transfer listener:', error);
                }
            }

            // Clean up any event listeners if they exist
            if (this.miningContract) {
                this.miningContract.removeAllListeners();
            }
        }
    }

    async submitBestHash() {
        try {
            this.emit('preparing_transaction', {
                message: "Preparing transaction",
                icon: '/images/checklist.png'
            });
            const tx = await this.submitBlock();
            
            this.emit('transaction', {
                message: "Transaction submitted",
                hash: tx.hash,
                icon: '/images/send.png',
                pill: `${tx.hash.substring(0, 8)}...`
            });

            const receipt = await tx.wait(MINING_CONFIG.CONFIRMATIONS);
            
            if (receipt.status === 1) {
                this.emit('transaction_success', {
                    message: "Block submitted successfully",
                    hash: receipt.hash,
                    icon: '/images/check.png'
                });
                return true; // needed?
            }
        } catch (error) {
            if (error.code === "ACTION_REJECTED") {
                this.emit('user_rejected');
                this.stop();
                throw error; // Re-throw to break the mining loop
            }
            
            this.emit('error', {
                message: "Block submission failed",
                error: error.message,
                icon: '/images/error.png'
            });
            throw error; // Re-throw to handle in calling function
        }
    }

    async miningLoop() {
        try {
            while (this.isRunning) {
                console.log('Mining loop');
                this.emit('mining', { 
                    message: "Mining",
                    difficulty: this.currentDifficulty.toString(16).substring(0,12) + "...",
                    blockHeight: this.currentBlockHeight,
                    lastBlockHash: this.latestBlockHash
                });

                await this.findValidNonce();
                
                if (this.bestNonce) {
                    // Stop mining immediately when we find a valid nonce
                    this.isRunning = false;
                    
                    try {
                        await this.submitBestHash();
                        
                        // Reset mining state after successful submission
                        this.bestNonce = null;
                        this.bestHash = null;
                        this.startTime = Date.now();
                        this.progress = 0;
                    } catch (error) {
                        if (error.code === "ACTION_REJECTED") {
                            // User rejected transaction - keep mining stopped
                            break;
                        }
                        // For other errors, restart mining
                        console.error('Error submitting hash:', error);
                        this.isRunning = true;
                    }
                }
            }
        } catch (error) {
            this.emit('error', {
                message: "Mining error",
                error: error.message
            });
            console.error('Mining error:', error);
            this.stop(); // Stop mining when we encounter an error
            return; // Exit the mining loop
        }
    }

    async findValidNonce() {
        // Create a buffer for random values
        const randomBuffer = new Uint32Array(MINING_CONFIG.MINING_BATCH_SIZE);
        
        let hashCount = 0;
        let lastHashRateUpdate = Date.now();
        
        // Initialize bestHash to max value
        this.bestHash = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
        
        while (this.isRunning) {
            // Check if parameters changed (flag set by interval)
            if (this.shouldRestartMining) {
                console.log('Mining parameters changed, restarting mining loop');
                this.shouldRestartMining = false;
                return null;
            }

            // Fill buffer with cryptographically secure random numbers
            crypto.getRandomValues(randomBuffer);

            // Update progress bar
            this.updateProgress()

            const now = Date.now();
            if (now - lastHashRateUpdate >= this.hashRateUpdateInterval) {
                this.updateHashRate(hashCount, now);
                hashCount = 0;
                lastHashRateUpdate = now;
            }

            for (let i = 0; i < MINING_CONFIG.MINING_BATCH_SIZE; i++) {
                if (!this.isRunning) return null;
                
                // Use the random number directly - it's already a valid uint32
                const nonce = randomBuffer[i];
                
                const hash = ethers.keccak256(
                    ethers.solidityPacked(
                        ["address", "bytes32", "uint256", "uint256"],
                        [this.signerAddress, this.latestBlockHash, this.currentDifficulty, nonce]
                    )
                );

                hashCount++;
                const hashValue = BigInt(hash);
                
                // Update best hash 
                if (hashValue < this.bestHash) {
                    this.bestHash = hashValue;
                    
                    // If we found a winning hash, set progress to 100%
                    if (hashValue <= this.currentDifficulty) {
                        this.progress = 100;
                    }
                }
                
                // Update current checking hash every x iterations
                if (i % 20000 === 0) {
                    this.currentCheckingHash = hashValue.toString(16);
                }

                // Check if this hash meets the difficulty target
                if (hashValue <= this.currentDifficulty) {
                    this.bestNonce = nonce;
                    console.log('Found valid hash!', {
                        hashValue: hashValue.toString(16),
                        targetDifficulty: this.currentDifficulty.toString(16),
                        nonce
                    });
                    return;
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        return null;
    }

    async submitBlock() {
        // Calculate hash for verification using signer's address
        const hash = ethers.keccak256(
            ethers.solidityPacked(
                ["address", "bytes32", "uint256", "uint256"],
                [this.signerAddress, this.latestBlockHash, this.currentDifficulty, this.bestNonce]
            )
        );
        
        // Log verification data
        console.log('Submitting block with parameters:', {
            minerAddress: this.signerAddress,
            lastBlockHash: this.latestBlockHash,
            difficulty: this.currentDifficulty.toString(16),
            nonce: this.bestNonce,
            hash: hash
        });

        return this.miningContract.submitBlock(
            this.bestNonce,
            {
                gasLimit: Math.floor(
                    MINING_CONFIG.GAS_MULTIPLIER * MINING_CONFIG.BASE_GAS_LIMIT
                )
            }
        );
    }

    // Helper method to update hash rate statistics
    updateHashRate(hashCount, now) {
        this.hashRateHistory.push({ timestamp: now, count: hashCount });
        
        const cutoffTime = now - this.hashRateWindowMs;
        this.hashRateHistory = this.hashRateHistory.filter(entry => entry.timestamp >= cutoffTime);
        
        const totalHashes = this.hashRateHistory.reduce((sum, entry) => sum + entry.count, 0);
        const timeSpan = (now - Math.min(...this.hashRateHistory.map(entry => entry.timestamp))) / 1000;
        
        if (this.hashRateHistory.length > 1 && timeSpan > 0) {
            this.currentHashRate = (totalHashes / timeSpan);
        } else {
            this.currentHashRate = 0;
        }
    }

    // Add getter for bestHash
    getBestHash() {
        return this.bestHash ? this.bestHash.toString(16) : null;
    }

    // Add this getter method
    getDifficulty() {
        return this.currentDifficulty ? this.currentDifficulty.toString(16) : null;
    }

    // Add getter method
    getBlockHeight() {
        return this.currentBlockHeight;
    }

    // Add getter for currentCheckingHash
    getCurrentCheckingHash() {
        return this.currentCheckingHash;
    }

    // Update progress based purely on elapsed time
    updateProgress() {
        if (!this.startTime) {
            this.startTime = Date.now();
        }

        const elapsedMs = Date.now() - this.startTime;
        const targetMs = 2 * 60 * 1000; // 2 minutes in milliseconds
        
        // Using a power function to create rapid initial progress that slows dramatically
        // x^0.3 gives us a curve that rises quickly then flattens
        const ratio = Math.min(1, elapsedMs / targetMs);
        this.progress = Math.min(99, Math.pow(ratio, 0.3) * 99);
    }

    getProgress() {
        return this.progress;
    }
}

// Export a singleton instance
export const miningService = new MiningService();