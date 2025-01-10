'use client'
import styles from './page.module.css'
import Console from '../components/Console';
import { useMining } from '../contexts/MiningContext';

const Mine = () => {    
    const { isMining, setIsMining } = useMining();

    return (
        <div className={styles.console}>
            {!isMining && <div className={styles.startMiningButton} onClick={() => setIsMining(true)}>
                START MINING
            </div>}
            {isMining && <div className={styles.stopMiningButton} onClick={() => setIsMining(false)}>
                STOP MINING
            </div>}
            <Console />
        </div>
    )
}

export default Mine;