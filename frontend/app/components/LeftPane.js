'use client'
import styles from './LeftPane.module.css'
import { useMining } from '../contexts/MiningContext'
import { FaDollarSign, FaUsers, FaChartLine, FaWallet, FaCoins } from 'react-icons/fa'
import { useBohrToken } from '../hooks/useBohrToken'
import { useBohrBalance } from '../hooks/useBohrBalance'
import { useAccount } from 'wagmi'
import { useBohrMining } from '../hooks/useBohrMining'
import LeftPaneItem from './LeftPaneItem'

const LeftPane = () => {
    const { isMining, currentHashRate } = useMining()
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
    const { activeMinerCount, currentRoundId } = useBohrMining()
    
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

            <LeftPaneItem icon={<FaWallet className={styles.icon} />} label="Wallet Balance" value={isLoadingBohrBalance ? 'Loading...' : bohrBalance ? `${Number(bohrBalance).toLocaleString()} BOHR` : '-'} />

            <LeftPaneItem 
                icon={<FaChartLine className={styles.icon} />} 
                label="Your Hash Rate" 
                value={isMining && currentHashRate ? `${Number(currentHashRate).toFixed(2)} kH/s` : '-'} 
            />

            <LeftPaneItem icon={<FaUsers className={styles.icon} />} label="Active Miners" value={activeMinerCount} />

            <LeftPaneItem icon={<FaDollarSign className={styles.icon} />} label="BOHR Price" value={bohrPrice?.toFixed(2) ?? '0.00'} />

            <LeftPaneItem icon={<FaCoins className={styles.icon} />} label="Total Supply" value={isLoadingBohrToken ? 'Loading...' : bohrTotalSupply ? `${Number(bohrTotalSupply).toLocaleString()} BOHR` : '-'} />
            
        </div>
    )
}

export default LeftPane;