'use client'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import styles from './Account.module.css'
import { useAccount } from 'wagmi'
import { useMiningAccount } from '../hooks/useMiningAccount'
import { useMining } from '../contexts/MiningContext'
import AccountCreateMiner from './AccountCreateMiner'
import AccountMiner from './AccountMiner'

const Account = () => {
    const { isConnected } = useAccount()
    const { isMining, currentHashRate } = useMining()
    const { hasAccount, bohrBalance } = useMiningAccount()
    
    return (
        <div className={styles.accountArea}>
            {!hasAccount && (
                <AccountCreateMiner 
                    isConnected={isConnected} 
                />
            )}
            {isConnected && hasAccount && (
                <AccountMiner 
                    bohrBalance={bohrBalance} 
                    currentHashRate={currentHashRate} 
                    isMining={isMining} 
                />
            )}
        </div>
    )
}

export default Account