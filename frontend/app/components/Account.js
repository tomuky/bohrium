import styles from './Account.module.css'
import AccountSession from './AccountSession'
import AccountMetrics from './AccountMetrics'

const Account = () => {
    return (
        <div className={styles.accountArea}>
            <AccountSession />
            <AccountMetrics />
        </div>
    )
}

export default Account