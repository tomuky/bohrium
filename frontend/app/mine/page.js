'use client'
import styles from './page.module.css'
import Console from '../components/Console';
import { useMining } from '../contexts/MiningContext';
import { useMiningAccount } from '../hooks/useMiningAccount';
import Image from 'next/image';

const Mine = () => {    
    const { isMining, setIsMining, clearConsole } = useMining();
    const { canMine } = useMiningAccount();

    return (
        <div className={styles.console}>
            <div className={styles.buttonContainer}>
                {!isMining && <div 
                    className={`${styles.startMiningButton} ${!canMine ? styles.disabled : ''}`} 
                    onClick={() => canMine && setIsMining(true)}
                >
                    START MINING
                </div>}
                {isMining && <div className={styles.stopMiningButton} onClick={() => setIsMining(false)}>
                    STOP MINING
                </div>}
                {/* <div className={styles.clearLogButton} onClick={clearConsole}>
                    <Image src="/images/clear.png" alt="Clear" width={20} height={20}/>
                </div> */}
            </div>
            <Console />
        </div>
    )
}

export default Mine;