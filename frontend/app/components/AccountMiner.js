import styles from './Account.module.css'
import Image from 'next/image'

const AccountMiner = ({ formattedAddress, ethBalance, bohrBalance, currentHashRate, isMining }) => {
    return (
        <div className={styles.accountInfo}>
            <div className={styles.minerHeader}>
                <Image src="/images/miner.png" alt="Miner" width={32} height={32} className={styles.minerIcon} />
            </div>
            <div className={styles.balanceContainer}>
                <div className={styles.balance}>
                    <div className={styles.balanceLeft}>
                        <Image src="/images/bohr.png" alt="BOHR" width={20} height={20} className={styles.icon} />
                        <span className={styles.label}>BOHR Balance</span>
                    </div>
                    <span className={styles.amount}>{bohrBalance}</span>
                </div>
                <div className={styles.balance}>
                    <div className={styles.balanceLeft}>
                        <Image src="/images/gauge.png" alt="Gauge" width={20} height={20} className={styles.icon} />
                        <span className={styles.label}>Hash Rate</span>
                    </div>
                    <span className={styles.amount}>{isMining && currentHashRate ? `${Number(currentHashRate).toFixed(2)} kH/s` : '-'}</span>
                </div>
            </div>
            <div className={styles.actions}>
                <button className={styles.actionButton}>DEPOSIT</button>
                <button className={styles.actionButton}>WITHDRAW</button>
            </div>
        </div>
    )
}

export default AccountMiner;