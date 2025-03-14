import { useAccount } from 'wagmi';
import { useSessionWallet } from '../contexts/SessionWalletContext';
import styles from '../mine/page.module.css';

const ButtonOpenSession = () => {
    const { isConnected } = useAccount();
    const { getSessionWallet, hasSessionWallet } = useSessionWallet();

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

    if(!hasSessionWallet) {
        return (
            <div 
                className={`${styles.startMiningButton} ${!isConnected ? styles.disabled : ''}`} 
                onClick={() => isConnected && handleSessionWallet()}
            >
            OPEN SESSION WALLET
        </div>
    )}
}

export default ButtonOpenSession;