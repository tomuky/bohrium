import { ethers } from 'ethers';
import { MINING_ABI, TOKEN_ABI, MINING_CONFIG, MINING_EVENTS } from './constants';
import { formatBalance, sleep, getCurrentTimestamp } from './utils';
import { getNetworkConfig, DEFAULT_NETWORK } from './config';

class MiningService {
    constructor() {
        this.isRunning = false;
        this.listeners = new Set();
        this.currentHashRate = 0;
        this.hashRateHistory = [];
        this.hashRateWindowSize = 10;
        this.hashRateUpdateInterval = 1000;
        this.hashHistory = []; // Array of {timestamp, count} objects
        this.hashRateWindowMs = 10000; // 10 second window
        this.hashRateUpdateInterval = 1000;
        this.lastBohrBalance = BigInt(0); // Add this line to track the last balance
        this.bohrToken = null;
        this.rewardListener = null;
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
        if (!window.ethereum) {
            throw new Error('MetaMask is not installed');
        }

        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();
        
        // Get the current network
        const chainId = (await this.provider.getNetwork()).chainId;
        const networkConfig = getNetworkConfig(Number(chainId));
        
        // Initialize contracts
        this.miningContract = new ethers.Contract(
            networkConfig.contracts.mining,
            MINING_ABI,
            this.signer
        );
        
        // Initialize token contract
        const bohrTokenAddress = await this.miningContract.bohriumToken();
        this.bohrToken = new ethers.Contract(bohrTokenAddress, TOKEN_ABI, this.signer);
        
        // Setup transfer event listener
        await this.setupRewardListener();
    }

