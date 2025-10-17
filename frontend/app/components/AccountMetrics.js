import styles from './AccountMetrics.module.css';
import { useMining } from '../contexts/MiningContext';
import { formatHashRate, formatElapsedTime } from '../services/utils';
import { useAccount } from 'wagmi';
import { useState, useEffect, useRef } from 'react';

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
    
    const [isAnimating, setIsAnimating] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const prevBestHash = useRef(bestHash)

    // Set collapsed by default on mobile devices
    useEffect(() => {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
        setIsCollapsed(isMobile);
    }, []);
    
    useEffect(() => {
        if (bestHash && bestHash !== prevBestHash.current) {
            setIsAnimating(true)
            prevBestHash.current = bestHash
            
            // Reset animation after it completes
            const timer = setTimeout(() => {
                setIsAnimating(false)
            }, 1000) // Animation duration
            
            return () => clearTimeout(timer)
        }
    }, [bestHash])

    return (
        <div className={`${styles.metricsArea} ${isCollapsed ? styles.collapsed : ''}`}>
            {isCollapsed ? (
                <div 
                    className={`${styles.metricsAreaTitle} ${styles.collapsedHeader}`}
                    onClick={() => setIsCollapsed(false)}
                    title="Click to expand metrics"
                >
                    <h3>Metrics</h3>
                    <button 
                        className={styles.expandButton}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsCollapsed(false);
                        }}
                        title="Expand metrics"
                    >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </div>
            ) : (
                <>
                    <div className={styles.metricsAreaTitle}>
                        <h3>Metrics</h3>
                        <button 
                            className={styles.collapseButton}
                            onClick={() => setIsCollapsed(true)}
                            title="Collapse metrics"
                        >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M3 7.5L6 4.5L9 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    </div>
                    <div className={styles.metricsRow}>
                        <div className={styles.metricsRowTitle}>
                            Progress
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
                            Best Hash
                        </div>
                        <div className={`${styles.metricsRowValue} ${bestHash ? styles.metricsRowValueSmall : ''} ${isAnimating ? styles.bestHashAnimate : ''}`}>
                            {bestHash ? `0x${bestHash.padStart(64, '0').substring(0, 12)}…` : '-'}
                        </div>
                    </div>
                    <div className={styles.metricsRow}>
                        <div className={styles.metricsRowTitle}>
                            Difficulty Hash
                        </div>
                        <div className={`${styles.metricsRowValue} ${minerDifficulty ? styles.metricsRowValueSmall : ''}`}>
                            {minerDifficulty ? `0x${minerDifficulty.padStart(64, '0').substring(0, 12)}…` : '-'}
                        </div>
                    </div>
                    <div className={styles.metricsRow}>
                        <div className={styles.metricsRowTitle}>
                            Hash Rate
                        </div>
                        <div className={styles.metricsRowValue}>
                            {isConnected && currentHashRate ? formatHashRate(currentHashRate) : '-'}
                        </div>
                    </div>
                    <div className={styles.metricsRow}>
                        <div className={styles.metricsRowTitle}>
                            Elapsed Time
                        </div>
                        <div className={styles.metricsRowValue}>
                            {isConnected && elapsedTime > 0 ? formatElapsedTime(elapsedTime) : '-'}
                        </div>
                    </div>
                    <div className={styles.metricsRow}>
                        <div className={styles.metricsRowTitle}>
                            Modifier
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
                </>
            )}
        </div>
    )
}

export default AccountMetrics