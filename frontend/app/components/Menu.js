import styles from './Menu.module.css'

const Menu = () => {
    return (
        <div className={styles.menu}>
            <div className={styles.menuItem}>
                Home
            </div>
            <div className={styles.menuItem}>
                Start Mining
            </div>
            <div className={styles.menuItem}>
                How does it work? 
            </div>
        </div>
    )
}

export default Menu;