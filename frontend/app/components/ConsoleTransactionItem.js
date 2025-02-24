'use client'
import styles from './Console.module.css'   
import Image from 'next/image'
import { memo, useMemo, useEffect } from 'react'
import { useWaitForTransactionReceipt } from 'wagmi'
import { useTimeAgo } from '../hooks/useTimeAgo'
import { DEFAULT_NETWORK } from '../services/config'

const ConsoleTransactionItem = memo(({ hash, timestamp }) => {
    const { data, error, isError, isPending, isSuccess } = useWaitForTransactionReceipt({
        hash,
        pollingInterval: 1000
    })
    const timeAgo = useTimeAgo(timestamp)

    useEffect(() => {
        if (isError) console.log('Transaction error: ', error)
    }, [isError, error])

    const statusIcon = useMemo(() => {
        if (isError) return '/images/error.png'
        if (isSuccess) return '/images/check.png'
        if (isPending) return '/images/spinner.png'
        return '/images/spinner.png'
    }, [isPending, isSuccess, isError])

    const message = useMemo(() => {
        if (isError) return "Transaction failed"
        if (isSuccess) return "Transaction successful"
        if (isPending) return "Transaction pending"
        return "Transaction pending"
    }, [isPending, isSuccess, isError])

    return (
        <div className={styles.item}>
            <div className={styles.itemContent}>
                <div className={styles.left}>
                    <Image 
                        src={statusIcon} 
                        alt="transaction status" 
                        width={20} 
                        height={20} 
                        className={ isPending ? styles.spinning : '' } 
                    />
                    <div className={styles.itemText}>
                        {message}
                    </div>
                    <a 
                        href={`${DEFAULT_NETWORK.baseScanUrl}/tx/${hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.txLink}
                    >
                        [View tx]
                    </a>
                </div>
                <div className={styles.timeAgo}>{timeAgo}</div>
            </div>
        </div>
    )
})

// Add a display name for better debugging
ConsoleTransactionItem.displayName = 'ConsoleTransactionItem'

export default ConsoleTransactionItem