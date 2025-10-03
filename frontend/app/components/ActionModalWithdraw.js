'use client';
import { useTokenSelection } from '../hooks/useTokenSelection';
import { useTransactionStatus } from '../hooks/useTransactionStatus';
import styles from './Modal.module.css';

const ActionModalWithdraw = ({ 
    amount, 
    setAmount, 
    balances, 
    sessionWalletLoading, 
    onWithdraw 
}) => {
    const { 
        selectedToken, 
        isDropdownOpen, 
        handleTokenSelect, 
        toggleDropdown 
    } = useTokenSelection('ETH');
    
    const { 
        error, 
        txHash, 
        successMessage, 
        loading, 
        resetStatus, 
        setSuccess, 
        setErrorState, 
        handleUserRejectedError 
    } = useTransactionStatus();

    const handleWithdraw = async () => {
        if (sessionWalletLoading || loading) return;
        
        try {
            resetStatus();
            if (!amount || Number(amount) <= 0) {
                setErrorState('Please enter a valid amount');
                return;
            }

            if (selectedToken === 'BOHR' && Number(amount) > Number(balances.session.bohr.value)) {
                setErrorState('Insufficient BOHR balance');
                return;
            }
            if (selectedToken === 'ETH' && Number(amount) > Number(balances.session.eth.value)) {
                setErrorState('Insufficient ETH balance');
                return;
            }

            const tx = await onWithdraw(amount, selectedToken);
            if (tx.hash) {
                setSuccess('Withdrawal successful', tx.hash);
            }
        } catch (err) {
            setErrorState(err.message || 'Failed to withdraw');
            console.error('Withdrawal error:', err);
        }
    };

    return (
        <>
            <div className={styles.explanationText}>
                <p>Withdraw assets from session wallet to connected wallet. Note: transactions are automatically approved.</p>
            </div>
            <div className={styles.inputGroup}>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className={styles.input}
                />
                <div className={styles.customDropdown}>
                    <div 
                        className={styles.dropdownHeader} 
                        onClick={toggleDropdown}
                    >
                        {selectedToken}
                        <span className={styles.dropdownArrow}>▼</span>
                    </div>
                    {isDropdownOpen && (
                        <div className={styles.dropdownContent}>
                            <div 
                                className={styles.dropdownItem}
                                onClick={() => handleTokenSelect('ETH')}
                            >
                                ETH
                            </div>
                            <div 
                                className={styles.dropdownItem}
                                onClick={() => handleTokenSelect('BOHR')}
                            >
                                BOHR
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <p 
                className={`${styles.recommendation} ${styles.recommendationClickable}`}
                onClick={() => setAmount(selectedToken === 'ETH' ? balances.session.eth.value : balances.session.bohr.value)}
            >
                Balance: {selectedToken === 'ETH' ? balances.session.eth.value : balances.session.bohr.value}
            </p>
            <button 
                className={styles.actionButton}
                onClick={handleWithdraw}
                disabled={sessionWalletLoading}
            >
                {sessionWalletLoading ? 'WITHDRAWING...' : 'WITHDRAW'}
            </button>
            
            {txHash && (
                <p className={styles.message}>
                    <a 
                        href={`https://sepolia.basescan.org/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.txLink}
                    >
                        View on explorer
                    </a>
                </p>
            )}
            {error && (
                <p className={styles.error}>
                    {error}
                </p>
            )}
            {successMessage && (
                <p className={`${styles.message} ${styles.successMessage}`}>
                    {successMessage}
                </p>
            )}
        </>
    );
};

export default ActionModalWithdraw;
