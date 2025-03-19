import styles from './AccountSession.module.css'
import Image from 'next/image'

const AccountBalanceItem = ({ value, icon, symbol }) => {
    return (
        <div className={styles.balanceItem}>
            <div className={styles.balanceItemAsset}>
                <Image src={icon} alt={symbol} width={16} height={16} className={styles.balanceItemAssetImage}/>
                <span className={styles.tokenSymbol}>{symbol}</span>
            </div>
            <span className={styles.tokenAmount}>{value || '0'}</span>
        </div>
    )
}

export default AccountBalanceItem;