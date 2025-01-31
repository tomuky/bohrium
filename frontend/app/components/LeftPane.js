'use client'
import styles from './LeftPane.module.css'
import Account from './Account'
import Socials from './Socials'

const LeftPane = () => {
    return (
        <div className={styles.leftPane}>

            <Account />

            <Socials />

        </div>
    )
}

export default LeftPane;