'use client'
import styles from './AccountSession.module.css'
import { useMining } from '../contexts/MiningContext'

const AccountSession = () => {
    const { sessionWalletAddress } = useMining();

    return (
        <div className={styles.sessionArea}>
            {sessionWalletAddress && (
                <div className={styles.sessionWalletAddress}>
                    {sessionWalletAddress}
                </div>
            )}
        </div>
    )
}

export default AccountSession