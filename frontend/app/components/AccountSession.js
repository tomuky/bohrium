'use client'
import styles from './AccountSession.module.css'
import { useState, useContext } from 'react'
import ActionModal from './ActionModal'
import Image from 'next/image'
import { useSessionWallet } from '../contexts/SessionWalletContext'

const AccountSession = () => {
    const { sessionWalletAddress, balances, formattedBalances } = useSessionWallet();
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('deposit');
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

    const openActionModal = (tab) => {
        setActiveTab(tab);
        setIsActionModalOpen(true);
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
                                onClick={() => openActionModal('deposit')}
                            >
                                ACTIONS
                            </button>
                        </div>
                    </>
                )}
            </div>
            <ActionModal 
                isOpen={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
                initialTab={activeTab}
            />
        </div>
    )
}

export default AccountSession