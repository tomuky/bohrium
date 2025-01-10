'use client'
import styles from './Console.module.css'
import Image from 'next/image'
import { useState, useEffect } from 'react'

const ConsoleItem = ({icon, text, pill, timestamp}) => {
    const [timeAgo, setTimeAgo] = useState('')

    useEffect(() => {
        const calculateTimeAgo = () => {
            const timestampMs = new Date(timestamp).getTime()
            const seconds = Math.floor((Date.now() - timestampMs) / 1000)
            
            if (isNaN(seconds) || seconds < 0) return 'just now'
            if (seconds < 60) return `${seconds} secs ago`
            if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`
            if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
            return `${Math.floor(seconds / 86400)} days ago`
        }

        setTimeAgo(calculateTimeAgo())
        
        // Update every second
        const interval = setInterval(() => {
            setTimeAgo(calculateTimeAgo())
        }, 1000)

        return () => clearInterval(interval)
    }, [timestamp])

    return (
        <div className={styles.item}>
            <div className={styles.itemContent}>
                <Image src={icon} alt="Pickaxe" width={20} height={20} style={{filter:'invert(1)'}}/>
                <div className={styles.itemText}>
                    {text}
                </div>
                {pill && <div className={styles.pill}>{pill}</div>}
            </div>
            <div className={styles.timestamp}>
                {timeAgo}
            </div>
        </div>
    )
}

export default ConsoleItem;