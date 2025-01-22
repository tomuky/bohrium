'use client'
import styles from './LeftPane.module.css'
import { useMining } from '../contexts/MiningContext'
import { FaDollarSign, FaUsers, FaChartLine, FaWallet, FaCoins } from 'react-icons/fa'
import { useBohrToken } from '../hooks/useBohrToken'
import { useBohrBalance } from '../hooks/useBohrBalance'
import { useAccount } from 'wagmi'
import { useBohrMining } from '../hooks/useBohrMining'
import LeftPaneItem from './LeftPaneItem'
import LeftPaneMiningStatus from './LeftPaneMiningStatus'

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
    
    const metrics = [
        {
            icon: <FaWallet className={styles.icon}/>,
            label: "Wallet Balance",
            value: isLoadingBohrBalance ? 'Loading...' : bohrBalance ? `${Number(bohrBalance).toLocaleString()} BOHR` : '-'
        },
        {
            icon: <FaChartLine className={styles.icon}/>,
            label: "Your Hash Rate",
            value: isMining && currentHashRate ? `${Number(currentHashRate).toFixed(2)} kH/s` : '-'
        },
        {
            icon: <FaUsers className={styles.icon}/>,
            label: "Active Miners",
            value: activeMinerCount
        },
        {
            icon: <FaDollarSign className={styles.icon}/>,
            label: "BOHR Price",
            value: bohrPrice?.toFixed(2) ?? '0.00'
        },
        {
            icon: <FaCoins className={styles.icon}/>,
            label: "Total Supply",
            value: isLoadingBohrToken ? 'Loading...' : bohrTotalSupply ? `${Number(bohrTotalSupply).toLocaleString()} BOHR` : '-'
        }
    ]
    
    return (
        <div className={styles.leftPane}>
            <div className={styles.metricsGrid}>
                <LeftPaneMiningStatus isMining={isMining} />
                {metrics.map((metric, index) => (
                    <LeftPaneItem 
                        key={index}
                        icon={metric.icon}
                        label={metric.label}
                        value={metric.value}
                    />
                ))}
            </div>
        </div>
    )
}

export default LeftPane;