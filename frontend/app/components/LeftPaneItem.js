import styles from './LeftPane.module.css'

const LeftPaneItem = ({ icon, label, value }) => {
    return (
        <div className={styles.item}>
            {icon}
            <div className={styles.statContainer}>
                <span className={styles.label}>{label}</span>
                <div className={styles.multiValue}>
                    <span className={styles.value}>{value}</span>
                </div>
            </div>
        </div>
    )
}

export default LeftPaneItem;