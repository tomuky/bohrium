'use client'
import styles from './Console.module.css'
import Image from 'next/image'
import { useTimeAgo } from '../hooks/useTimeAgo'

const ConsoleMiningItem = ({timestamp, icon, text, isLatest}) => {
    const timeAgo = useTimeAgo(timestamp)

    return (
        <div className={styles.item}>
            <div className={styles.itemContent}>
                <div className={styles.left}>
                    <Image src={icon} alt={icon} width={20} height={20}/>
                    <div className={styles.itemText}>
                        {text}
                    </div>
                </div>
                <div className={styles.timeAgo}>{timeAgo}</div>
            </div>
        </div>
    )
}

export default ConsoleMiningItem;