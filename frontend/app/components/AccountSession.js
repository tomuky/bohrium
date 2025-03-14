'use client'
import styles from './AccountSession.module.css'
import { useState } from 'react'
import ActionModal from './ActionModal'
import { useSessionWallet } from '../contexts/SessionWalletContext'
import AccountBalanceItem from './AccountBalanceItem'
import { useClipboard } from '../hooks/useClipboard'

const AccountSession = () => {
    const {sessionWalletAddress, balances} = useSessionWallet();
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('deposit');
    // const {showCopied, copyToClipboard} = useClipboard();

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
                            <h3 style={{marginBottom: '0px'}}>Balances</h3>
                            {/* <p 
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
                            </p> */}
                        </div>
                        <div className={styles.balances}>
                            <AccountBalanceItem 
                                value={balances.main.eth.formatted}
                                icon="/images/eth.png"
                                symbol="ETH"
                            />
                            <AccountBalanceItem 
                                value={balances.main.bohr.formatted}
                                icon="/images/bohr.png"
                                symbol="BOHR"
                            />
                            <AccountBalanceItem 
                                value={balances.session.eth.formatted}
                                icon="/images/sessioneth2.png"
                                symbol="Session ETH"
                            />
                            <AccountBalanceItem 
                                value={balances.main.sbohr.formatted}
                                icon="/images/sbohr.png"
                                symbol="Staked BOHR"
                            />
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