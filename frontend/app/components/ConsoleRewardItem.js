import styles from './Console.module.css'
import Image from 'next/image'

const ConsoleRewardItem = ({icon, text, pill}) => {
    return (
        <div className={`${styles.item} ${styles.rewardItem}`}>
            <div className={styles.itemContent}>
                <Image src={icon} alt={icon} width={20} height={20}/>
                <div className={styles.itemText}>
                    {text}
                </div>
                {pill && <div className={styles.pill}>{pill}</div>}
            </div>
        </div>
    )
}

export default ConsoleRewardItem;