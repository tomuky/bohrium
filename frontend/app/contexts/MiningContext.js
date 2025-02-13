'use client'
import { createContext, useContext, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { miningService } from '../services/miningService';
const MiningContext = createContext({});

export function MiningProvider({ children }) {
    const { isConnected } = useAccount();
    const [isMining, setIsMining] = useState(false);
    const [consoleItems, setConsoleItems] = useState([]);
    const [walletError, setWalletError] = useState(null);
    const [currentHashRate, setCurrentHashRate] = useState(0);
    const [bestHash, setBestHash] = useState(null);
    const [currentDifficulty, setCurrentDifficulty] = useState(null);
    const [blockHeight, setBlockHeight] = useState(null);
    const [currentCheckingHash, setCurrentCheckingHash] = useState(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const unsubscribe = miningService.subscribe((event) => {
            // Update current best hash when mining
            if (event.type === 'mining' && event.data.bestHash) {
                setBestHash(event.data.bestHash);
            }
            
            const newItem = createConsoleItem(event);
            if (newItem) {
                setConsoleItems(prev => [newItem, ...prev]);
                
                // Handle transaction rejection by stopping mining
                if (event.type === 'user_rejected') {
                    setIsMining(false);
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (isMining) {
            if (!isConnected) {
                setWalletError('Wallet not connected');
                setIsMining(false);
                return;
            }

            miningService.start().catch(error => {
                setWalletError(error.message);
                setIsMining(false);
            });
        } else {
            miningService.stop();
        }
    }, [isMining, isConnected]);

    // Update metrics from mining service
    useEffect(() => {
        if (!isMining) {
            setCurrentHashRate(0);
            setBestHash(null);
            setCurrentDifficulty(null);
            setBlockHeight(null);
            setCurrentCheckingHash(null);
            setProgress(0);
            return;
        }

        // Main metrics interval (slower updates)
        const metricsInterval = setInterval(() => {
            setCurrentHashRate(miningService.currentHashRate);
            setBestHash(miningService.getBestHash());
            setCurrentDifficulty(miningService.getDifficulty());
            setBlockHeight(miningService.getBlockHeight());
            setProgress(miningService.getProgress());
            setCurrentCheckingHash(miningService.getCurrentCheckingHash());
        }, 1000);

        return () => {
            clearInterval(metricsInterval);
        };
    }, [isMining]);

    const createConsoleItem = (event) => {
        const { type, data = {}, timestamp = Date.now() } = event;

        const eventMap = {
            'mining': {
                icon: '/images/pickaxe.png',
                text: data.message,
                difficulty: data.difficulty
            },
            'transaction': {
                icon: '/images/send.png',
                text: data.message,
                hash: data.hash,
                error: data.error
            },
            'error': {
                icon: '/images/error.png',
                text: data.message,
                error: data.error
            },
            'user_rejected': {
                icon: '/images/error.png',
                text: 'Transaction rejected by user',
                error: true
            }
        };

        const eventConfig = eventMap[type];
        if (!eventConfig) {
            // Fallback case for unknown event types
            return {
                icon: '/images/info.png', // fallback icon
                text: data.message || `Unknown event: ${type}`,
                type,
                timestamp,
                ...data // Pass through any additional data
            };
        }

        return {
            ...eventConfig,
            type,
            timestamp
        };
    };

    const clearConsole = () => setConsoleItems([]);

    const calculateProgress = (bestHash, difficulty) => {
        // Convert hex strings to BigInts
        const maxHash = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
        const bestHashBig = BigInt(`0x${bestHash}`);
        const difficultyBig = BigInt(`0x${difficulty}`);
        
        // Calculate progress - lower hashes are better, so we want the percentage of how close
        // we are to the difficulty target (which is our goal)
        const distance = bestHashBig > difficultyBig ? BigInt(0) : difficultyBig - bestHashBig;
        const total = difficultyBig;
        
        // Convert to percentage, capped at 100%
        return Math.min(100, Number((BigInt(100) * distance * BigInt(100) / total) / BigInt(100)));
    };

    return (
        <MiningContext.Provider value={{ 
            isMining, 
            setIsMining, 
            consoleItems,
            clearConsole,
            currentHashRate,
            bestHash,
            currentDifficulty,
            blockHeight,
            currentCheckingHash,
            progress
        }}>
            {children}
        </MiningContext.Provider>
    );
}

export const useMining = () => useContext(MiningContext);