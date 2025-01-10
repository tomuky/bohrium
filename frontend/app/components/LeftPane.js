'use client'
import styles from './LeftPane.module.css'
import { useMining } from '../contexts/MiningContext'
import { FaDollarSign, FaUsers, FaChartLine, FaWallet, FaCoins } from 'react-icons/fa'
import { useBohrToken } from '../hooks/useBohrToken'
import { useBohrBalance } from '../hooks/useBohrBalance'
import { useAccount } from 'wagmi'

const LeftPane = () => {
    const { isMining } = useMining()
    const { address } = useAccount()
    const { 
        totalSupply: bohrTotalSupply, 
        price: bohrPrice, 
        isLoading: isLoadingBohrToken 
    } = useBohrToken()
    const { 
        balance: bohrBalance, 
        isLoading: isLoadingBohrBalance 
    } = useBohrBalance(address)
    
    return (
        <div className={styles.leftPane}>

            <div className={styles.item}>
                <div className={`${styles.statusDot} ${isMining ? styles.statusDotActive : styles.statusDotInactive}`}/>
                <div className={styles.statContainer}>
                    <span className={styles.label}>Mining Status</span>
                    <span className={`${styles.value} ${isMining ? styles.activeValue : styles.inactiveValue}`}>
                        {isMining ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                </div>
            </div>

            <div className={styles.item}>
                <FaWallet className={styles.icon} />
                <div className={styles.statContainer}>
                    <span className={styles.label}>Wallet Balance</span>
                    <div className={styles.multiValue}>
                        <span className={styles.value}>{isLoadingBohrBalance ? 'Loading...' : bohrBalance ? `${Number(bohrBalance).toLocaleString()} BOHR` : '-'}</span>
                    </div>
                </div>
            </div>

            <div className={styles.item}>
                <FaDollarSign className={styles.icon} />
                <div className={styles.statContainer}>
                    <span className={styles.label}>BOHR Price</span>
                    <span className={styles.value}>$ {bohrPrice?.toFixed(2) ?? '0.00'}</span>
                </div>
            </div>

            <div className={styles.item}>
                <FaCoins className={styles.icon} />
                <div className={styles.statContainer}>
                    <span className={styles.label}>Total Supply</span>
                    <span className={styles.value}>
                        {isLoadingBohrToken ? 'Loading...' : bohrTotalSupply ? `${Number(bohrTotalSupply).toLocaleString()} BOHR` : '-'}
                    </span>
                </div>
            </div>

            <div className={styles.item}>
                <FaUsers className={styles.icon} />
                <div className={styles.statContainer}>
                    <span className={styles.label}>Active Miners</span>
                    <span className={styles.value}>13</span>
                </div>
            </div>

            <div className={styles.item}>
                <FaChartLine className={styles.icon} />
                <div className={styles.statContainer}>
                    <span className={styles.label}>Hash Rate</span>
                    <span className={styles.value}>500k H/s</span>
                </div>
            </div>
            
        </div>
    )
}

export default LeftPane;