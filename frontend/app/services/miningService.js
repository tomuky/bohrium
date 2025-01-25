import { ethers } from 'ethers';
import { MINING_ABI, TOKEN_ABI, MINING_CONFIG, MINING_EVENTS } from './constants';
import { sleep, getCurrentTimestamp } from './utils';
import { getNetworkConfig } from './config';
import { FACTORY_ABI, MINING_ACCOUNT_ABI } from './constants';

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
        this.factory = null;
        this.sessionSigner = null;
        this.sessionWallet = null;
        this.sessionKeyDeployed = false;
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
            console.log('Connecting to mining service');
            if (!window.ethereum) {
                throw new Error('MetaMask is not installed');
            }

            this.provider = new ethers.BrowserProvider(window.ethereum);
            console.log('Provider initialized');

            this.signer = await this.provider.getSigner();
            const address = await this.signer.getAddress();
            console.log('Signer initialized:', address);

            const chainId = (await this.provider.getNetwork()).chainId;
            console.log('Chain ID:', chainId);
            
            const networkConfig = getNetworkConfig(Number(chainId));
            
            // Initialize factory contract first
            this.factory = new ethers.Contract(
                networkConfig.contracts.factory, // Make sure this exists in networkConfig
                FACTORY_ABI, // Need to import this
                this.signer
            );

            // Initialize mining contract
            this.miningContract = new ethers.Contract(
                networkConfig.contracts.mining,
                MINING_ABI,
                this.signer
            );
            
            // Initialize token contract
            const bohrTokenAddress = await this.miningContract.bohriumToken();
            this.bohrToken = new ethers.Contract(bohrTokenAddress, TOKEN_ABI, this.signer);
            
            // Load mining account
            await this.loadMiningAccount();
            
            // Setup transfer event listener
            await this.setupRewardListener();

            // Create and deploy session key if needed
            await this.setupSessionKey();
            
            // Setup transfer event listener
            await this.setupRewardListener();
        } catch (error) {
            console.error('Error in connect():', error);
            throw error;
        }
    }

    async setupRewardListener() {
        if (this.rewardListener) {
            this.bohrToken.removeListener('Transfer', this.rewardListener);
        }

        // Get mining account address instead of signer address
        const myAddress = this.miningAccount.target;
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

    async loadMiningAccount() {
        try {
            const userAddress = await this.signer.getAddress();
            console.log('Loading mining account for:', userAddress);
            
            const miningAccountAddress = await this.factory.userToMiningAccount(userAddress);
            console.log('Mining account address:', miningAccountAddress);
            
            if (miningAccountAddress === ethers.ZeroAddress) {
                throw new Error('No mining account found. Please create and fund a mining account first.');
            }
            
            this.miningAccount = new ethers.Contract(
                miningAccountAddress,
                MINING_ACCOUNT_ABI,
                this.signer
            );
        } catch (error) {
            console.error('Error in loadMiningAccount:', error);
            throw error;
        }
    }

    async start() {
        if (this.isRunning) return;
        console.log('Starting mining service')
        
        try {
            await this.connect();
            
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

    async setupSessionKey() {
        // Create a new random session key if we don't have one
        if (!this.sessionSigner) {
            const sessionKey = ethers.Wallet.createRandom();
            this.sessionSigner = sessionKey.connect(this.provider);
            this.sessionWallet = sessionKey.address;
        }

        // Check if session key is already authorized by checking the sessionKeys mapping
        const sessionKeyInfo = await this.miningAccount.sessionKeys(this.sessionWallet);
        const isAuthorized = sessionKeyInfo.isValid && 
                            sessionKeyInfo.expiry > Math.floor(Date.now() / 1000);

        if (!isAuthorized) {
            // Estimate gas needed for 1 hour of mining
            const gasPrice = await this.provider.getFeeData();
            const estimatedGasPerOp = MINING_CONFIG.BASE_GAS_LIMIT * MINING_CONFIG.GAS_MULTIPLIER;
            const opsPerHour = Math.ceil(3600 / (MINING_CONFIG.MIN_ROUND_DURATION + 30)); // +30s buffer
            const estimatedGasNeeded = estimatedGasPerOp * opsPerHour;
            const ethNeeded = (gasPrice.gasPrice * BigInt(estimatedGasNeeded));

            // Authorize session key and fund it
            const tx = await this.miningAccount.authorizeSessionKeyWithFunding(
                this.sessionWallet,
                ethNeeded,
                {
                    value: ethNeeded
                }
            );
            await tx.wait();
            this.sessionKeyDeployed = true;
        } else {
            this.sessionKeyDeployed = true;
        }
    }

    async stop() {
        if (this.isRunning) {
            this.isRunning = false;
            this.emit(MINING_EVENTS.STOP);

            // Return remaining ETH to mining account
            if (this.sessionKeyDeployed) {
                try {
                    const balance = await this.provider.getBalance(this.sessionWallet);
                    const gasPrice = await this.provider.getFeeData();
                    const gasLimit = 21000; // Simple ETH transfer
                    const gasCost = gasPrice.gasPrice * BigInt(gasLimit);
                    // Add 10% buffer to gas cost for safety
                    const gasBuffer = (gasCost * BigInt(110)) / BigInt(100);
                    
                    if (balance > gasBuffer) {
                        const amountToReturn = balance - gasBuffer;
                        const tx = await this.sessionSigner.sendTransaction({
                            to: this.miningAccount.target,
                            value: amountToReturn,
                            gasLimit
                        });
                        await tx.wait();
                        
                        // Any remaining dust after the transfer will be negligible
                    } else {
                        console.log('Balance too low to return funds safely', {
                            balance: balance.toString(),
                            requiredWithBuffer: gasBuffer.toString()
                        });
                    }
                } catch (error) {
                    console.error('Error returning funds:', error);
                }
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
        }
    }

    async miningLoop() {
        console.log('Mining loop started');
        try {
            const roundId = await this.miningContract.roundId();
            console.log('Current round ID:', roundId.toString());
            
            const roundStart = BigInt(await this.miningContract.roundStartTime());
            const currentTime = BigInt(Math.floor(Date.now() / 1000));
            const roundAge = Number(currentTime - roundStart);
            console.log('Round details:', {
                roundStart: roundStart.toString(),
                currentTime: currentTime.toString(),
                roundAge,
                minRoundDuration: MINING_CONFIG.MIN_ROUND_DURATION
            });

            // Check if we're in a new round
            if (roundId !== this.lastRoundId) {
                console.log('New round detected');
                this.emit(MINING_EVENTS.ROUND_START, { roundId: roundId.toString() });
                this.lastRoundId = roundId;
            }

            // If round is over
            if (roundAge >= MINING_CONFIG.MIN_ROUND_DURATION) {
                console.log('Round duration exceeded, preparing to end round');
                // Wait for 10 seconds to see if someone else ends the round
                this.emit(MINING_EVENTS.WAITING, { 
                    message: "Waiting for round to end",
                    endTime: Date.now() + 10000
                });
                
                await sleep(10000);
                
                // Check if we're still in the same round
                const newRoundId = await this.miningContract.roundId();
                if (newRoundId === roundId && this.isRunning) {
                    this.emit(MINING_EVENTS.TRANSACTION, {
                        message: "Preparing transaction to end round",
                        icon: '/images/checklist.png'
                    });

                    // Use endRound helper method that handles session key
                    const tx = await this.endRound();
                    
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

            // Calculate mining duration
            const miningDuration = Math.max(0, MINING_CONFIG.MIN_ROUND_DURATION - roundAge - MINING_CONFIG.TX_BUFFER);
            console.log('Mining duration calculated:', {
                miningDuration,
                roundAge,
                txBuffer: MINING_CONFIG.TX_BUFFER
            });

            if (miningDuration > 0) {
                console.log('Starting mining process for duration:', miningDuration);
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

                // Use submitNonce helper method that handles session key
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
                
            } else {
                console.log('Skipping mining - duration is zero or negative');
            }

        } catch (error) {
            console.error('Error in mining loop:', error);
            if (error.code === "ACTION_REJECTED") {
                console.log('User rejected transaction');
                this.emit(MINING_EVENTS.USER_REJECTED);
                this.stop();
                return;
            }
            await sleep(1000);
        }
    }

    async findBestNonce(duration) {
        // Use mining account address instead of signer
        const minerAddress = this.miningAccount.target;
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
        const signer = this.sessionKeyDeployed ? this.sessionSigner : this.signer;
        return this.miningAccount.connect(signer).submitNonce(
            this.miningContract.target,
            nonce,
            {
                gasLimit: Math.floor(
                    MINING_CONFIG.GAS_MULTIPLIER * MINING_CONFIG.BASE_GAS_LIMIT
                )
            }
        );
    }

    async endRound() {
        const signer = this.sessionKeyDeployed ? this.sessionSigner : this.signer;
        return this.miningAccount.connect(signer).endRound(
            this.miningContract.target,
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