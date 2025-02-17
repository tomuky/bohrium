import { useState, useContext } from 'react';
import styles from './Modal.module.css';
import Image from 'next/image';
import { useSessionWallet } from '../contexts/SessionWalletContext';

const WithdrawModal = ({ isOpen, onClose }) => {
    const [selectedToken, setSelectedToken] = useState('ETH');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const { balances, withdraw, isLoading } = useSessionWallet();

    const handleWithdraw = async () => {
        try {
            setError('');
            if (!amount || Number(amount) <= 0) {
                setError('Please enter a valid amount');
                return;
            }
            
            const balance = selectedToken === 'ETH' ? balances.eth : balances.bohr;
            if (Number(amount) > Number(balance)) {
                setError('Insufficient balance');
                return;
            }

            await withdraw(amount, selectedToken);
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to withdraw');
            console.error('Withdrawal error:', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Withdraw</h2>
                    <button className={styles.closeButton} onClick={onClose}>
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
                    {error && <p className={styles.error}>{error}</p>}
                    <button 
                        className={styles.depositButton}
                        onClick={handleWithdraw}
                        disabled={isLoading}
                    >
                        {isLoading ? 'WITHDRAWING...' : 'WITHDRAW'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WithdrawModal;