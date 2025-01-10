'use client'
import styles from './MainPane.module.css'
import { useAccount } from 'wagmi'

const MainPane = ({ children }) => {
    const { isConnected } = useAccount();

    if (!isConnected) {
        return <div className={styles.mainPane}>Connect your wallet to start mining</div>
    }

    return (
        <div className={styles.mainPane}>
            {children}
        </div>
    )
}

export default MainPane;