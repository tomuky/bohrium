'use client'
import styles from './Console.module.css'
import Image from 'next/image'
import { useMining } from '../contexts/MiningContext'

const ConsoleMiningItem = ({timestamp, icon, text, isLatest}) => {
    const { isMining } = useMining()
    const isPulsating = isMining && isLatest

    return (
        <div className={`${styles.item} ${isPulsating ? styles.pulsate : ''}`}>
            <div className={styles.itemContent}>
                <Image src={icon} alt={icon} width={20} height={20}/>
                <div className={styles.itemText}>
                    {text}
                </div>
            </div>
        </div>
    )
}

export default ConsoleMiningItem;