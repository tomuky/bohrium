import { useAccount } from 'wagmi';
import { useSessionWallet } from '../contexts/SessionWalletContext';
import styles from '../mine/page.module.css';
import { useState } from 'react';
import ActionModal from './ActionModal';

const ButtonFundSession = () => {
    const { isConnected } = useAccount();
    const { hasSessionWallet, sessionHasEth } = useSessionWallet();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Only show this button when session wallet exists but has no ETH
    if (!hasSessionWallet || sessionHasEth) {
        return null;
    }

    return (
        <>
            <div 
                className={`${styles.startMiningButton} ${!isConnected ? styles.disabled : ''}`} 
                onClick={() => isConnected && setIsModalOpen(true)}
            >
                FUND SESSION WALLET
            </div>
            
            <ActionModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                initialTab="deposit"
            />
        </>
    );
};

export default ButtonFundSession;
