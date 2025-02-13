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
        this.miningContract = null;
        this.bestHash = null;

        this.currentHashRate = 0;
        this.hashRateHistory = [];
        this.hashRateWindowSize = 10;
        this.hashRateUpdateInterval = 1000;
        this.hashRateWindowMs = 10000; // 10 second window
        this.hashRateUpdateInterval = 1000;

        this.lastBohrBalance = BigInt(0);
        this.bohrToken = null;
        this.rewardListener = null;
        this.currentDifficulty = null;
        this.currentBlockHeight = 0;
        this.currentCheckingHash = null;
        this.progress = 0;
        this.startTime = null;
        this.parameterCheckInterval = null;
        this.shouldRestartMining = false;
        this.latestDifficulty = null;
        this.latestBlockHash = null;
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

            // Initialize mining parameters
            this.currentBlockHeight = await this.miningContract.blockHeight();
            this.currentDifficulty = await this.miningContract.currentDifficulty();
            this.latestBlockHash = await this.miningContract.lastBlockHash();

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

    async start() {
        if (this.isRunning) return; // already running
        
        try {
            await this.connect(); // setup signers and contracts
            
            this.isRunning = true;
            this.bestHash = null; // initiate best hash
            this.bestNonce = null;
            this.startTime = Date.now(); // initiate start time for progress bar calculation
            
            this.emit('start',{ // Emit start event to frontend
                icon: '/images/rocket.png',
                text: 'Mining started'
            });
            
            this.startParameterCheck(); // Start parameter checking timer
            
            while (this.isRunning) { // Main mining loop
                await this.miningLoop();
            }
        } catch (error) {
            this.emit('error', { 
                error: error.message, 
                message: "There was an error" 
            });
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
                const currentDiff = await this.miningContract.currentDifficulty();
                const currentLastBlockHash = await this.miningContract.lastBlockHash();
                
                // Compare with current values before updating the latest values
                if (currentDiff !== this.currentDifficulty || currentLastBlockHash !== this.latestBlockHash) {
                    console.log('Mining parameters changed, flagging for restart');
                
                    // Store the values for use in mining loop
                    this.latestDifficulty = currentDiff;
                    this.latestBlockHash = currentLastBlockHash;

                    // Flag for restart
                    this.shouldRestartMining = true;
                }
            } catch (error) {
                console.error('Error checking mining parameters:', error);
            }
        }, 1000); // check every second
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

    async updateMiningParameters(emitNewBlock = false) {
        // Update all mining parameters
        this.currentDifficulty = await this.miningContract.currentDifficulty();
        this.latestBlockHash = await this.miningContract.lastBlockHash();
        this.currentBlockHeight = await this.miningContract.blockHeight();
        this.startTime = Date.now();

        if (emitNewBlock) {
            this.emit('new_block', {
                message: "New block found",
                icon: '/images/new-block.png',
                blockHeight: this.currentBlockHeight,
                lastBlockHash: this.latestBlockHash
            });
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
                icon: '/images/send.png'
            });

            // Create new promise for parameter change
            const parameterChangePromise = new Promise(resolve => {
                this.resolveParameterChange = resolve;
            });

            const receipt = await tx.wait(MINING_CONFIG.CONFIRMATIONS);
            
            if (receipt.status === 1) {
                this.emit('transaction_success', {
                    message: "Block submitted successfully",
                    hash: receipt.hash,
                    icon: '/images/check.png'
                });
                
                await this.updateMiningParameters(true);
                await parameterChangePromise;
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
            // Get initial parameters
            await this.updateMiningParameters();
            
            let resolveParameterChange; 
            let parameterChangePromise;
            
            // Create a single event handler reference that we can remove later
            const handleNewBlock = async () => {
                // Remove duplicate event handlers before updating parameters
                this.miningContract.removeListener('BlockMined', handleNewBlock);
                this.miningContract.removeListener('DifficultyAdjusted', handleDifficultyChange);
                
                await this.updateMiningParameters(true);
                if (resolveParameterChange) {
                    resolveParameterChange();
                }
            };

            const handleDifficultyChange = async (newDifficulty) => {
                // Remove duplicate event handlers before updating difficulty
                this.miningContract.removeListener('BlockMined', handleNewBlock);
                this.miningContract.removeListener('DifficultyAdjusted', handleDifficultyChange);
                
                this.currentDifficulty = newDifficulty;
                if (resolveParameterChange) {
                    resolveParameterChange();
                }
            };

            // Use direct event names instead of filters
            this.miningContract.on('BlockMined', handleNewBlock);
            this.miningContract.on('DifficultyAdjusted', handleDifficultyChange);

            while (this.isRunning) {
                this.emit('mining', { 
                    message: "Mining",
                    difficulty: this.currentDifficulty.toString(16).substring(0,12) + "...",
                    blockHeight: this.currentBlockHeight,
                    lastBlockHash: this.latestBlockHash
                });

                await this.findValidNonce(this.currentDifficulty, this.latestBlockHash);
                
                console.log('best nonce: ', this.bestNonce);
                console.log('best hash: ', this.bestHash);

                if (this.bestNonce) { // only submit if we have a best nonce
                    try {
                        await this.submitBestHash();
                    } catch (error) {
                        if (error.code === "ACTION_REJECTED") {
                            break;
                        }
                    }
                }
            }

            // Update the cleanup to use event names
            this.miningContract.off('BlockMined', handleNewBlock);
            this.miningContract.off('DifficultyAdjusted', handleDifficultyChange);

        } catch (error) {
            this.emit('error', {
                message: "Mining error",
                error: error.message
            });
            console.error('Mining error:', error);
        }
    }

    async findValidNonce() {
        const signerAddress = await this.signer.getAddress();
        
        let hashCount = 0;
        let lastHashRateUpdate = Date.now();
        
        // Initialize bestHash to max value
        this.bestHash = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
        
        while (this.isRunning) {
            // Check if parameters changed (flag set by interval)
            if (this.shouldRestartMining) {
                console.log('Mining parameters changed, restarting mining loop');
                this.shouldRestartMining = false; // Reset the flag
                return null; // Return null to go back to top of mining loop
            }

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

                const nonce = Math.floor(Math.random() * MINING_CONFIG.NONCE_RANGE);
                const hash = ethers.keccak256(
                    ethers.solidityPacked(
                        ["address", "bytes32", "uint256", "uint256"],
                        [signerAddress, this.latestBlockHash, this.currentDifficulty, nonce]
                    )
                );

                hashCount++;
                const hashValue = BigInt(hash);
                
                // Update best hash for display purposes
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
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        return null;
    }

    async submitBlock() {
        const signerAddress = await this.signer.getAddress();  // Get the actual miner's address
        
        // Calculate hash for verification using signer's address
        const hash = ethers.keccak256(
            ethers.solidityPacked(
                ["address", "bytes32", "uint256", "uint256"],
                [signerAddress, this.latestBlockHash, this.currentDifficulty, this.bestNonce]
            )
        );
        
        // Log verification data
        console.log('Submitting block with parameters:', {
            minerAddress: signerAddress,
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