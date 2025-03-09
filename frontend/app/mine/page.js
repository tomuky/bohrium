'use client'
import styles from './page.module.css'
import Console from '../components/Console';
import { useMining } from '../contexts/MiningContext';
import { useAccount } from 'wagmi';
import { useSmartSession } from '../contexts/SmartSessionContext';

const Mine = () => {    
    const { isMining, setIsMining } = useMining();
    const { isConnected } = useAccount();
    const { requestSmartSession, hasActiveSession, isRequestingSession } = useSmartSession();

    const handleStartMining = async () => {
        console.log('hasActiveSession', hasActiveSession);
        try {
            // Request Smart Session if needed
            const result = await requestSmartSession();
            console.log('result', result);
            if (result.success || hasActiveSession) {
                // Start mining with Smart Session
                setIsMining(true);
            } else {
                console.warn('Smart Session not supported:', result.error);
                
                // If Smart Session is not supported, fall back to regular mining
                console.log('Falling back to regular mining (transactions will require approval)');
                
                // Start mining without Smart Session
                setIsMining(true);
            }
        } catch (error) {
            console.error('Error in mining setup:', error);
        }
    };

    return (
        <div className={styles.console}>
            <div className={styles.buttonContainer}>
                {!isMining && <div 
                    className={`${styles.startMiningButton} ${!isConnected || isRequestingSession ? styles.disabled : ''}`} 
                    onClick={() => isConnected && !isRequestingSession && handleStartMining()}
                >
                    {isRequestingSession ? 'REQUESTING SESSION...' : 'START MINING'}
                </div>}

                {isMining && <div className={styles.stopMiningButton} onClick={() => setIsMining(false)}>
                    STOP MINING
                </div>}
            </div>
            {<Console />}
        </div>
    )
}

export default Mine;