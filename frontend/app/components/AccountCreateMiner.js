'use client'
import styles from './Account.module.css'
import { useAccount } from 'wagmi'
import { useMiningAccount } from '../hooks/useMiningAccount'

const AccountCreateMiner = () => {
    const { isConnected } = useAccount()
    const { create, isCreating, isCreated, createError, txData } = useMiningAccount()
    //console.log('txData', txData)

    return (
        <div 
            className={`${styles.createMinerArea} ${!isConnected ? styles.disabled : styles.hoverEnabled}`} 
            onClick={create}
            style={{ opacity: isCreating ? 0.5 : 1 }}
        >
            <div className={styles.createMinerIcon}>
                <span className={styles.plusSign}>+</span>
                <img src="/images/miner.png" alt="Miner" className={styles.minerIcon} />
            </div>
            <span className={styles.createMinerText}>
                {isCreating ? 'CREATING...' : isCreated ? 'CREATED' : 'CREATE MINER'}
            </span>
            {createError && <span className={styles.errorText}>Error: {createError.message}</span>}
        </div>
    )
}   

export default AccountCreateMiner