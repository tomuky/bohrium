import { useState, useEffect } from 'react';
import styles from './Modal.module.css';
import Image from 'next/image';
import { useSessionWallet } from '../contexts/SessionWalletContext';
import { DEFAULT_NETWORK } from '../services/config';

const WithdrawModal = ({ isOpen, onClose }) => {
    const [selectedToken, setSelectedToken] = useState('ETH');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const { balances, withdraw, isLoading, isSuccess } = useSessionWallet();

    useEffect(() => {
        if (isSuccess) {
            setSuccessMessage('Transaction successful');
        }
    }, [isSuccess]);

    const handleWithdraw = async () => {
        if (isLoading) {
            return;
        }

        try {
            setError('');
            if (!amount || Number(amount) <= 0) {
                setError('Please enter a valid amount');
                return;
            }

            if(selectedToken === 'BOHR' && Number(amount) > Number(balances.bohr)) {
                setError('Insufficient balance');
                return;
            }
            if(selectedToken === 'ETH' && Number(amount) > Number(balances.eth)) {
                setError('Insufficient balance');
                return;
            }

            const tx = await withdraw(amount, selectedToken);
            if(tx.hash){
                setTxHash(tx.hash);
            }
        } catch (err) {
            setError(err.message || 'Failed to withdraw');
            console.error('Withdrawal error:', err);
        }
    };

    const handleClose = () => {
        setTxHash('');
        setSuccessMessage('');
        setAmount('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={handleClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Withdraw</h2>
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
                        <select 
                            value={selectedToken}
                            onChange={(e) => setSelectedToken(e.target.value)}
                            className={styles.select}
                        >
                            <option value="ETH">ETH</option>
                            <option value="BOHR">BOHR</option>
                        </select>
                    </div>
                    <p 
                        className={styles.recommendation}
                        onClick={() => setAmount(selectedToken === 'ETH' ? balances.eth : balances.bohr)}
                    >
                        Balance: {selectedToken === 'ETH' ? balances.eth : balances.bohr}
                    </p>
                    <button 
                        className={styles.depositButton}
                        onClick={handleWithdraw}
                        disabled={isLoading}
                    >
                        {isLoading ? 'WITHDRAWING...' : 'WITHDRAW'}
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

export default WithdrawModal;