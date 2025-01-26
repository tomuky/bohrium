'use client'
import styles from './LeftPane.module.css'
import Account from './Account'

const LeftPane = () => {
    return (
        <div className={styles.leftPane}>

            <Account />

        </div>
    )
}

export default LeftPane;