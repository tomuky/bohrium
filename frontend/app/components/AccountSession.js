'use client'
import styles from './AccountSession.module.css'
import { useState, useContext } from 'react'
import DepositModal from './DepositModal'
import WithdrawModal from './WithdrawModal'
import Image from 'next/image'
import { useSessionWallet } from '../contexts/SessionWalletContext'

const AccountSession = () => {
    const { sessionWalletAddress, balances, formattedBalances } = useSessionWallet();
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [showCopied, setShowCopied] = useState(false);

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 2000); // Hide after 2 seconds
        } catch (err) {
            console.error('Failed to copy address:', err);
        }
    };

    return (
        <div className={styles.sessionArea}>
            <div className={styles.sessionAreaBlock}>
                {!sessionWalletAddress && (
                    <div className={`${styles.sessionAreaBlockTitle}`}>
                        <h3>Session Wallet</h3>
                        <p className={styles.addressText}>-</p>
                    </div>
                )}
                
                {sessionWalletAddress && (
                    <>
                        <div className={`${styles.sessionAreaBlockTitle}`}>
                            <h3>Session Wallet</h3>
                            <p 
                                onClick={() => copyToClipboard(sessionWalletAddress)}
                                className={styles.addressText}
                                title="Click to copy address"
                            >
                                {sessionWalletAddress.slice(0, 6)}...{sessionWalletAddress.slice(-4)}
                                {showCopied && (
                                    <span className={styles.tooltip}>
                                        Copied!
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className={styles.balances}>
                            <div className={styles.balanceItem}>
                                <div className={styles.balanceItemAsset}>
                                    <Image src="/images/eth.png" alt="ETH" width={20} height={20} className={styles.balanceItemAssetImage}/>
                                    <span className={styles.tokenSymbol}>ETH</span>
                                </div>
                                <span className={styles.tokenAmount}>{formattedBalances.eth || '0.00'}</span>
                            </div>
                            <div className={styles.balanceItem}>
                                <div className={styles.balanceItemAsset}>
                                    <Image src="/images/bohr.png" alt="BOHR" width={20} height={20} className={styles.balanceItemAssetImage}/>
                                    <span className={styles.tokenSymbol}>BOHR</span>
                                </div>
                                <span className={styles.tokenAmount}>{formattedBalances.bohr || '0.00'}</span>
                            </div>
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