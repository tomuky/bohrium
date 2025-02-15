import styles from './Console.module.css'
import Image from 'next/image'
import { useTimeAgo } from '../hooks/useTimeAgo'

const ConsoleRewardItem = ({icon, text, pill, timestamp}) => {
    const timeAgo = useTimeAgo(timestamp)

    return (
        <div className={`${styles.item} ${styles.rewardItem}`}>
            <div className={styles.itemContent}>
                <div className={styles.left}>
                    <Image src={icon} alt={icon} width={20} height={20}/>
                    <div className={styles.itemText}>
                        {text}
                    </div>
                    {pill && <div className={styles.pill}>{pill}</div>}
                </div>
                <div className={styles.timeAgo}>{timeAgo}</div>
            </div>
        </div>
    )
}

export default ConsoleRewardItem;