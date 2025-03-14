import { useState, useEffect } from 'react';
import { useSessionWallet } from '../contexts/SessionWalletContext';
import styles from './Modal.module.css';
import Image from 'next/image';
import { DEFAULT_NETWORK } from '../services/config';

const DepositModal = ({ isOpen, onClose }) => {
    const [selectedToken, setSelectedToken] = useState('ETH');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const { deposit, isLoading, error: depositError, isSuccess, balancesMain } = useSessionWallet();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        if (isSuccess) {
            setSuccessMessage('Transaction successful');
        }
    }, [isSuccess]);

    useEffect(() => {
        if (depositError) {
            setError(depositError.message || 'Transaction failed');
        }
    }, [depositError]);

    const handleDeposit = async () => {
        if (isLoading) {
            return;
        }

        try {
            setError('');
            if (!amount || Number(amount) <= 0) {
                setError('Please enter a valid amount');
                return;
            }

            if(selectedToken === 'BOHR' && Number(amount) > Number(balancesMain.bohr)) {
                setError('Insufficient balance');
                return;
            }
            if(selectedToken === 'ETH' && Number(amount) > Number(balancesMain.eth)) {
                setError('Insufficient balance');
                return;
            }
            
            const hash = await deposit(amount, selectedToken);
            if (hash) {
                setTxHash(hash);
            }
        } catch (err) {
            setError(err.message || 'Transaction failed');
            console.error('Deposit failed:', err);
        }
    };

    const handleClose = () => {
        setTxHash('');
        setSuccessMessage('');
        setAmount('');
        onClose();
    };

    const handleTokenSelect = (token) => {
        setSelectedToken(token);
        setIsDropdownOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={handleClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Deposit</h2>
                    <button className={styles.closeButton} onClick={handleClose}>
                        <Image src="/images/close.png" alt="Close" width={16} height={16} />
                    </button>
                </div>
                <div className={styles.modalBody}>
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
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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
                                if (selectedToken === 'BOHR') setAmount(balancesMain.bohr?.toString() || '');
                            }}
                        >
                            {selectedToken === 'ETH' && 'Recommended: 0.01'}
                            {selectedToken === 'BOHR' && `Balance: ${balancesMain.bohr}`}
                        </span>
                        <span className={`${styles.recommendation} ${styles.recommendationRed}`}>
                            Keep low balances
                        </span>
                    </div>
                    <button 
                        className={styles.depositButton} 
                        onClick={handleDeposit}
                        disabled={isLoading || !amount}
                    >
                        {isLoading ? 'DEPOSITING...' : 'DEPOSIT'}
                    </button>
                    {error && (
                        <p className={styles.error}>
                            {error.message || 'Transaction failed'}
                        </p>
                    )}
                    {txHash && (
                        <p className={styles.message}>
                            <a 
                                href={`${DEFAULT_NETWORK.baseScanUrl}/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.txLink}
                            >
                                View on explorer
                            </a>
                        </p>
                    )}
                    {successMessage && (
                        <p className={styles.message}>
                            {successMessage}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DepositModal;