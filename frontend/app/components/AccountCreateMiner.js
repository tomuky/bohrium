import styles from './Account.module.css'

const AccountCreateMiner = ({ isConnected, create, isCreating }) => {
    return (
        <div 
            className={`${styles.createMinerArea} ${!isConnected ? styles.disabled : styles.hoverEnabled}`} 
            onClick={isConnected ? create : null}
            style={{ opacity: isCreating ? 0.5 : 1 }}
        >
            <div className={styles.createMinerIcon}>
                <span className={styles.plusSign}>+</span>
                <img src="/images/miner.png" alt="Miner" className={styles.minerIcon} />
            </div>
            <span className={styles.createMinerText}>
                {isCreating ? 'CREATING...' : 'CREATE MINER'}
            </span>
        </div>
    )
}   

export default AccountCreateMiner