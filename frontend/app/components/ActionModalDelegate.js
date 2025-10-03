'use client';
import { useTransactionStatus } from '../hooks/useTransactionStatus';
import { formatAddress } from '../services/utils';
import styles from './Modal.module.css';

const ActionModalDelegate = ({ 
    sessionWalletAddress, 
    delegationInfo, 
    onSetDelegation, 
    onRemoveDelegation 
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

    const handleSetDelegation = async () => {
        if (loading) return;
        
        try {
            resetStatus();
            if (!sessionWalletAddress) {
                setErrorState('Please enter a session wallet address');
                return;
            }
            
            const result = await onSetDelegation(sessionWalletAddress);
            // Success message is handled by ActionModal via stakingService event
        } catch (err) {
            setErrorState(err.message || 'Failed to set delegation');
            console.error('Set delegation error:', err);
        }
    };

    const handleRemoveDelegation = async () => {
        if (loading) return;
        
        try {
            resetStatus();
            const result = await onRemoveDelegation();
            // Success message is handled by ActionModal via stakingService event
        } catch (err) {
            setErrorState(err.message || 'Failed to remove delegation');
            console.error('Remove delegation error:', err);
        }
    };

    return (
        <>
            <div className={styles.explanationText}>
                <p>Delegation allows you to separate your main wallet (holds funds) from your session wallet (does mining). Stake from main wallet, mine with session wallet.</p>
            </div>
            {delegationInfo.isMainWallet ? (
                <div className={styles.delegationCard}>
                    <h3 className={styles.cardTitle}>Active Delegation</h3>
                    <div className={styles.delegationDetails}>
                        <span className={styles.detailLabel}>Session Wallet:</span>
                        <span className={styles.detailValue}>{formatAddress(delegationInfo.sessionWallet)}</span>
                    </div>
                    <p className={styles.delegationDescription}>
                        Your main wallet is delegated to this session wallet. Mining rewards from the session wallet will be sent to your main wallet.
                    </p>
                    <button
                        onClick={handleRemoveDelegation}
                        disabled={loading}
                        className={styles.cancelButton}
                    >
                        {loading ? 'REMOVING...' : 'REMOVE DELEGATION'}
                    </button>
                </div>
            ) : delegationInfo.isSessionWallet ? (
                <div className={styles.delegationCard}>
                    <h3 className={styles.cardTitle}>Delegated Session Wallet</h3>
                    <div className={styles.delegationDetails}>
                        <span className={styles.detailLabel}>Main Wallet:</span>
                        <span className={styles.detailValue}>{formatAddress(delegationInfo.mainWallet)}</span>
                    </div>
                    <p className={styles.delegationDescription}>
                        This session wallet is delegated from the main wallet above. Mining rewards will be sent to the main wallet.
                    </p>
                </div>
            ) : (
                <>
                    <p className={styles.delegationDescription}>
                        Delegation allows you to separate your main wallet (which holds funds) from your session wallet (which does the mining). 
                        Stake BOHR from your main wallet and have it count for your session wallet's mining difficulty.
                    </p>
                    
                    <div className={styles.inputGroup}>
                        <input
                            disabled={true}
                            type="text"
                            value={sessionWalletAddress}
                            placeholder="Enter session wallet address (0x...)"
                            className={styles.input}
                        />
                    </div>
                    <button
                        onClick={handleSetDelegation}
                        disabled={loading || !sessionWalletAddress}
                        className={styles.actionButton}
                    >
                        {loading ? 'SETTING...' : 'SET DELEGATION'}
                    </button>
                </>
            )}
        </>
    );
};

export default ActionModalDelegate;
