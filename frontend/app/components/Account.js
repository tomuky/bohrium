'use client'
import styles from './Account.module.css'
import { useMining } from '../contexts/MiningContext'
import { formatHashRate } from '../services/utils'
import { useAccount } from 'wagmi'

const Account = () => {
    const { isConnected } = useAccount()
    const { 
        currentHashRate, 
        bestHash, 
        currentDifficulty, 
        // blockHeight,
        currentCheckingHash,
        isMining,
        progress
    } = useMining()
    
    return (
        <div className={styles.accountArea}>

            <div className={styles.metricsGrid}>
                {/* <div className={styles.metricCard}>
                    <h3>BOHR Balance</h3>
                    <p>{isConnected ? '0.00 BOHR' : '-'}</p>
                </div> */}
                <div className={styles.metricCard}>
                    <h3>Current Hash Rate</h3>
                    <p>{isConnected && currentHashRate ? formatHashRate(currentHashRate) : '-'}</p>
                </div>
                <div className={styles.metricCard}>
                    <h3>Progress to Target</h3>
                    <div>
                        {isConnected && bestHash && currentDifficulty ? (
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
                <div className={`${styles.metricCard} ${styles.desktopOnly}`}>
                    <h3>Hashes</h3>
                    <div className={styles.metricCardGrid}>
                        <h3>
                            Current
                        </h3>
                        <div className={styles.address}>
                            {currentCheckingHash && `0x${currentCheckingHash.substring(0, 20)}...`}
                        </div>
                        <h3>
                            Best
                        </h3>
                        <div className={styles.address}>
                            {bestHash && `0x${bestHash.substring(0, 20)}...`}
                        </div>
                        <h3>
                            Target
                        </h3>
                        <div className={styles.address}>
                            {currentDifficulty && `0x${currentDifficulty.substring(0, 20)}...`}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Account