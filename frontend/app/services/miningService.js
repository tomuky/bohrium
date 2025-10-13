import { ethers } from 'ethers';
import { MINING_ABI, TOKEN_ABI, MINING_CONFIG } from './constants';
import { getCurrentTimestamp } from './utils';
import { MINING_CONTRACT_ADDRESS } from './contracts';

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

        this.latestBlockHash = null;
        this.currentBlockHeight = 0;
        this.currentBlockReward = 0;
        this.startTime = null;

        this.progress = 0;
        this.parameterCheckInterval = null;
        this.shouldRestartMining = false;

        this.sessionWallet = null;
        this.sessionWalletAddress = null;
        this.sessionWalletContext = null;

        this.lastParamsChangedTime = 0;
        this.paramsChangedCooldown = 2000; // 2 second cooldown

        this.baseDifficulty = null;
        this.minerDifficulty = null;
        this.blockStartTime = null;

        // New properties for event listening
        this.useEvents = false;
        this.isListening = false;
        this.eventRetryCount = 0;
        this.maxEventRetries = 3;
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

    // Setup event listeners for real-time updates
    async setupEventListeners() {
        try {
            // Test if events work
            const testFilter = this.miningContract.filters.BlockMined();
            await this.miningContract.queryFilter(testFilter, -1);
            
            // Set up event listeners
            this.miningContract.on('BlockMined', (miner, blockHeight, nonce, reward, timeTaken, rewardRecipient) => {
                console.log('New block mined via events');
                this.updateMiningParameters();
            });

            this.miningContract.on('MiningParamsChanged', (blockHeight, newBlockHash, newBaseDifficulty) => {
                console.log('Mining params changed via events');
                this.updateMiningParameters();
            });

            this.useEvents = true;
            this.isListening = true;
            console.log('Event listeners active');
            
        } catch (error) {
            console.log('Events failed, falling back to smart polling:', error);
            this.useEvents = false;
            this.isListening = false;
            this.startSmartPolling();
        }
    }

    // Smart polling fallback when events don't work
    startSmartPolling() {
        // Clear any existing interval
        if (this.parameterCheckInterval) {
            clearInterval(this.parameterCheckInterval);
        }

        // Much less frequent polling as fallback
        this.parameterCheckInterval = setInterval(async () => {
            try {
                await this.checkForParameterChanges();
            } catch (error) {
                console.error('Smart polling error:', error);
            }
        }, 10000); // Every 10 seconds instead of 2
    }

    // Check for parameter changes (used by smart polling)
    async checkForParameterChanges() {
        try {
            // Only check if block hash changed
            const currentBlockHash = await this.miningContract.lastBlockHash();
            if (currentBlockHash !== this.latestBlockHash) {
                // Block changed, update all parameters
                await this.updateMiningParameters();
            }
        } catch (error) {
            console.error('Error checking for parameter changes:', error);
        }
    }

    async connect() {
        try {
            if (!this.sessionWalletContext) {
                throw new Error("SessionWalletContext not initialized. Call setSessionWalletContext first.");
            }

            // Get the latest session wallet using the context's method
            const { wallet: sessionWallet, address: sessionWalletAddress } = 
                await this.sessionWalletContext.getSessionWallet();
            
            if (!sessionWallet) {
                throw new Error("Failed to get session wallet");
            }

            // Set up provider from the session wallet
            this.provider = sessionWallet.provider;
            this.signer = sessionWallet;
            this.signerAddress = sessionWalletAddress;
            this.sessionWalletAddress = sessionWalletAddress;
            
            // Initialize contracts using simple centralized config
            this.miningContract = new ethers.Contract(
                MINING_CONTRACT_ADDRESS,
                MINING_ABI,
                this.signer
            );
            
            const bohrTokenAddress = await this.miningContract.bohriumToken();
            this.bohrToken = new ethers.Contract(bohrTokenAddress, TOKEN_ABI, this.signer);

        } catch (error) {
            throw error;
        }
    }

    async start(restart = false) {
        if (this.isRunning) return; // already running
        
        try {
            if(!restart) {
                await this.connect(); // setup signers and contracts

                this.emit('start',{
                    icon: '/images/rocket.png',
                    text: 'Started'
                });
                
                // Try events first, fall back to polling
                await this.setupEventListeners();
                
                // If events failed, start polling
                if (!this.useEvents) {
                    this.startParameterCheck();
                }
            }
            
            this.isRunning = true;
            this.bestHash = null;
            this.bestNonce = null;
            this.previousBestHash = null;

            // Update mining parameters using the new batch function
            await this.updateMiningParameters();
            this.startTime = Date.now();
            this.blockStartTime = Date.now(); // Reset block start time
            
            // The main mining loop
            await this.miningLoop();

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
                const currentLastBlockHash = await this.miningContract.lastBlockHash();

                // Compare with current values before updating the latest values
                if (currentLastBlockHash !== this.latestBlockHash) {
                    
                    const now = Date.now();
                    // Only emit if enough time has passed since last emission
                    if (now - this.lastParamsChangedTime >= this.paramsChangedCooldown) {
                        this.emit('params_changed', {
                            message: "Mining parameters changed",
                            icon: '/images/params.png'
                        });
                        this.lastParamsChangedTime = now;
                    }

                    const newBaseDifficulty = await this.miningContract.baseDifficulty();
                    if(newBaseDifficulty !== this.baseDifficulty) {
                        this.emit('difficulty_change', {
                            message: "Difficulty changed",
                            icon: '/images/gauge.png',
                            difficulty: newBaseDifficulty
                        });
                    }

                    // Update mining parameters
                    this.latestBlockHash = currentLastBlockHash;
                    this.baseDifficulty = newBaseDifficulty;
                    
                    // Add error handling for individual contract calls
                    try {
                        this.minerDifficulty = await this.miningContract.getMinerDifficulty(this.signerAddress);
                    } catch (error) {
                        console.error('Error getting miner difficulty:', error);
                        // Don't update minerDifficulty if call fails
                    }
                    
                    try {
                        this.currentBlockHeight = await this.miningContract.blockHeight();
                    } catch (error) {
                        console.error('Error getting block height:', error);
                        // Don't update currentBlockHeight if call fails
                    }
                    
                    try {
                        this.currentBlockReward = await this.miningContract.currentReward();
                    } catch (error) {
                        console.error('Error getting current reward:', error);
                        // Don't update currentBlockReward if call fails
                    }
                    
                    this.startTime = Date.now();
                    this.blockStartTime = Date.now(); // Reset block start time for new block

                    // Flag for restart
                    this.shouldRestartMining = true;
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
            this.blockStartTime = null;
            this.emit('stop',{
                icon: '/images/stop.png',
                text: 'Mining stopped'
            });

            // Clear parameter check interval
            if (this.parameterCheckInterval) {
                clearInterval(this.parameterCheckInterval);
                this.parameterCheckInterval = null;
            }

            // Clean up event listeners
            if (this.miningContract && this.isListening) {
                this.miningContract.removeAllListeners();
                this.isListening = false;
                this.useEvents = false;
            }
        }
    }

    async checkWalletBalance() {
        const balance = await this.provider.getBalance(this.sessionWalletAddress);
        const estimatedGas = MINING_CONFIG.BASE_GAS_LIMIT * MINING_CONFIG.GAS_MULTIPLIER;
        const feeData = await this.provider.getFeeData();
        const requiredBalance = BigInt(Math.floor(estimatedGas)) * feeData.gasPrice;

        if (BigInt(balance) < BigInt(requiredBalance)) {
            this.emit('error', {
                message: "Session wallet needs ETH",
                icon: '/images/error.png'
            });
            return false;
        }
        return true;
    }

    async miningLoop() {
        try {
            // Initial balance check before starting mining loop
            if (!(await this.checkWalletBalance())) {
                this.stop();
                return;
            }

            let lastParamCheck = Date.now();
            const PARAM_CHECK_INTERVAL = this.useEvents ? 30000 : 2000; // Less frequent if using events

            while (this.isRunning) {
                // Check session wallet balance and parameters less frequently
                const now = Date.now();
                if (now - lastParamCheck >= PARAM_CHECK_INTERVAL) {
                    // Check wallet balance
                    if (!(await this.checkWalletBalance())) {
                        this.stop();
                        return;
                    }

                    // Only update parameters if not using events (events handle this automatically)
                    if (!this.useEvents) {
                        await this.updateMiningParameters();
                    }
                    lastParamCheck = now;
                }

                this.emit('mining', { 
                    message: "Mining"
                });

                // Start mining for this block
                const result = await this.findValidNonce();
                
                if (result?.nonce) {
                    let tx;
                    try {
                        tx = await this.submitBlock(result.nonce);
                        this.emit('transaction', { hash: tx.hash });
                    } catch (error) {
                        // Handle submission errors
                        if (error.code === "ACTION_REJECTED") {
                            break; // Stop mining if user rejected
                        }
                        console.error('Error submitting block:', error);
                        this.emit('error', {
                            message: "Failed to submit block",
                            error: error.message,
                            icon: '/images/error.png'
                        });
                        continue; // Skip to next iteration
                    }

                    try {
                        // Listen for mining success event
                        const receipt = await tx.wait();
                        if (receipt.status === 1) {
                            // Find the mining success event to get the actual mined block height
                            const miningEvent = receipt.logs.find(log => {
                                try {
                                    return this.miningContract.interface.parseLog(log)?.name === 'BlockMined';
                                } catch {
                                    return false;
                                }
                            });
                            
                            // Only emit reward event if we found the BlockMined event
                            if (miningEvent) {
                                const parsedEvent = this.miningContract.interface.parseLog(miningEvent).args;
                                const minedBlockHeight = parsedEvent.blockHeight;
                                const formattedReward = ethers.formatUnits(this.currentBlockReward, 18);
                                const rewardRecipient = parsedEvent.rewardRecipient;
                                
                                // Check if reward went to a different wallet
                                const isDelegated = rewardRecipient.toLowerCase() !== this.signerAddress.toLowerCase();
                                
                                this.emit('reward', {
                                    message: `Mined Block #${minedBlockHeight}`,
                                    pill: `+${formattedReward} BOHR`,
                                    icon: '/images/earned.png',
                                    delegated: isDelegated,
                                    recipient: rewardRecipient
                                });
                            }
                        } else {
                            // Transaction was reverted
                            this.emit('error', {
                                message: "Block submission reverted",
                                icon: '/images/error.png'
                            });
                        }
                    } catch (receiptError) {
                        // Handle confirmation errors separately
                        console.error('Error waiting for transaction receipt:', receiptError);
                        
                        // Check if it's a rate limit or RPC error
                        if (receiptError.code === -32005 || 
                            receiptError.message?.includes('Request exceeds defined limit') ||
                            receiptError.message?.includes('Quorum') ||
                            receiptError.message?.includes('RPC Error')) {
                            this.emit('error', {
                                message: "RPC rate limit reached, retrying...",
                                icon: '/images/wait.png'
                            });
                            // Add a small delay before continuing
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        } else {
                            this.emit('error', {
                                message: "Transaction confirmation failed",
                                error: receiptError.message,
                                icon: '/images/error.png'
                            });
                        }
                    }
                }
                
                // Reset mining state for next iteration
                this.bestNonce = null;
                this.bestHash = null;
                this.previousBestHash = null;
                this.startTime = Date.now();
                this.progress = 0;
            }
        } catch (error) {
            this.emit('error', {
                message: "Mining error",
                error: error.message
            });
            console.error('Mining error:', error);
            this.stop();
        }
    }

    async updateMiningParameters() {
        try {
            // Single call gets everything using the new batch function
            const params = await this.miningContract.getMinerParams(this.signerAddress);
            
            // Check if anything actually changed
            if (params._lastBlockHash !== this.latestBlockHash) {
                this.emit('new_block', {
                    message: "New block",
                    icon: '/images/new-block.png',
                    blockHeight: params._blockHeight,
                    lastBlockHash: params._lastBlockHash,
                    pill: `#${params._blockHeight}`
                });
            }

            if (params._baseDifficulty !== this.baseDifficulty) {
                this.emit('difficulty_change', {
                    message: "Difficulty changed",
                    icon: '/images/gauge.png',
                    difficulty: params._baseDifficulty
                });
            }

            // Update all values atomically
            this.latestBlockHash = params._lastBlockHash;
            this.baseDifficulty = params._baseDifficulty;
            this.currentBlockHeight = params._blockHeight;
            this.currentBlockReward = params._currentReward;
            this.minerDifficulty = params._minerDifficulty;
            
            this.startTime = Date.now();
            this.blockStartTime = Date.now(); // Reset block start time for new block
            
        } catch (error) {
            console.error('Error updating mining parameters:', error);
            // Fallback to individual calls if batch call fails
            await this.updateMiningParametersFallback();
        }
    }

    // Fallback method using individual calls
    async updateMiningParametersFallback() {
        // Get parameters individually with error handling
        let blockHash, minerDifficulty, blockHeight, reward, baseDifficulty;
        
        try {
            blockHash = await this.miningContract.lastBlockHash();
        } catch (error) {
            console.error('Error getting last block hash:', error);
            return; // Don't update if we can't get the block hash
        }
        
        try {
            minerDifficulty = await this.miningContract.getMinerDifficulty(this.signerAddress);
        } catch (error) {
            console.error('Error getting miner difficulty:', error);
            // Keep existing minerDifficulty value
        }
        
        try {
            blockHeight = await this.miningContract.blockHeight();
        } catch (error) {
            console.error('Error getting block height:', error);
            // Keep existing blockHeight value
        }
        
        try {
            reward = await this.miningContract.currentReward();
        } catch (error) {
            console.error('Error getting current reward:', error);
            // Keep existing reward value
        }
        
        try {
            baseDifficulty = await this.miningContract.baseDifficulty();
        } catch (error) {
            console.error('Error getting base difficulty:', error);
            // Keep existing baseDifficulty value
        }

        if (blockHash !== this.latestBlockHash) {
            this.emit('new_block', {
                message: "New block",
                icon: '/images/new-block.png',
                blockHeight,
                lastBlockHash: blockHash,
                pill: `#${blockHeight}`
            });

            if (baseDifficulty !== this.baseDifficulty) {
                this.emit('difficulty_change', {
                    message: "Difficulty changed",
                    icon: '/images/params.png',
                    difficulty: baseDifficulty,
                });
            }
        }

        this.latestBlockHash = blockHash;
        if (minerDifficulty !== undefined) this.minerDifficulty = minerDifficulty;
        if (baseDifficulty !== undefined) this.baseDifficulty = baseDifficulty;
        if (blockHeight !== undefined) this.currentBlockHeight = blockHeight;
        if (reward !== undefined) this.currentBlockReward = reward;
        this.startTime = Date.now();
        this.blockStartTime = Date.now(); // Reset block start time for new block
    }

    async findValidNonce() {
        const randomBuffer = new Uint32Array(MINING_CONFIG.MINING_BATCH_SIZE);
        let hashCount = 0;
        let lastHashRateUpdate = Date.now();
        
        // Initialize bestHash to max value
        this.bestHash = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
        
        while (this.isRunning) {
            // Check block parameters less frequently (every 10 batches)
            if (hashCount % (MINING_CONFIG.MINING_BATCH_SIZE * 10) === 0) {
                try {
                    // Use the new batch function for parameter checks
                    const params = await this.miningContract.getMinerParams(this.signerAddress);
                    
                    if (params._lastBlockHash !== this.latestBlockHash || params._minerDifficulty !== this.minerDifficulty) {
                        return null;
                    }
                } catch (error) {
                    console.error('Error checking parameters in mining loop:', error);
                    // Continue mining with current parameters if check fails
                }
            }

            // Fill buffer with cryptographically secure random numbers
            crypto.getRandomValues(randomBuffer);

            // Update progress bar
            this.updateProgress();

            const now = Date.now();
            if (now - lastHashRateUpdate >= this.hashRateUpdateInterval) {
                this.updateHashRate(hashCount, now);
                hashCount = 0;
                lastHashRateUpdate = now;
            }

            for (let i = 0; i < MINING_CONFIG.MINING_BATCH_SIZE; i++) {
                if (!this.isRunning) return null;
                
                const nonce = randomBuffer[i];
                const hash = ethers.keccak256(
                    ethers.solidityPacked(
                        ["address", "bytes32", "uint256", "uint256"],
                        [this.signerAddress, this.latestBlockHash, this.minerDifficulty, nonce]
                    )
                );

                hashCount++;
                const hashValue = BigInt(hash);
                
                if (hashValue < this.bestHash) {
                    
                    this.bestHash = hashValue;
                    this.previousBestHash = hashValue;
                    
                    if (hashValue <= this.minerDifficulty) {
                        this.progress = 100;
                    }
                }

                if (hashValue <= this.minerDifficulty) {
                    this.emit('nonce_found', {
                        icon: '/images/trophy.png',
                        text: 'Hash found',
                        pill: `0x${hashValue.toString(16).padStart(64, '0').substring(0, 12)}…`,
                    });
                    return { nonce, hashValue };
                }
            }
            
            // Use requestAnimationFrame instead of setTimeout for better performance
            await new Promise(resolve => requestAnimationFrame(resolve));
        }
        return null;
    }

    async submitBlock(nonce) {
        const tx = await this.miningContract.submitBlock(
            nonce,
            {
                gasLimit: Math.floor(
                    MINING_CONFIG.GAS_MULTIPLIER * MINING_CONFIG.BASE_GAS_LIMIT
                )
            }
        );
        return tx;
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

    // Add getter method
    getBlockHeight() {
        return this.currentBlockHeight;
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

    // Add this new getter method
    getSessionWalletAddress() {
        return this.sessionWalletAddress;
    }

    // Add this new method to set the context
    setSessionWalletContext(context) {
        this.sessionWalletContext = context;
    }

    // Add getter for base difficulty
    getBaseDifficulty() {
        return this.baseDifficulty ? this.baseDifficulty.toString(16) : null;
    }

    // Add getter for miner difficulty
    getMinerDifficulty() {
        return this.minerDifficulty ? this.minerDifficulty.toString(16) : null;
    }

    // Add getter for block start time
    getBlockStartTime() {
        return this.blockStartTime;
    }
}

// Export a singleton instance
export const miningService = new MiningService();