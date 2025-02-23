'use client'
import styles from './LeftPane.module.css'
import Account from './Account'
import Socials from './Socials'
import { useSessionWallet } from '../contexts/SessionWalletContext'

const LeftPane = () => {
    const { hasSessionWallet } = useSessionWallet();

    return (
        <div className={styles.leftPane}>
            <div className={styles.testnet}>
                <p>Base Sepolia Testnet Only</p>
            </div>
            {hasSessionWallet && <Account />}
            <Socials />
        </div>
    )
}

export default LeftPane;