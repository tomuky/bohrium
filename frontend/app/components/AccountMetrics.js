import styles from './AccountMetrics.module.css';
import { useMining } from '../contexts/MiningContext';
import { formatHashRate, formatElapsedTime } from '../services/utils';
import { useAccount } from 'wagmi';

const AccountMetrics = () => {
    const { isConnected } = useAccount()
    const { 
        currentHashRate, 
        bestHash, 
        minerDifficulty, 
        progress,
        difficultyModifier,
        elapsedTime
    } = useMining()

    return (
        <div className={styles.metricsArea}>
            <div className={styles.metricsAreaTitle}>
                <h3>Metrics</h3>
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
                    <h3>Hash Rate</h3>
                </div>
                <div className={styles.metricsRowValue}>
                    {isConnected && currentHashRate ? formatHashRate(currentHashRate) : '-'}
                </div>
            </div>
            <div className={styles.metricsRow}>
                <div className={styles.metricsRowTitle}>
                    <h3>Elapsed Time</h3>
                </div>
                <div className={styles.metricsRowValue}>
                    {isConnected && elapsedTime > 0 ? formatElapsedTime(elapsedTime) : '-'}
                </div>
            </div>
            <div className={styles.metricsRow}>
                <div className={styles.metricsRowTitle}>
                    <h3>Best Hash</h3>
                </div>
                <div className={`${styles.metricsRowValue} ${bestHash ? styles.metricsRowValueSmall : ''}`}>
                    {bestHash ? `0x${bestHash.padStart(64, '0').substring(0, 12)}…` : '-'}
                </div>
            </div>
            <div className={styles.metricsRow}>
                <div className={styles.metricsRowTitle}>
                    <h3>Difficulty</h3>
                </div>
                <div className={`${styles.metricsRowValue} ${minerDifficulty ? styles.metricsRowValueSmall : ''}`}>
                    {minerDifficulty ? `0x${minerDifficulty.padStart(64, '0').substring(0, 12)}…` : '-'}
                </div>
            </div>
            <div className={styles.metricsRow}>
                <div className={styles.metricsRowTitle}>
                    <h3>Modifier</h3>
                </div>
                <div className={styles.metricsRowValue}>
                    {difficultyModifier ? (
                        <span className={
                            difficultyModifier < 1.0 ? styles.redText :
                            difficultyModifier === 1.0 ? styles.yellowText :
                            styles.greenText
                        }>
                            {`${difficultyModifier}x`}
                        </span>
                    ) : '-'}
                </div>
            </div>
        </div>
    )
}

export default AccountMetrics