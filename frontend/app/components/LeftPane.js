'use client'
import styles from './LeftPane.module.css'
import Account from './Account'
import Socials from './Socials'
const LeftPane = () => {
    return (
        <div className={styles.leftPane}>
            <div className={styles.testnet}>
                <p>Base Sepolia Testnet Only</p>
            </div>
            <Account />
            <Socials />
        </div>
    )
}

export default LeftPane;