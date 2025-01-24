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
        this.miningAccount = null;
        this.sessionKey = null;
        this.factory = null;
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

    async loadOrCreateMiningAccount() {
        if (!this.factory) {
            this.factory = new ethers.Contract(
                MINING_ACCOUNT_FACTORY_ADDRESS,
                FACTORY_ABI,
                this.signer
            );
        }
        
        // Try to load existing account
        const userAddress = await this.signer.getAddress();
        let miningAccountAddress = await this.factory.getMiningAccount(userAddress);
        
        // Create new account if none exists
        if (miningAccountAddress === ethers.ZeroAddress) {
            const tx = await this.factory.createMiningAccount();
            const receipt = await tx.wait();
            const event = receipt.logs.find(
                log => log.eventName === 'MiningAccountCreated'
            );
            miningAccountAddress = event.args.account;
        }
        
        this.miningAccount = new ethers.Contract(
            miningAccountAddress,
            MINING_ACCOUNT_ABI,
            this.signer
        );
        
        // Load session key from localStorage if it exists
        await this.loadOrCreateSessionKey();
    }
    
    async loadOrCreateSessionKey() {
        const storageKey = `mining-session-${await this.signer.getAddress()}`;
        const stored = localStorage.getItem(storageKey);
        
        if (stored) {
            const { privateKey, expiry } = JSON.parse(stored);
            
            // Check if stored session is still valid
            const sessionInfo = await this.miningAccount.sessionKeys(
                new ethers.Wallet(privateKey).address
            );
            
            if (sessionInfo.isValid && sessionInfo.expiry > Date.now() / 1000) {
                this.sessionKey = new ethers.Wallet(privateKey);
                return;
            }
        }
        
        // Create new session key
        this.sessionKey = ethers.Wallet.createRandom();
        
        // Get approval for 24 hours
        const duration = 24 * 60 * 60; // 24 hours
        const tx = await this.miningAccount.setSessionKey(
            this.sessionKey.address,
            duration
        );
        await tx.wait();
        
        // Store in localStorage
        localStorage.setItem(storageKey, JSON.stringify({
            privateKey: this.sessionKey.privateKey,
            expiry: Math.floor(Date.now() / 1000) + duration
        }));
    }

    async start() {
        if (this.isRunning) return;
        
        try {
            await this.connect();
            await this.loadOrCreateMiningAccount();
            
            this.isRunning = true;
            this.emit(MINING_EVENTS.START);
            
            while (this.isRunning) {
                await this.miningLoop();
            }
        } catch (error) {
            this.emit(MINING_EVENTS.ERROR, { 
                error: error.message, 
                message: "There was an error" 
            });
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
            const roundId = await this.miningContract.roundId();
            const roundStart = BigInt(await this.miningContract.roundStartTime());
            const currentTime = BigInt(Math.floor(Date.now() / 1000));
            const roundAge = Number(currentTime - roundStart);

            // Check if we're in a new round
            if (roundId !== this.lastRoundId) {
                this.emit(MINING_EVENTS.ROUND_START, { roundId: roundId.toString() });
                this.lastRoundId = roundId;
            }

            // If round is over
            if (roundAge >= MINING_CONFIG.MIN_ROUND_DURATION) {
                // Wait for 10 seconds to see if someone else ends the round
                this.emit(MINING_EVENTS.WAITING, { 
                    message: "Waiting for round to end",
                    endTime: Date.now() + 10000
                });
                
                await sleep(10000);
                
                // Check if we're still in the same round
                const newRoundId = await this.miningContract.roundId();
                if (newRoundId === roundId && this.isRunning) {
                    // No one ended the round, so we'll do it
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
                            hash: receipt.hash
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
                        throw error;
                    }
                }
                return;
            }

            // If we're in the end-round waiting period, just wait because it's too late to submit a nonce
            // if (roundAge >= (MINING_CONFIG.MIN_ROUND_DURATION - MINING_CONFIG.TX_BUFFER)) {
            //     const remainingWait = (MINING_CONFIG.MIN_ROUND_DURATION + MINING_CONFIG.END_ROUND_WAIT + 10 ) - roundAge;
            //     const endTime = Date.now() + (remainingWait * 1000);
            //     this.emit(MINING_EVENTS.WAITING, { 
            //         message: "Waiting for next round to start",
            //         endTime: endTime
            //     });
            //     await sleep(remainingWait * 1000);
            //     return;
            // }

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
                    hash: "0x" + bestHash.toString(16).padStart(64, '0').substring(0, 12) + "..."
                });

                this.emit(MINING_EVENTS.TRANSACTION, {
                    message: "Preparing transaction",
                    icon: '/images/checklist.png'
                });

                const tx = await this.submitNonce(bestNonce);
                
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
                        hash: receipt.hash
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
                    throw error;
                }
                
            }

        } catch (error) {
            if (error.code === "ACTION_REJECTED") { // ethers v6 user rejection code
                this.emit(MINING_EVENTS.USER_REJECTED);
                this.stop();
                return;
            }
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

    async submitNonce(nonce) {
        // Use session key if available, fall back to main wallet
        const signer = this.sessionKey || this.signer;
        
        return this.miningAccount.connect(signer).submitNonce(
            this.miningContract.address,
            nonce,
            {
                gasLimit: Math.floor(
                    MINING_CONFIG.GAS_MULTIPLIER * MINING_CONFIG.BASE_GAS_LIMIT
                )
            }
        );
    }
}

// Export a singleton instance
export const miningService = new MiningService();