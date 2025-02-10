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
        this.hashHistory = []; // Array of {timestamp, count} objects
        this.hashRateWindowMs = 10000; // 10 second window
        this.hashRateUpdateInterval = 1000;

        this.lastBohrBalance = BigInt(0);
        this.bohrToken = null;
        this.rewardListener = null;
        this.currentDifficulty = null;
        this.currentBlockHeight = 0;
        this.currentCheckingHash = null;
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

            // Initialize block height
            this.currentBlockHeight = await this.miningContract.blockHeight();

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
        if (this.isRunning) return;
        
        try {
            await this.connect();
            
            this.isRunning = true;
            this.bestHash = null;
            this.emit('start',{
                icon: '/images/rocket.png',
                text: 'Mining started'
            });
            
            while (this.isRunning) {
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

    async stop() {
        if (this.isRunning) {
            this.isRunning = false;
            this.emit('stop',{
                icon: '/images/stop.png',
                text: 'Mining stopped'
            });
            
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
        const lastBlockHash = await this.miningContract.lastBlockHash();
        this.currentBlockHeight = await this.miningContract.blockHeight();

        if (emitNewBlock) {
            this.emit('new_block', {
                message: "New block found",
                icon: '/images/new-block.png',
                blockHeight: this.currentBlockHeight,
                lastBlockHash
            });
        }

        return { lastBlockHash };
    }

    async miningLoop() {
        try {
            // Get initial parameters
            const { lastBlockHash } = await this.updateMiningParameters();
            
            let resolveParameterChange; 
            let parameterChangePromise;
            
            const handleNewBlock = async (miner, height, nonce, reward, timeTaken, event) => {
                await this.updateMiningParameters(true);
                if (resolveParameterChange) {
                    resolveParameterChange();
                }
            };

            const handleDifficultyChange = async (newDifficulty, event) => {
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
                    lastBlockHash
                });

                const { nonce, hash } = await this.findValidNonce(this.currentDifficulty, lastBlockHash);
                
                console.log('best nonce: ', nonce);
                console.log('best hash: ', hash);

                try {
                    this.emit('preparing_transaction', {
                        message: "Preparing transaction",
                        icon: '/images/checklist.png'
                    });
                    const tx = await this.submitBlock(nonce);
                    
                    this.emit('transaction', {
                        message: "Transaction submitted",
                        hash: tx.hash,
                        icon: '/images/send.png'
                    });

                    // Create new promise for parameter change
                    parameterChangePromise = new Promise(resolve => {
                        resolveParameterChange = resolve;
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
                        break;
                    }
                    
                    this.emit('error', {
                        message: "Block submission failed",
                        error: error.message,
                        icon: '/images/error.png'
                    });
                    
                    this.currentDifficulty = await this.miningContract.currentDifficulty();
                    lastBlockHash = await this.miningContract.lastBlockHash();
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
        }
    }

    async findValidNonce(targetDifficulty, lastBlockHash) {
        const signerAddress = await this.signer.getAddress();
        
        let hashCount = 0;
        let lastHashRateUpdate = Date.now();
        
        // Initialize bestHash to max value
        this.bestHash = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
        
        while (this.isRunning) {
            // Check if mining parameters have changed
            const currentDiff = await this.miningContract.currentDifficulty();
            const currentLastBlockHash = await this.miningContract.lastBlockHash();
            
            // If parameters changed, return null to trigger a restart of mining loop
            if (currentDiff !== targetDifficulty || currentLastBlockHash !== lastBlockHash) {
                console.log('Mining parameters changed, restarting mining loop');
                return null;
            }

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
                        [signerAddress, lastBlockHash, targetDifficulty, nonce]
                    )
                );

                hashCount++;
                const hashValue = BigInt(hash);
                
                // Update best hash for display purposes
                if (hashValue < this.bestHash) {
                    this.bestHash = hashValue;
                }
                
                // Update current checking hash every 1000 iterations
                if (i % 1000 === 0) {
                    this.currentCheckingHash = hashValue.toString(16);
                }

                // Check if this hash meets the difficulty target
                if (hashValue <= targetDifficulty) {
                    console.log('Found valid hash!', {
                        hashValue: hashValue.toString(16),
                        targetDifficulty: targetDifficulty.toString(16),
                        nonce
                    });
                    return { nonce, hash: hashValue };
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        return null;
    }

    async submitBlock(nonce) {
        const signerAddress = await this.signer.getAddress();  // Get the actual miner's address
        const verificationDifficulty = await this.miningContract.currentDifficulty();
        const verificationLastBlockHash = await this.miningContract.lastBlockHash();
        
        // Calculate hash for verification using signer's address
        const hash = ethers.keccak256(
            ethers.solidityPacked(
                ["address", "bytes32", "uint256", "uint256"],
                [signerAddress, verificationLastBlockHash, verificationDifficulty, nonce]
            )
        );
        
        // Log verification data
        console.log('Submitting block with parameters:', {
            minerAddress: signerAddress,
            lastBlockHash: verificationLastBlockHash,
            difficulty: verificationDifficulty.toString(16),
            nonce: nonce,
            hash: hash
        });

        return this.miningContract.submitBlock(
            nonce,
            {
                gasLimit: Math.floor(
                    MINING_CONFIG.GAS_MULTIPLIER * MINING_CONFIG.BASE_GAS_LIMIT
                )
            }
        );
    }

    // Helper method to update hash rate statistics
    updateHashRate(hashCount, now) {
        this.hashHistory.push({ timestamp: now, count: hashCount });
        
        const cutoffTime = now - this.hashRateWindowMs;
        this.hashHistory = this.hashHistory.filter(entry => entry.timestamp >= cutoffTime);
        
        const totalHashes = this.hashHistory.reduce((sum, entry) => sum + entry.count, 0);
        const timeSpan = (now - Math.min(...this.hashHistory.map(entry => entry.timestamp))) / 1000;
        
        if (this.hashHistory.length > 1 && timeSpan > 0) {
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
}

// Export a singleton instance
export const miningService = new MiningService();