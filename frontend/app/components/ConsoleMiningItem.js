'use client'
import styles from './Console.module.css'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useMining } from '../contexts/MiningContext'

const ConsoleMiningItem = ({endTime, icon, text}) => {
    const [secondsLeft, setSecondsLeft] = useState(0)
    const [isPulsating, setIsPulsating] = useState(false)
    const {isMining} = useMining()

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date().getTime()
            const end = new Date(endTime).getTime()
            const diff = Math.max(0, Math.floor((end - now) / 1000))
            
            setSecondsLeft(diff)

            if(diff > 1 && isMining) {
                setIsPulsating(true)
            } else {
                setIsPulsating(false)
            }
        }

        let interval = null;
        if (isMining) {
            // Only start the timer if mining is active
            updateTimer()
            interval = setInterval(updateTimer, 1000)
        } else {
            setIsPulsating(false)
        }

        // Cleanup interval on unmount or when isMining changes
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [endTime, isMining])

    return (
        <div className={`${styles.item} ${isPulsating ? styles.pulsate : ''}`}>
            <div className={styles.itemContent}>
                <Image src={icon} alt={icon} width={20} height={20}/>
                <div className={styles.itemText}>
                    {text} {secondsLeft>0?`(${secondsLeft}s)`:''}
                </div>
            </div>
        </div>
    )
}

export default ConsoleMiningItem;