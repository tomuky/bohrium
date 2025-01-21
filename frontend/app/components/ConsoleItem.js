'use client'
import styles from './Console.module.css'
import Image from 'next/image'

const ConsoleItem = ({icon, text, pill, error, hash}) => {
    
    return (
        <div className={styles.item}>
            <div className={styles.itemContent}>
                <Image src={icon} alt={icon} width={20} height={20}/>
                <div className={styles.itemText}>
                    {text}
                </div>
                {pill && <div className={styles.pill}>{pill}</div>}
                {hash && (
                    <a 
                        href={`https://sepolia.basescan.org/tx/${hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.txLink}
                >
                        [View tx]
                    </a>
                )}
                {error && <div className={styles.error}>{error}</div>}
            </div>
        </div>
    )
}

export default ConsoleItem;