import styles from './AccountMetrics.module.css';
import { useMining } from '../contexts/MiningContext';
import { formatHashRate } from '../services/utils';
import { useAccount } from 'wagmi';

const AccountMetrics = () => {
    const { isConnected } = useAccount()
    const { 
        currentHashRate, 
        bestHash, 
        minerDifficulty, 
        progress,
        difficultyModifier
    } = useMining()

    return (
        <div className={styles.metricsArea}>
            <div className={styles.metricsAreaTitle}>
                <h3>Metrics</h3>
            </div>
            <div className={styles.metricsRow}>
                <div className={styles.metricsRowTitle}>
                    <h3>Hash Rate</h3>
                </div>
                <div className={styles.metricsRowValue}>
                    {isConnected && currentHashRate ? formatHashRate(currentHashRate) : '-'}
                </div>
            </div>
            <div className={styles.metricsRow}>
                <div className={styles.metricsRowTitle}>
                    <h3>Progress</h3>
                </div>
                <div className={styles.metricsRowValue}>
                    {isConnected && bestHash && minerDifficulty ? (
                        <>
                            <div className={styles.progressBar}>
                                <div 
                                    className={styles.progressFill} 
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p>{progress.toFixed(0)}%</p>
                        </>
                    ) : '-'}
                </div>
            </div>
            <div className={styles.metricsRow}>
                <div className={styles.metricsRowTitle}>
                    <h3>Difficulty</h3>
                </div>
                <div className={styles.metricsRowValue}>
                    {minerDifficulty ? `0x${minerDifficulty.substring(0, 10)}…` : '-'}
                </div>
            </div>
            <div className={styles.metricsRow}>
                <div className={styles.metricsRowTitle}>
                    <h3>Modifier</h3>
                </div>
                <div className={styles.metricsRowValue}>
                    {difficultyModifier ? `${difficultyModifier}x` : '-'}
                </div>
            </div>
        </div>
    )
}

export default AccountMetrics