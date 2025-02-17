'use client'
import styles from './page.module.css'
import Console from '../components/Console';
import { useMining } from '../contexts/MiningContext';
import { useAccount } from 'wagmi';
import { useState } from 'react';
import { useSessionWallet } from '../contexts/SessionWalletContext';

const Mine = () => {    
    const { isMining, setIsMining } = useMining();
    const { isConnected } = useAccount();
    const { getSessionWallet, sessionWalletAddress, hasSessionWallet } = useSessionWallet();

    const handleSessionWallet = async () => {
        if (!hasSessionWallet) {
            try {
                await getSessionWallet();
            } catch (error) {
                console.error('Failed to create session wallet:', error);
                return;
            }
        }
    };

    const handleStartMining = async () => {
        setIsMining(true);
    };

    return (
        <div className={styles.console}>
            <div className={styles.buttonContainer}>

                {!hasSessionWallet && !isMining && <div 
                    className={`${styles.startMiningButton} ${!isConnected ? styles.disabled : ''}`} 
                    onClick={() => isConnected && handleSessionWallet()}
                >
                    OPEN SESSION WALLET
                </div>}

                {!isMining && hasSessionWallet && <div 
                    className={`${styles.startMiningButton} ${!isConnected ? styles.disabled : ''}`} 
                    onClick={() => isConnected && handleStartMining()}
                >
                    START MINING
                </div>}

                {isMining && <div className={styles.stopMiningButton} onClick={() => setIsMining(false)}>
                    STOP MINING
                </div>}
            </div>
            <Console />
        </div>
    )
}

export default Mine;