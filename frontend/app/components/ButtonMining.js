import styles from '../mine/page.module.css';
import { useSessionWallet } from '../contexts/SessionWalletContext';
import { useMining } from '../contexts/MiningContext';
import { useAccount } from 'wagmi';
import ButtonConnectWallet from './ButtonConnectWallet';

const ButtonMining = () => {
    const { hasSessionWallet, isDelegated, sessionHasEth } = useSessionWallet();
    const { isMining, setIsMining } = useMining();
    const { isConnected } = useAccount();

    const handleStartMining = async () => {
        setIsMining(true);
    };

    if(hasSessionWallet && isDelegated && sessionHasEth && !isMining) {
        return (
            <div 
                className={`${styles.startMiningButton} ${!isConnected ? styles.disabled : ''}`} 
                onClick={() => isConnected && handleStartMining()}
            >
                START MINING
            </div>
        )
    }

    if(hasSessionWallet && isDelegated && sessionHasEth && isMining) {
        return (
            <div className={styles.stopMiningButton} onClick={() => setIsMining(false)}>
                STOP MINING
            </div>
        )
    }

    // Show connect wallet button when no wallet is connected
    if (!isConnected) {
        return <ButtonConnectWallet />;
    }
}

export default ButtonMining;