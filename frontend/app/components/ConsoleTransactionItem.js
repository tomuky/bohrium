'use client'
import styles from './Console.module.css'   
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

const ConsoleTransactionItem = ({ text, transactionHash }) => {
    const [status, setStatus] = useState('pending') // pending, confirmed, failed
    const [confirmations, setConfirmations] = useState(0)

    useEffect(() => {
        const watchTransaction = async () => {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum)
                const tx = await provider.getTransaction(transactionHash)
                if (!tx) return

                // Watch for confirmations
                tx.wait()
                    .then((receipt) => {
                        setStatus(receipt.status === 1 ? 'confirmed' : 'failed')
                    })
                    .catch(() => {
                        setStatus('failed')
                    })

                // Subscribe to new blocks to count confirmations
                const handleNewBlock = async () => {
                    const currentBlock = await provider.getBlockNumber()
                    const txBlock = await tx.blockNumber
                    if (txBlock) {
                        setConfirmations(currentBlock - txBlock + 1)
                    }
                }

                provider.on('block', handleNewBlock)

                return () => {
                    provider.removeListener('block', handleNewBlock)
                }
            } catch (error) {
                console.error('Error watching transaction:', error)
                setStatus('failed')
            }
        }

        if (transactionHash) {
            watchTransaction()
        }
    }, [transactionHash])

    const getStatusIcon = () => {
        switch (status) {
            case 'confirmed':
                return '/images/check-white.png'
            case 'failed':
                return '/images/error.png'
            default:
                return '/images/spinner.png'
        }
    }

    return (
        <div className={styles.item}>
            <div className={styles.itemContent}>
                <Image 
                    src={getStatusIcon()} 
                    alt={status} 
                    width={20} 
                    height={20} 
                    className={status === 'pending' ? styles.spinning : ''} 
                />
                <div className={styles.itemText}>
                    {status==='pending' && text[0]}
                    {status==='confirmed' && text[1]}
                    {status==='failed' && "Something went wrong"}

                    {/* {status === 'pending' && confirmations > 0 && (
                        <span className={styles.confirmations}>
                            {` (${confirmations} confirmation${confirmations !== 1 ? 's' : ''})`}
                        </span>
                    )} */}
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
}

export default ConsoleTransactionItem