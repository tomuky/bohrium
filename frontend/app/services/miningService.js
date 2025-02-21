import { ethers } from 'ethers';
import { MINING_ABI, TOKEN_ABI, MINING_CONFIG } from './constants';
import { getCurrentTimestamp } from './utils';
import { getNetworkConfig } from './config';
import { useSessionWallet } from '../contexts/SessionWalletContext';

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

        this.currentDifficulty = null;
        this.latestBlockHash = null;
        this.currentBlockHeight = 0;
        this.currentBlockReward = 0;
        this.startTime = null;

        this.currentCheckingHash = null;
        this.progress = 0;
        this.parameterCheckInterval = null;
        this.shouldRestartMining = false;

        this.sessionWallet = null;
        this.sessionWalletAddress = null;
        this.sessionWalletContext = null;
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
            
            const chainId = (await this.provider.getNetwork()).chainId;
            const networkConfig = getNetworkConfig(Number(chainId));

            // Initialize contracts
            this.miningContract = new ethers.Contract(
                networkConfig.contracts.mining,
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
            this.currentBlockReward = await this.miningContract.currentReward();
            this.startTime = Date.now();
            
            // The main mining loop
            await this.miningLoop();

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

                    // this.emit('new_block', {
                    //     message: "New block",
                    //     icon: '/images/new-block.png',
                    //     blockHeight: this.currentBlockHeight,
                    //     lastBlockHash: this.latestBlockHash,
                    //     pill: `#${this.currentBlockHeight}`
                    // });
                    this.emit('params_changed', {
                        message: "Mining parameters changed",
                        icon: '/images/params.png'
                    });
                    
                    const newDifficulty = await this.miningContract.currentDifficulty();
                    if(newDifficulty !== this.currentDifficulty) {
                        this.emit('difficulty_change', {
                            message: "Difficulty changed",
                            icon: '/images/gauge.png',
                            difficulty: newDifficulty
                        });
                    }

                    // Update mining parameters
                    this.latestBlockHash = currentLastBlockHash;
                    this.currentDifficulty = newDifficulty;
                    this.currentBlockHeight = await this.miningContract.blockHeight();
                    this.currentBlockReward = await this.miningContract.currentReward();
                    this.startTime = Date.now();

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
            console.log('Stopping mining');
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

            // Clean up any event listeners if they exist
            if (this.miningContract) {
                this.miningContract.removeAllListeners();
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
            const PARAM_CHECK_INTERVAL = 2000; // Check every 2 seconds

            while (this.isRunning) {
                // Check session wallet balance and parameters less frequently
                const now = Date.now();
                if (now - lastParamCheck >= PARAM_CHECK_INTERVAL) {
                    // Check wallet balance
                    if (!(await this.checkWalletBalance())) {
                        this.stop();
                        return;
                    }

                    // Update mining parameters
                    await this.updateMiningParameters();
                    lastParamCheck = now;
                }

                console.log('Mining loop');
                this.emit('mining', { 
                    message: "Mining"
                });

                // Start mining for this block
                const result = await this.findValidNonce();
                
                if (result?.nonce) {
                    try {
                        const tx = await this.submitBlock(result.nonce);
                        this.emit('transaction', { hash: tx.hash });
                        
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
                                console.log('mining event: ',this.miningContract.interface.parseLog(miningEvent).args)
                                const minedBlockHeight = this.miningContract.interface.parseLog(miningEvent).args.blockHeight;
                                const formattedReward = ethers.formatUnits(this.currentBlockReward, 18);
                                this.emit('reward', {
                                    message: `Mined Block #${minedBlockHeight}`,
                                    pill: `+${formattedReward} BOHR`,
                                    icon: '/images/earned.png'
                                });
                            }
                        }
                    } catch (error) {
                        if (error.code === "ACTION_REJECTED") {
                            break; // Stop mining if user rejected
                        }
                        console.error('Error submitting hash:', error);
                    }
                }
                
                // Reset mining state for next iteration
                this.bestNonce = null;
                this.bestHash = null;
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
        const [blockHash, difficulty, blockHeight, reward] = await Promise.all([
            this.miningContract.lastBlockHash(),
            this.miningContract.currentDifficulty(),
            this.miningContract.blockHeight(),
            this.miningContract.currentReward()
        ]);

        if (blockHash !== this.latestBlockHash) {
            this.emit('new_block', {
                message: "New block",
                icon: '/images/new-block.png',
                blockHeight,
                lastBlockHash: blockHash,
                pill: `#${blockHeight}`
            });

            if (difficulty !== this.currentDifficulty) {
                this.emit('difficulty_change', {
                    message: "Difficulty changed",
                    icon: '/images/params.png',
                    difficulty
                });
            }
        }

        this.latestBlockHash = blockHash;
        this.currentDifficulty = difficulty;
        this.currentBlockHeight = blockHeight;
        this.currentBlockReward = reward;
        this.startTime = Date.now();
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
                const currentBlockHash = await this.miningContract.lastBlockHash();
                if (currentBlockHash !== this.latestBlockHash) {
                    return null;
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
                        [this.signerAddress, this.latestBlockHash, this.currentDifficulty, nonce]
                    )
                );

                hashCount++;
                const hashValue = BigInt(hash);
                
                if (hashValue < this.bestHash) {
                    this.bestHash = hashValue;
                    if (hashValue <= this.currentDifficulty) {
                        this.progress = 100;
                    }
                }
                
                if (i % 20000 === 0) {
                    this.currentCheckingHash = hashValue.toString(16);
                }

                if (hashValue <= this.currentDifficulty) {
                    this.emit('nonce_found', {
                        icon: '/images/trophy.png',
                        text: 'Hash found',
                        pill: `${nonce}`,
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

    // Add this new getter method
    getSessionWalletAddress() {
        return this.sessionWalletAddress;
    }

    // Add this new method to set the context
    setSessionWalletContext(context) {
        this.sessionWalletContext = context;
    }
}

// Export a singleton instance
export const miningService = new MiningService();