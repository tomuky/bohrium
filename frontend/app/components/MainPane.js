'use client'
import styles from './MainPane.module.css'
import { useMiningAccount } from '../hooks/useMiningAccount'
import Instructions from './Instructions'

const MainPane = ({ children }) => {
    const { hasAccount } = useMiningAccount();

    if(hasAccount){
        return (
            <div className={styles.mainPane}>
                {children}
            </div>
        )
    }

    return (
        <div className={styles.mainPane}>
            <Instructions />
        </div>
    )
}

export default MainPane;