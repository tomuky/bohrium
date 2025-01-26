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
    const { openConnectModal } = useConnectModal()
    const { 
        miningAccountAddress,
        hasAccount, 
        formattedAddress, 
        ethBalance, 
        bohrBalance,
        create,
        isCreating 
    } = useMiningAccount()

    console.log('currentHashRate', currentHashRate)

    return (
        <div className={styles.accountArea}>
            {!hasAccount && (
                <AccountCreateMiner 
                    isConnected={isConnected} 
                    create={create} 
                    isCreating={isCreating} 
                />
            )}
            {isConnected && hasAccount && (
                <AccountMiner 
                    formattedAddress={formattedAddress} 
                    ethBalance={ethBalance} 
                    bohrBalance={bohrBalance} 
                    currentHashRate={currentHashRate} 
                    isMining={isMining} 
                />
            )}
        </div>
    )
}

export default Account