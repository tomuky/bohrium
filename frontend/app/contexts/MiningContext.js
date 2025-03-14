'use client'
import { createContext, useContext, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { miningService } from '../services/miningService';
import { useSessionWallet } from './SessionWalletContext';

const MiningContext = createContext({});

export function MiningProvider({ children }) {
    const { isConnected, address } = useAccount();
    const sessionWalletContext = useSessionWallet();
    const [isMining, setIsMining] = useState(false);
    const [consoleItems, setConsoleItems] = useState([]);
    const [walletError, setWalletError] = useState(null);
    const [currentHashRate, setCurrentHashRate] = useState(0);
    const [bestHash, setBestHash] = useState(null);
    const [baseDifficulty, setBaseDifficulty] = useState(null);
    const [minerDifficulty, setMinerDifficulty] = useState(null);
    const [blockHeight, setBlockHeight] = useState(null);
    const [currentCheckingHash, setCurrentCheckingHash] = useState(null);
    const [progress, setProgress] = useState(0);
    const [sessionWalletAddress, setSessionWalletAddress] = useState(null);

    useEffect(() => {
        const unsubscribe = miningService.subscribe((event) => {
            // Update current best hash when mining
            if (event.type === 'mining' && event.data.bestHash) {
                setBestHash(event.data.bestHash);
            }

            if (event.type === 'session_key_generated') {
                console.log('sessionWalletAddress', event.data.address);
                setSessionWalletAddress(event.data.address);
            }
            
            const newItem = createConsoleItem(event);
            if (newItem) {
                setConsoleItems(prev => {
                    const updatedItems = [newItem, ...prev];
                    // Truncate the list to keep only the most recent 30 items
                    return updatedItems.slice(0, 30);
                });
                
                // Handle transaction rejection by stopping mining
                if (event.type === 'user_rejected') {
                    setIsMining(false);
                }

                // Handle the stopping mining
                if (event.type === 'stop') {
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
            setBaseDifficulty(null);
            setMinerDifficulty(null);
            setBlockHeight(null);
            setCurrentCheckingHash(null);
            setProgress(0);
            return;
        }

        // Main metrics interval (slower updates)
        const metricsInterval = setInterval(() => {
            setCurrentHashRate(miningService.currentHashRate);
            setBestHash(miningService.getBestHash());
            setBaseDifficulty(miningService.getBaseDifficulty());
            setMinerDifficulty(miningService.getMinerDifficulty());
            setBlockHeight(miningService.getBlockHeight());
            setProgress(miningService.getProgress());
            setCurrentCheckingHash(miningService.getCurrentCheckingHash());
        }, 1000);

        return () => {
            clearInterval(metricsInterval);
        };
    }, [isMining]);

    useEffect(() => {
        if (sessionWalletContext) {
            miningService.setSessionWalletContext(sessionWalletContext);
        }
    }, [sessionWalletContext]);

    const createConsoleItem = (event) => {
        // Use UTC timestamp in ISO format
        const timestamp = new Date().toISOString();
        const { type, data = {} } = event;

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

    return (
        <MiningContext.Provider value={{ 
            isMining, 
            setIsMining, 
            consoleItems,
            clearConsole,
            currentHashRate,
            bestHash,
            baseDifficulty,
            minerDifficulty,
            blockHeight,
            currentCheckingHash,
            progress,
            sessionWalletAddress,
            mainWalletAddress: address
        }}>
            {children}
        </MiningContext.Provider>
    );
}

export const useMining = () => useContext(MiningContext);