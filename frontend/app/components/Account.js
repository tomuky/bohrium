'use client'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import styles from './Account.module.css'
import { useAccount } from 'wagmi'
import { useMiningAccount } from '../hooks/useMiningAccount'

const Account = () => {
    const { isConnected } = useAccount()
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

    return (
        <div className={styles.accountArea}>
            {isConnected && !hasAccount && (
                <div 
                    className={styles.button} 
                    onClick={create}
                    style={{ opacity: isCreating ? 0.5 : 1 }}
                >
                    {isCreating ? 'CREATING...' : 'CREATE MINER'}
                </div>
            )}
            {isConnected && hasAccount && (
                <div className={styles.accountInfo}>
                    <div className={styles.address}>{miningAccountAddress}</div>
                    <div className={styles.balances}>
                        <div>{ethBalance} ETH</div>
                        <div>{bohrBalance} BOHR</div>
                    </div>
                </div>
            )}
            {!isConnected && (
                <div className={styles.button} onClick={() => openConnectModal()}>
                    CONNECT WALLET
                </div>
            )}
        </div>
    )
}

export default Account