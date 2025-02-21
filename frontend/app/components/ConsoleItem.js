'use client'
import styles from './Console.module.css'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useTimeAgo } from '../hooks/useTimeAgo'

const ConsoleItem = ({icon, text, pill, hash, timestamp}) => {
    const timeAgo = useTimeAgo(timestamp)

    return (
        <div className={styles.item}>
            <div className={styles.itemContent}>
                <div className={styles.left}>
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
                </div>
                <div className={styles.timeAgo}>{timeAgo}</div>
            </div>
        </div>
    )
}

export default ConsoleItem;