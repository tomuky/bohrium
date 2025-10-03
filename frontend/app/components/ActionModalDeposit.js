'use client';
import { useTokenSelection } from '../hooks/useTokenSelection';
import { useTransactionStatus } from '../hooks/useTransactionStatus';
import styles from './Modal.module.css';

const ActionModalDeposit = ({ 
    amount, 
    setAmount, 
    balances, 
    sessionWalletLoading, 
    onDeposit 
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

    const handleDeposit = async () => {
        if (sessionWalletLoading || loading) return;
        
        try {
            resetStatus();
            if (!amount || Number(amount) <= 0) {
                setErrorState('Please enter a valid amount');
                return;
            }

            if (selectedToken === 'BOHR' && Number(amount) > Number(balances.main.bohr.value)) {
                setErrorState('Insufficient BOHR balance');
                return;
            }
            if (selectedToken === 'ETH' && Number(amount) > Number(balances.main.eth.value)) {
                setErrorState('Insufficient ETH balance');
                return;
            }
            
            const hash = await onDeposit(amount, selectedToken);
            if (hash) {
                setSuccess('Deposit successful', hash);
            }
        } catch (err) {
            handleUserRejectedError(err);
        }
    };

    return (
        <>
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
            <div className={styles.recommendationContainer}>
                <span 
                    className={`${styles.recommendation} ${styles.recommendationClickable}`}
                    onClick={() => {
                        if (selectedToken === 'ETH') setAmount('0.01');
                        if (selectedToken === 'BOHR') setAmount(balances.main.bohr.value || '');
                    }}
                >
                    {selectedToken === 'ETH' && 'Recommended: 0.01'}
                    {selectedToken === 'BOHR' && `Balance: ${balances.main.bohr.formatted}`}
                </span>
                <span className={`${styles.recommendation} ${styles.recommendationRed}`}>
                    Keep low balances
                </span>
            </div>
            <button 
                className={styles.actionButton} 
                onClick={handleDeposit}
                disabled={sessionWalletLoading}
            >
                {sessionWalletLoading ? 'DEPOSITING...' : 'DEPOSIT'}
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

export default ActionModalDeposit;
