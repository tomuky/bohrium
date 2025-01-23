import styles from './Header.module.css'    
import { ConnectButton } from '@rainbow-me/rainbowkit'
import Image from 'next/image'

const Header = () => {
    return (
        <div className={styles.header}>
            <div className={styles.left}>
                <Image src="/images/bohr.png" alt="BOHRIUM" width={40} height={40} className={styles.logo}/>
                <h1 className={styles.title}>BOHRIUM</h1>
            </div>
            <div className={styles.right}>
                <ConnectButton chainStatus="full" accountStatus="address" />
            </div>
        </div>
    )
}

export default Header