'use client'
import styles from './AccountSession.module.css'
import { useState } from 'react'
import ActionModal from './ActionModal'
import { useSessionWallet } from '../contexts/SessionWalletContext'
import AccountBalanceItem from './AccountBalanceItem'

const AccountSession = () => {
    const {sessionWalletAddress, balances} = useSessionWallet();
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('deposit');
    const [isCollapsed, setIsCollapsed] = useState(false);

    const openActionModal = (tab) => {
        setActiveTab(tab);
        setIsActionModalOpen(true);
    };

    return (
        <div className={styles.sessionArea}>
            <div className={`${styles.sessionAreaBlock} ${isCollapsed ? styles.collapsed : ''}`}>

                {!sessionWalletAddress && (
                    <div className={`${styles.sessionAreaBlockTitle}`}>
                        <h3>Session Wallet</h3>
                        <p className={styles.addressText}>-</p>
                    </div>
                )}
                
                {sessionWalletAddress && (
                    <>
                        {isCollapsed ? (
                            <div 
                                className={`${styles.sessionAreaBlockTitle} ${styles.collapsedHeader}`}
                                onClick={() => setIsCollapsed(false)}
                                title="Click to expand wallets"
                            >
                                <h3>Wallets</h3>
                                <button 
                                    className={styles.expandButton}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsCollapsed(false);
                                    }}
                                    title="Expand wallets"
                                >
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className={`${styles.sessionAreaBlockTitle}`}>
                                    <h3>Main Wallet</h3>
                                    <button 
                                        className={styles.collapseButton}
                                        onClick={() => setIsCollapsed(true)}
                                        title="Collapse wallets"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                            <path d="M3 7.5L6 4.5L9 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>
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
                                        value={balances.main.sbohr.formatted}
                                        icon="/images/sbohr.png"
                                        symbol="sBOHR"
                                    />
                                </div>
                                <div className={`${styles.sessionAreaBlockTitle}`}>
                                    <h3>Session Wallet</h3>
                                </div>
                                <div className={styles.balances}>
                                    <AccountBalanceItem 
                                        value={balances.session.eth.formatted}
                                        icon="/images/eth.png"
                                        symbol="ETH"
                                    />
                                </div>
                                <div className={styles.actions}>
                                    <button 
                                        style={{cursor: 'pointer'}}
                                        className={styles.actionButton}
                                        onClick={() => openActionModal('deposit')}
                                    >
                                        ACTIONS
                                    </button>
                                </div>
                            </>
                        )}
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