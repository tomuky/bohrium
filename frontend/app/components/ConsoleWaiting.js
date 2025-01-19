'use client'
import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './Console.module.css'

const ConsoleWaiting = ({ text, endTime }) => {
    const [secondsLeft, setSecondsLeft] = useState(0);

    useEffect(() => {
        // Calculate initial seconds
        const calculateSeconds = () => {
            const now = Date.now();
            return Math.max(0, Math.ceil((endTime - now) / 1000));
        };

        setSecondsLeft(calculateSeconds());

        // Update countdown every second
        const interval = setInterval(() => {
            const remaining = calculateSeconds();
            setSecondsLeft(remaining);
            
            // Clear interval when countdown reaches 0
            if (remaining <= 0) {
                clearInterval(interval);
            }
        }, 1000);

        // Cleanup interval
        return () => clearInterval(interval);
    }, [endTime]);

    return (
        <div className={styles.item}>
            <div className={styles.itemContent}>
                <Image src="/images/wait.png" alt="Wait" width={20} height={20}/>
                <div className={styles.itemText}>
                    {text} {secondsLeft>0?`(${secondsLeft}s)`:''}
                </div>
            </div>
        </div>
    )
}   

export default ConsoleWaiting;