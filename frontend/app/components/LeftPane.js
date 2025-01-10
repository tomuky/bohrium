'use client'
import styles from './LeftPane.module.css'
import { useMining } from '../contexts/MiningContext'
import { FaDollarSign, FaUsers, FaChartLine } from 'react-icons/fa'

const LeftPane = () => {
    const { isMining } = useMining()

    return (
        <div className={styles.leftPane}>

            <div className={styles.item}>
                <div className={`${styles.statusDot} ${isMining ? styles.statusDotActive : styles.statusDotInactive}`}/>
                <div className={styles.statContainer}>
                    <span className={styles.label}>Mining Status</span>
                    <span className={`${styles.value} ${isMining ? styles.activeValue : styles.inactiveValue}`}>
                        {isMining ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                </div>
            </div>

            <div className={styles.item}>
                <FaDollarSign className={styles.icon} />
                <div className={styles.statContainer}>
                    <span className={styles.label}>BOHR Price</span>
                    <span className={styles.value}>$25.20</span>
                </div>
            </div>

            <div className={styles.item}>
                <FaUsers className={styles.icon} />
                <div className={styles.statContainer}>
                    <span className={styles.label}>Active Miners</span>
                    <span className={styles.value}>13</span>
                </div>
            </div>

            <div className={styles.item}>
                <FaChartLine className={styles.icon} />
                <div className={styles.statContainer}>
                    <span className={styles.label}>Hash Rate</span>
                    <span className={styles.value}>500k H/s</span>
                </div>
            </div>
            
        </div>
    )
}

export default LeftPane;