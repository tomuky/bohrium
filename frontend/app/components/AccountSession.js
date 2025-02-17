'use client'
import styles from './AccountSession.module.css'
import { useState, useContext } from 'react'
import DepositModal from './DepositModal'
import WithdrawModal from './WithdrawModal'
import { useSessionWallet } from '../contexts/SessionWalletContext'

const AccountSession = () => {
    const { sessionWalletAddress, balances } = useSessionWallet();
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Failed to copy address:', err);
        }
    };

    return (
        <div className={styles.sessionArea}>
            <div className={styles.sessionAreaBlock}>
                <h3>Session Wallet</h3>
                {!sessionWalletAddress ? (
                    '-'
                ) : (
                    <>
                        <p 
                            onClick={() => copyToClipboard(sessionWalletAddress)}
                            className={styles.addressText}
                            title="Click to copy address"
                            style={{ cursor: 'pointer' }}
                        >
                            {sessionWalletAddress.slice(0, 6)}...{sessionWalletAddress.slice(-4)}
                        </p>
                        <div className={styles.balances}>
                            <p>{balances.eth || '0.00'} ETH</p>
                            <p>{balances.bohr || '0.00'} BOHR</p>
                        </div>
                        <div className={styles.actions}>
                            <button 
                                className={styles.actionButton}
                                onClick={() => setIsDepositModalOpen(true)}
                            >
                                DEPOSIT
                            </button>
                            <button 
                                className={styles.actionButton}
                                onClick={() => setIsWithdrawModalOpen(true)}
                            >
                                WITHDRAW
                            </button>
                        </div>
                    </>
                )}
            </div>
            <DepositModal 
                isOpen={isDepositModalOpen}
                onClose={() => setIsDepositModalOpen(false)}
            />
            <WithdrawModal 
                isOpen={isWithdrawModalOpen}
                onClose={() => setIsWithdrawModalOpen(false)}
            />
        </div>
    )
}

export default AccountSession