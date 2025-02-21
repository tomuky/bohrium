'use client'
import styles from './MainPane.module.css'

const MainPane = ({ children }) => {

    return (
        <div className={styles.mainPane}>
            {children}
        </div>
    )
}

export default MainPane;