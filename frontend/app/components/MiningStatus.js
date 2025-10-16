'use client'
import styles from './MiningStatus.module.css'
import { useMining } from '../contexts/MiningContext'

const MiningStatus = () => {
    const { isMining } = useMining();

    return (
        <div className={styles.miningStatus}>
            <div className={`${styles.statusContainer} ${isMining ? styles.mining : ''}`}>
                <div className={styles.statusHeader}>
                    <h3 className={styles.statusLabel}>Mining Status</h3>
                    <div className={styles.statusIndicator}>
                        <span className={styles.statusText}>
                            {isMining ? 'Mining' : 'Idle'}
                        </span>
                        <div className={`${styles.statusDot} ${isMining ? styles.active : styles.inactive}`}>
                            {isMining && (
                                <>
                                    <div className={styles.pulseWave}></div>
                                    <div className={styles.pulseWave} style={{ animationDelay: '0.5s' }}></div>
                                    <div className={styles.pulseWave} style={{ animationDelay: '1s' }}></div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MiningStatus
