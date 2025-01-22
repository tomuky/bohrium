import styles from './LeftPane.module.css'

const LeftPaneMiningStatus = ({ isMining }) => {
    
    return (
        <div className={styles.item}>
            <div className={styles.statusDotContainer}>
                <div className={`${styles.statusDot} ${isMining ? styles.statusDotActive : styles.statusDotInactive}`}/>
            </div>
            <div className={styles.statContainer}>
                <span className={styles.label}>Mining Status</span>
                <span className={`${styles.value} ${isMining ? styles.activeValue : styles.inactiveValue}`}>
                    {isMining ? 'ACTIVE' : 'INACTIVE'}
                </span>
            </div>
        </div>
    )
}   

export default LeftPaneMiningStatus;