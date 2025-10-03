'use client';
import { useApproval } from '../hooks/useApproval';
import { useTransactionStatus } from '../hooks/useTransactionStatus';
import styles from './Modal.module.css';

const ActionModalStake = ({ 
    amount, 
    setAmount, 
    balances, 
    onApprove, 
    onStake 
}) => {
    const { 
        approvalStatus, 
        setApprovalStatus 
    } = useApproval(amount, 'stake');
    
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

    const handleApprove = async () => {
        if (loading || approvalStatus.isApproving) return;
        
        try {
            resetStatus();
            if (!amount || Number(amount) <= 0) {
                setErrorState('Please enter a valid amount');
                return;
            }

            if (Number(amount) > Number(balances.main.bohr.value)) {
                setErrorState('Insufficient BOHR balance');
                return;
            }
            
            // Update approval status
            setApprovalStatus(prev => ({
                ...prev,
                isApproving: true,
                isApproved: false,
                txHash: ''
            }));
            
            const result = await onApprove(amount);
            
            if(result.hash) {
                setSuccess('Approval successful', result.hash);
                setApprovalStatus(prev => ({
                    ...prev,
                    isApproving: false,
                    isApproved: true
                }));
            }
        } catch (err) {
            setApprovalStatus(prev => ({
                ...prev,
                isApproving: false,
                isApproved: false
            }));
            handleUserRejectedError(err);
        }
    };

    const handleStake = async () => {
        if (loading) return;
        
        try {
            resetStatus();
            if (!amount || Number(amount) <= 0) {
                setErrorState('Please enter a valid amount');
                return;
            }

            if (Number(amount) > Number(balances.main.bohr.value)) {
                setErrorState('Insufficient BOHR balance');
                return;
            }
            
            // Check if approval is needed
            if (!approvalStatus.isApproved) {
                setErrorState('Please approve first');
                return;
            }
            
            const result = await onStake(amount);
            if (result.success) {
                setSuccess('Staking successful', result.txHash);
            }
        } catch (err) {
            setErrorState(err.message || 'Failed to stake');
            console.error('Staking error:', err);
        }
    };

    return (
        <>  
            <div className={styles.explanationText}>
                <p>Stake BOHR to improve your mining difficulty. (Minimum 100 BOHR)</p>
            </div>
            <div className={styles.inputGroup}>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount to stake"
                    className={styles.input}
                />
            </div>
            <p 
                className={`${styles.recommendation} ${styles.recommendationClickable}`}
                onClick={() => setAmount(balances.main.bohr.value)}
            >
                Available: {balances.main.bohr.formatted} BOHR
            </p>
            
            {!approvalStatus.isApproved ? (
                <button 
                    className={styles.actionButton}
                    onClick={handleApprove}
                    disabled={loading || approvalStatus.isApproving || approvalStatus.checkingApproval}
                >
                    {approvalStatus.checkingApproval ? 'CHECKING...' :
                     approvalStatus.isApproving ? 'APPROVING...' : 'APPROVE'}
                </button>
            ) : (
                <button 
                    className={styles.actionButton}
                    onClick={handleStake}
                    disabled={loading}
                >
                    {loading ? 'STAKING...' : 'STAKE'}
                </button>
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

export default ActionModalStake;
