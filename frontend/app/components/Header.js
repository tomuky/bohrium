import styles from './Header.module.css'    
import { ConnectButton } from '@rainbow-me/rainbowkit'

const Header = () => {
    return (
        <div className={styles.header}>
            <div className={styles.left}>
                {/* <div className={styles.logo}>B</div> */}
                <h1 className={styles.title}>BOHRIUM</h1>
            </div>
            <div className={styles.right}>
                <ConnectButton chainStatus="full" />
            </div>
        </div>
    )
}

export default Header