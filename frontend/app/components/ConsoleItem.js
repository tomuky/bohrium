'use client'
import styles from './Console.module.css'
import Image from 'next/image'

const ConsoleItem = ({icon, text, pill}) => {
    return (
        <div className={styles.item}>
            <div className={styles.itemContent}>
                <Image src={icon} alt="Pickaxe" width={20} height={20} style={{filter:'invert(1)'}}/>
                <div className={styles.itemText}>
                    {text}
                </div>
                {pill && <div className={styles.pill}>{pill}</div>}
            </div>
        </div>
    )
}

export default ConsoleItem;