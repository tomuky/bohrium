'use client'
import styles from './Account.module.css'
import { useMining } from '../contexts/MiningContext'
import { formatHashRate } from '../services/utils'
import { useAccount } from 'wagmi'

const Account = () => {
    const { isConnected } = useAccount()
    const { currentHashRate, bestHash, currentDifficulty, blockHeight } = useMining()
    
    return (
        <div className={styles.accountArea}>
            <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                    <h3>BOHR Balance</h3>
                    <p>{isConnected ? '0.00 BOHR' : '-'}</p>
                </div>
                <div className={styles.metricCard}>
                    <h3>Current Hash Rate</h3>
                    <p>{isConnected && currentHashRate ? formatHashRate(currentHashRate) : '-'}</p>
                </div>
                <div className={styles.metricCard}>
                    <h3>Best Hash</h3>
                    <p>{isConnected && bestHash ? `0x${bestHash.substring(0, 10)}...` : '-'}</p>
                </div>
                <div className={styles.metricCard}>
                    <h3>Block Height</h3>
                    <p>{blockHeight ?? '-'}</p>
                </div>
                <div className={styles.metricCard}>
                    <h3>Target Difficulty</h3>
                    <p>{currentDifficulty ? `0x${currentDifficulty.substring(0, 10)}...` : '-'}</p>
                </div>
            </div>
        </div>
    )
}

export default Account