'use client'
import styles from './LeftPane.module.css'
import Account from './Account'
import Socials from './Socials'
import AccountSession from './AccountSession'
const LeftPane = () => {
    return (
        <div className={styles.leftPane}>

            <AccountSession />

            <Account />

            <Socials />

        </div>
    )
}

export default LeftPane;