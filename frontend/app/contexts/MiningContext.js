'use client'
import { createContext, useContext, useState, useEffect } from 'react';
import { miningService } from '../services/miningService';
import { MINING_EVENTS } from '../services/constants';

const MiningContext = createContext({});

export function MiningProvider({ children }) {
    const [isMining, setIsMining] = useState(false);
    const [consoleItems, setConsoleItems] = useState([]);
    const [walletError, setWalletError] = useState(null);
    const [currentHashRate, setCurrentHashRate] = useState(0);
    const [miningEndTime, setMiningEndTime] = useState(null);

    useEffect(() => {
        const unsubscribe = miningService.subscribe((event) => {
            const newItem = createConsoleItem(event);
            if (newItem) {
                setConsoleItems(prev => [...prev, newItem]);
            }
        });

        return () => {
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (isMining) {
            miningService.start().catch(error => {
                setWalletError(error.message);
                setIsMining(false);
            });
        } else {
            miningService.stop();
        }
    }, [isMining]);

    // Add new useEffect for hash rate updates
    useEffect(() => {
        if (!isMining) {
            setCurrentHashRate(0);
            return;
        }

        const hashRateInterval = setInterval(() => {
            setCurrentHashRate(miningService.currentHashRate);
        }, 1000); // Update every second

        return () => clearInterval(hashRateInterval);
    }, [isMining]);

    // Map events to console items
    const createConsoleItem = (event) => {
        const { type, data = {}, timestamp } = event;

        const eventMap = {
            [MINING_EVENTS.START]: {
                icon: '/images/rocket.png',
                text: 'Mining started'
            },
            [MINING_EVENTS.STOP]: {
                icon: '/images/stop.png',
                text: 'Mining stopped'
            },
            [MINING_EVENTS.ROUND_START]: {
                icon: '/images/round.png',
                text: `Round ${data?.roundId || 'unknown'} started`,
                roundId: data?.roundId
            },
            [MINING_EVENTS.MINING]: {
                icon: '/images/pickaxe.png',
                text: data.message,
                endTime: data.endTime
            },
            [MINING_EVENTS.NONCE_FOUND]: {
                icon: '/images/trophy.png',
                text: 'Best hash found',
                pill: data.hash
            },
            [MINING_EVENTS.BALANCE_UPDATE]: {
                icon: '/images/coins.png',
                text: `BOHR: ${data.bohr}`,
                pill: `+${0} BOHR` // this needs to be the change in balance
            },
            [MINING_EVENTS.SUBMIT]: {
                icon: '/images/send.png',
                text: data.message
            },
            [MINING_EVENTS.CONFIRM]: {
                icon: '/images/check.png',
                text: data.message
            },
            [MINING_EVENTS.WAITING]: {
                icon: '/images/wait.png',
                text: data.message,
                endTime: data.endTime
            },
            [MINING_EVENTS.ERROR]: {
                icon: '/images/error.png',
                text: data.message,
                error: data.error
            },
            [MINING_EVENTS.REWARD]: {
                icon: '/images/wand.png',
                text: data.message,
                pill: `+${data.reward} BOHR`
            },
            [MINING_EVENTS.TRANSACTION]: {
                icon: '/images/spinner.png',
                text: data.messages,
                transactionHash: data.transactionHash
            }
        };

        const eventConfig = eventMap[type];
        if (!eventConfig) return null;

        return {
            ...eventConfig,
            type, // Add type to help identify items
            timestamp
        };
    };

    // Clear the console
    const clearConsole = () => setConsoleItems([]);


    // not using this?
    useEffect(() => {
        if (!miningEndTime) return;

        const timer = setInterval(() => {
            const remaining = Math.ceil((miningEndTime - Date.now()) / 1000);
            
            setConsoleItems(prev => {
                const newItems = [...prev];
                const lastMiningIndex = newItems.findLastIndex(item => item.type === MINING_EVENTS.MINING);
                
                if (lastMiningIndex !== -1) {
                    newItems[lastMiningIndex] = {
                        ...newItems[lastMiningIndex],
                        text: remaining > 0 ? `Mining... (-${remaining}s)` : 'Mining...'
                    };
                }
                return newItems;
            });

            if (remaining <= 0) {
                clearInterval(timer);
                setMiningEndTime(null);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [miningEndTime]);

    return (
        <MiningContext.Provider value={{ 
            isMining, 
            setIsMining, 
            consoleItems,
            clearConsole,
            currentHashRate
        }}>
            {children}
        </MiningContext.Provider>
    );
}

export const useMining = () => useContext(MiningContext);