    async setupRewardListener() {
        if (this.rewardListener) {
            this.bohrToken.removeListener('Transfer', this.rewardListener);
        }

        // Verify we have the correct addresses
        const myAddress = await this.signer.getAddress();
        const miningAddress = this.miningContract.target;

        this.rewardListener = async (from, to, amount, event) => {
            // Get block timestamp
            const block = await this.provider.getBlock(event.blockNumber);
            const timestamp = block.timestamp;

            console.log('Transfer event received:', {
                from,
                to,
                amount: amount.toString(),
                myAddress,
                miningAddress,
                timestamp
            });

            // Only process incoming transfers from the mining contract or zero address
            if (to.toLowerCase() === myAddress.toLowerCase() && 
                (from.toLowerCase() === miningAddress.toLowerCase() ||
                 from.toLowerCase() === "0x0000000000000000000000000000000000000000")) {
                
                const formattedAmount = ethers.formatUnits(amount, 18);
                
                this.emit(MINING_EVENTS.REWARD, {
                    message: 'Earned BOHR',
                    reward: formattedAmount,
                    timestamp
                });
            }
        };

        // Add error handling for the event listener
        this.bohrToken.on('Transfer', this.rewardListener)
            .catch(error => {
                console.error('Error in transfer listener:', error);
                this.emit(MINING_EVENTS.ERROR, { 
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
            this.emit(MINING_EVENTS.START);
            
            while (this.isRunning) {
                await this.miningLoop();
            }
        } catch (error) {
            this.emit(MINING_EVENTS.ERROR, { error: error.message, message: "There was an error"  });
            this.stop();
        }
    }

    stop() {
        if (this.isRunning) {
            this.isRunning = false;
            this.emit(MINING_EVENTS.STOP);
            
            // Clean up listeners
            if (this.rewardListener && this.bohrToken) {
                try {
                    this.bohrToken.removeListener('Transfer', this.rewardListener);
                    this.rewardListener = null;
                } catch (error) {
                    console.error('Error removing transfer listener:', error);
                }
            }
        }
    }

    async miningLoop() {
        try {
            const roundId = await this.miningContract.roundId(); // maybe only check this every 10 seconds
            const roundStart = BigInt(await this.miningContract.roundStartTime()); // same here
            const currentTime = BigInt(Math.floor(Date.now() / 1000));
            const roundAge = Number(currentTime - roundStart);

            // Check if we're in a new round
            if (roundId !== this.lastRoundId) {
                this.emit(MINING_EVENTS.ROUND_START, { roundId: roundId.toString() });
                this.lastRoundId = roundId;
            }

            // Check round age first
            if (roundAge >= MINING_CONFIG.MIN_ROUND_DURATION + MINING_CONFIG.END_ROUND_WAIT) {
                
                if (!this.isRunning) return;

                this.emit(MINING_EVENTS.TRANSACTION, {
                    message: "Preparing transaction to end round",
                    icon: '/images/checklist.png'
                });

                const tx = await this.miningContract.endRound();
                
                this.emit(MINING_EVENTS.TRANSACTION, {
                    message: "Transaction submitted",
                    icon: '/images/send.png',
                    hash: tx.hash
                });           

                try {
                    const receipt = await tx.wait(MINING_CONFIG.CONFIRMATIONS);
                    this.emit(MINING_EVENTS.TRANSACTION, {
                        message: "Transaction confirmed",
                        icon: '/images/check.png',
                        hash: tx.hash
                    });
                } catch (error) {
                    this.emit(MINING_EVENTS.TRANSACTION, {
                        message: "Transaction failed",
                        icon: '/images/error.png',
                        error: error.message
                    });
                    console.log('Transaction failed:', {
                        hash: tx.hash,
                        error: error.message,
                        status: 'error'
                    });
                    throw error; // Re-throw to be caught by the outer try-catch
                }

                return;
            }

            // If we're in the end-round waiting period, just wait because it's too late to submit a nonce
            if (roundAge >= (MINING_CONFIG.MIN_ROUND_DURATION - MINING_CONFIG.TX_BUFFER)) {
                const remainingWait = (MINING_CONFIG.MIN_ROUND_DURATION + MINING_CONFIG.END_ROUND_WAIT) - roundAge;
                const endTime = Date.now() + (remainingWait * 1000);
                this.emit(MINING_EVENTS.WAITING, { 
                    message: "Waiting for round to end",
                    endTime: endTime
                });
                await sleep(remainingWait * 1000);
                return;
            }

            // Calculate mining duration
            const miningDuration = Math.max(0, MINING_CONFIG.MIN_ROUND_DURATION - roundAge - MINING_CONFIG.TX_BUFFER);
            if (miningDuration > 0) {
                // Start mining with countdown updates
                const startTime = Date.now();
                const endTime = startTime + (miningDuration * 1000);
                
                // Initial mining message
                this.emit(MINING_EVENTS.MINING, { 
                    message: "Mining",
                    endTime: endTime
                });

                // Do the mining
                const { nonce: bestNonce, hash: bestHash } = await this.findBestNonce(miningDuration * 1000);
                
                // Recheck round age before submitting
                const newCurrentTime = BigInt(Math.floor(Date.now() / 1000));
                const newRoundAge = Number(newCurrentTime - roundStart);

                // Skip submission if round should end
                if (newRoundAge >= MINING_CONFIG.MIN_ROUND_DURATION + MINING_CONFIG.END_ROUND_WAIT) {
                    return;
                }
                
                this.emit(MINING_EVENTS.NONCE_FOUND, { 
                    nonce: bestNonce.toString(),
                    hash: "0x" + bestHash.toString(16).padStart(64, '0').substring(0, 24) + "..."
                });

                this.emit(MINING_EVENTS.TRANSACTION, {
                    message: "Preparing transaction",
                    icon: '/images/checklist.png'
                });

                const tx = await this.miningContract.submitNonce(bestNonce, {
                    gasLimit: Math.floor(MINING_CONFIG.GAS_MULTIPLIER * MINING_CONFIG.BASE_GAS_LIMIT)
                });
                
                this.emit(MINING_EVENTS.TRANSACTION, {
                    message: "Transaction submitted",
                    icon: '/images/send.png',
                    hash: tx.hash
                });

                try {
                    const receipt = await tx.wait(MINING_CONFIG.CONFIRMATIONS);
                    this.emit(MINING_EVENTS.TRANSACTION, {
                        message: "Transaction confirmed",
                        icon: '/images/check.png',
                        hash: tx.hash
                    });
                } catch (error) {
                    this.emit(MINING_EVENTS.TRANSACTION, {
                        message: "Transaction failed",
                        icon: '/images/error.png',
                        error: error.message
                    });
                    throw error; // Re-throw to be caught by the outer try-catch
                }
                
            }

        } catch (error) {
            //this.emit(MINING_EVENTS.ERROR, { error: error.message, message: "There was an error" });
            console.log('Error in mining loop:', error);
            await sleep(1000);
        }
    }

    async findBestNonce(duration) {
        const minerAddress = await this.signer.getAddress();
        let bestNonce = 0;
        let bestHash = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
        const endTime = Date.now() + duration;
        let lastProgressUpdate = Date.now();
        
        // Hash rate tracking
        let hashCount = 0;
        let lastHashRateUpdate = Date.now();
        
        // Get the bestHash of the previous round from the contract
        const previousBestHash = await this.miningContract.bestHash();

        while (Date.now() < endTime && this.isRunning) {
            const now = Date.now();
            if (now - lastHashRateUpdate >= this.hashRateUpdateInterval) {
                // Store the hash count for this interval
                this.hashHistory.push({ timestamp: now, count: hashCount });
                
                // Remove entries older than 10 seconds
                const cutoffTime = now - this.hashRateWindowMs;
                this.hashHistory = this.hashHistory.filter(entry => entry.timestamp >= cutoffTime);
                
                // Calculate total hashes in the window
                const totalHashes = this.hashHistory.reduce((sum, entry) => sum + entry.count, 0);
                
                // Calculate time span (in seconds)
                const timeSpan = (now - Math.min(...this.hashHistory.map(entry => entry.timestamp))) / 1000;
                
                // Calculate current hash rate (in kH/s), with safeguards
                if (this.hashHistory.length > 1 && timeSpan > 0) {
                    this.currentHashRate = (totalHashes / timeSpan) / 1000;
                } else {
                    // Show 0 until we have enough data
                    this.currentHashRate = 0;
                }
                
                // Reset counters
                hashCount = 0;
                lastHashRateUpdate = now;
                lastProgressUpdate = now;
            }

            // Process a batch of nonces
            for (let i = 0; i < MINING_CONFIG.MINING_BATCH_SIZE; i++) {
                const nonce = Math.floor(Math.random() * MINING_CONFIG.NONCE_RANGE);
                const hash = ethers.keccak256(
                    ethers.solidityPacked(
                        ["address", "bytes32", "uint256"],
                        [minerAddress, previousBestHash, nonce]
                    )
                );

                hashCount++;
                const hashValue = BigInt(hash);
                if (hashValue < bestHash) {
                    bestHash = hashValue;
                    bestNonce = nonce;
                }
            }
            
            // Allow other events to process
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        return { nonce: bestNonce, hash: bestHash };
    }
}

// Export a singleton instance
export const miningService = new MiningService();