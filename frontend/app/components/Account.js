import styles from './Account.module.css'
import AccountSession from './AccountSession'
import AccountMetrics from './AccountMetrics'
import MiningStatus from './MiningStatus'

const Account = () => {
    return (
        <div className={styles.accountArea}>
            <MiningStatus />
            <AccountSession />
            <AccountMetrics />
        </div>
    )
}

export default Account