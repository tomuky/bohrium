import styles from './Header.module.css'    
import { ConnectButton } from '@rainbow-me/rainbowkit'

const Header = () => {
    return (
        <div className={styles.header}>
            <h1 className={styles.title}>Bohrium</h1>
            <ConnectButton />
        </div>
    )
}

export default Header