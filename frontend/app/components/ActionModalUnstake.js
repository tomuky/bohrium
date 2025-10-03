'use client';
import { useTransactionStatus } from '../hooks/useTransactionStatus';
import styles from './Modal.module.css';

const ActionModalUnstake = ({ 
    amount, 
    setAmount, 
    balances, 
    unstakeRequest, 
    onRequestUnstake, 
    onCompleteUnstake, 
    onCancelUnstake 
}) => {
    const { 
        error, 
        txHash, 
        successMessage, 
        loading, 
        resetStatus, 
        setSuccess, 
        setErrorState 
    } = useTransactionStatus();

    const handleRequestUnstake = async () => {
        if (loading) return;
        
        try {
            resetStatus();
            if (!amount || Number(amount) <= 0) {
                setErrorState('Please enter a valid amount');
                return;
            }

            if (Number(amount) > Number(balances.main.sbohr.value)) {
                setErrorState('Insufficient sBOHR balance');
                return;
            }
            
            const result = await onRequestUnstake(amount);
            if (result.success) {
                setSuccess('Unstake requested', result.txHash);
            }
        } catch (err) {
            setErrorState(err.message || 'Failed to request unstake');
            console.error('Unstake request error:', err);
        }
    };

    const handleCompleteUnstake = async () => {
        if (loading) return;
        
        try {
            resetStatus();
            const result = await onCompleteUnstake();
            if (result.success) {
                setSuccess('Unstake completed', result.txHash);
            }
        } catch (err) {
            setErrorState(err.message || 'Failed to complete unstake');
            console.error('Complete unstake error:', err);
        }
    };

    const handleCancelUnstake = async () => {
        if (loading) return;
        
        try {
            resetStatus();
            const result = await onCancelUnstake();
            if (result.success) {
                setSuccess('Unstake cancelled', result.txHash);
            }
        } catch (err) {
            setErrorState(err.message || 'Failed to cancel unstake');
            console.error('Cancel unstake error:', err);
        }
    };

    return (
        <>
            <div className={styles.explanationText}>
                <p>Unstake sBOHR tokens to get your BOHR back.</p><p>(Requires cooldown)</p>
            </div>
            {!unstakeRequest ? (
                <>
                    <div className={styles.inputGroup}>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount to unstake"
                            className={styles.input}
                        />
                    </div>
                    <p 
                        className={`${styles.recommendation} ${styles.recommendationClickable}`}
                        onClick={() => setAmount(balances.main.sbohr.value)}
                    >
                        Available: {balances.main.sbohr.formatted} sBOHR
                    </p>
                    <button 
                        className={styles.actionButton}
                        onClick={handleRequestUnstake}
                        disabled={loading}
                    >
                        {loading ? 'REQUESTING...' : 'REQUEST UNSTAKE'}
                    </button>
                </>
            ) : (
                <div className={styles.unstakeRequestCard}>
                    <h3 className={styles.cardTitle}>Unstake Request Cooldown</h3>
                    <div className={styles.unstakeDetails}>
                        <div>
                            <span className={styles.detailLabel}>Amount:</span>
                            <span className={styles.detailValue}>{unstakeRequest.amount} BOHR</span>
                        </div>
                        <div>
                            <span className={styles.detailLabel}>Blocks Remaining:</span>
                            <span className={styles.detailValue}>{unstakeRequest.blocksRemaining}</span>
                        </div>
                    </div>
                    
                    <div className={styles.buttonGroup}>
                        {unstakeRequest.canComplete ? (
                            <button
                                onClick={handleCompleteUnstake}
                                disabled={loading}
                                className={styles.completeButton}
                            >
                                {loading ? 'COMPLETING...' : 'COMPLETE UNSTAKE'}
                            </button>
                        ) : (
                            <button
                                disabled={true}
                                className={styles.disabledButton}
                            >
                                WAITING
                            </button>
                        )}
                        
                        <button
                            onClick={handleCancelUnstake}
                            disabled={loading}
                            className={styles.cancelButton}
                        >
                            {loading ? 'CANCELLING...' : 'CANCEL'}
                        </button>
                    </div>
                </div>
            )}
            
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

export default ActionModalUnstake;
