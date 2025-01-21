'use client'
import styles from './Console.module.css'   
import Image from 'next/image'
import { useTransactionStatus } from '../hooks/useTransactionStatus'
import { memo, useMemo } from 'react'

const ConsoleTransactionItem = memo(({ text, transactionHash }) => {
    const { isLoading, isError, isReverted, isSuccessful, receipt } = useTransactionStatus(transactionHash)

    console.log('~~~~~~~~~~')
    console.log('transactionHash', transactionHash)
    console.log('isError', isError)
    console.log('isPending', isLoading)
    console.log('isSuccess', isSuccessful)
    console.log('status', receipt)
    console.log('~~~~~~~~~~')
    
    const statusIcon = useMemo(() => {
        if (isError || isReverted) return '/images/error.png'
        if (isSuccessful) return '/images/check.png'
        if (isLoading) return '/images/spinner.png'
        return '/images/spinner.png'
    }, [isLoading, isSuccessful, isError, isReverted])

    const message = useMemo(() => {
        if (isError || isReverted) return "Transaction failed"
        if (isSuccessful) return text[1]
        if (isLoading) return text[0]
        return text[0]
    }, [isLoading, isSuccessful, isError, isReverted, text])

    return (
        <div className={styles.item}>
            <div className={styles.itemContent}>
                <Image 
                    src={statusIcon} 
                    alt="transaction status" 
                    width={20} 
                    height={20} 
                    className={ isLoading ? styles.spinning : '' } 
                />
                <div className={styles.itemText}>
                    {message}
                </div>
                <a 
                    href={`https://sepolia.basescan.org/tx/${transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.txLink}
                >
                    [View tx]
                </a>
            </div>
        </div>
    )
})

// Add a display name for better debugging
ConsoleTransactionItem.displayName = 'ConsoleTransactionItem'

export default ConsoleTransactionItem