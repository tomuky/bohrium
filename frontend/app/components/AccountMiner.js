import styles from './Account.module.css'
import Image from 'next/image'
import { formatAddress } from '../services/utils'
import { useState } from 'react'
import DepositModal from './DepositModal'
import WithdrawModal from './WithdrawModal'

const AccountMiner = ({ 
    miningAccountAddress, 
    formattedAddress, 
    ethBalance, 
    bohrBalance, 
    currentHashRate, 
    isMining,
    canMine 
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

    const handleCopyClick = () => {
        const address = formattedAddress || miningAccountAddress;
        navigator.clipboard.writeText(address);
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 2000); // Hide after 2 seconds
    };

    return (
        <div className={styles.accountInfo}>
            <div className={styles.balanceContainer}>
                <div className={styles.balance}>
                    <div className={styles.balanceLeft}>
                        <Image src="/images/miner.png" alt="ETH" width={20} height={20} className={styles.icon} />
                        <span className={styles.label}>Address</span>
                    </div>
                    <div 
                        className={styles.addressContainer}
                        onClick={handleCopyClick}
                    >
                        <Image 
                            src="/images/copy.png" 
                            alt="Copy" 
                            width={16} 
                            height={16} 
                            className={styles.copyIcon} 
                        />
                        <span className={styles.amount}>{formatAddress(formattedAddress) || formatAddress(miningAccountAddress)}</span>
                        {showTooltip && (
                            <span className={styles.tooltip}>Copied!</span>
                        )}
                    </div>
                </div>
                <div className={styles.balance}>
                    <div className={styles.balanceLeft}>
                        <Image src="/images/eth.png" alt="ETH" width={20} height={20} className={styles.icon} />
                        <span className={styles.label}>ETH Balance</span>
                    </div>
                    <span className={styles.amount}>{ethBalance}</span>
                </div>
                <div className={styles.balance}>
                    <div className={styles.balanceLeft}>
                        <Image src="/images/bohr.png" alt="BOHR" width={20} height={20} className={styles.icon} />
                        <span className={styles.label}>BOHR Balance</span>
                    </div>
                    <span className={styles.amount}>{bohrBalance}</span>
                </div>
                <div className={styles.balance}>
                    <div className={styles.balanceLeft}>
                        <Image src="/images/gauge.png" alt="Gauge" width={20} height={20} className={styles.icon} />
                        <span className={styles.label}>Hash Rate</span>
                    </div>
                    <span className={styles.amount}>{isMining && currentHashRate ? `${Number(currentHashRate).toFixed(2)} kH/s` : '-'}</span>
                </div>
            </div>
            <div className={styles.actions}>
                {!canMine && (
                    <div className={styles.fundingMessage}>
                        Fund your mining account with ETH to start mining
                    </div>
                )}
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

export default AccountMiner