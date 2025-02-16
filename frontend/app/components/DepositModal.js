import { useState } from 'react';
import { useSessionWallet } from '../hooks/useSessionWallet';
import styles from './Modal.module.css';
import Image from 'next/image';

const DepositModal = ({ isOpen, onClose }) => {
    const [selectedToken, setSelectedToken] = useState('ETH');
    const [amount, setAmount] = useState('');
    const { deposit, isLoading, error } = useSessionWallet();

    const handleDeposit = async () => {
        if (!amount) return;
        
        try {
            const tx = await deposit(amount, selectedToken);
            if (tx) {
                setAmount('');
                onClose();
            }
        } catch (err) {
            console.error('Deposit failed:', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Deposit</h2>
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
                        onClick={() => selectedToken === 'ETH' && setAmount('0.01')}
                    >
                        {selectedToken === 'ETH' && 'Recommended: 0.01'}
                    </p>
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
                </div>
            </div>
        </div>
    );
};

export default DepositModal;