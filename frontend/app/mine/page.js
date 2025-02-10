'use client'
import styles from './page.module.css'
import Console from '../components/Console';
import { useMining } from '../contexts/MiningContext';
import { useAccount } from 'wagmi';

const Mine = () => {    
    const { isMining, setIsMining } = useMining();
    const { isConnected } = useAccount();

    return (
        <div className={styles.console}>
            <div className={styles.buttonContainer}>
                {!isMining && <div 
                    className={`${styles.startMiningButton} ${!isConnected ? styles.disabled : ''}`} 
                    onClick={() => isConnected && setIsMining(true)}
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