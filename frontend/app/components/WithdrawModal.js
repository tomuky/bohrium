import { useState } from 'react';
import styles from './Modal.module.css';
import Image from 'next/image';

const WithdrawModal = ({ isOpen, onClose }) => {
    const [selectedToken, setSelectedToken] = useState('ETH');
    const [amount, setAmount] = useState('');

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
                        onClick={() => selectedToken === 'ETH' && setAmount('0.01')}
                    >
                        Balance: {selectedToken === 'ETH' ? '0.01' : '0.01'}
                    </p>
                    <button className={styles.depositButton}>
                        WITHDRAW
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WithdrawModal;