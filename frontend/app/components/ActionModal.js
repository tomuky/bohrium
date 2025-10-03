'use client';
import { useState, useEffect } from 'react';
import { useSessionWallet } from '../contexts/SessionWalletContext';
import stakingService from '../services/stakingService';
import styles from './Modal.module.css';
import Image from 'next/image';
import { DEFAULT_NETWORK } from '../services/config';
import { formatAddress } from '../services/utils';

const ActionModal = ({ isOpen, onClose, initialTab = 'deposit' }) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [amount, setAmount] = useState('');
    const [selectedToken, setSelectedToken] = useState('ETH');
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [unstakeRequest, setUnstakeRequest] = useState(null);
    const [blockRefreshInterval, setBlockRefreshInterval] = useState(null);
    const [delegationInfo, setDelegationInfo] = useState({
        isMainWallet: false,
        isSessionWallet: false,
        sessionWallet: null,
        mainWallet: null
    });
    const [approvalStatus, setApprovalStatus] = useState({
        isApproving: false,
        isApproved: false,
        txHash: '',
        checkingApproval: false
    });

    // Session wallet context for deposit/withdraw
    const { 
        sessionWalletAddress,
        deposit, 
        withdraw, 
        isLoading: sessionWalletLoading, 
        error: sessionWalletError, 
        isSuccess: sessionWalletSuccess,
        balances
    } = useSessionWallet();

    // Reset state when modal opens or tab changes
    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setError('');
            setTxHash('');
            setSuccessMessage('');
            // Reset approval status
            setApprovalStatus({
                isApproving: false,
                isApproved: false,
                txHash: '',
                checkingApproval: false
            });
            fetchStakingAndDelegationData();
        }
    }, [isOpen, activeTab]);

    // Handle session wallet events
    useEffect(() => {
        if (sessionWalletSuccess) {
            setSuccessMessage('Transaction successful');
        }
    }, [sessionWalletSuccess]);

    useEffect(() => {
        if (sessionWalletError) {
            if (sessionWalletError.code === 4001 || sessionWalletError.message?.includes('user rejected')) {
                setError('User rejected action');
            } else {
                setError('Transaction failed');
            }
            console.error('Session wallet error:', sessionWalletError);
        }
    }, [sessionWalletError]);

    // Fetch staking and delegation data
    const fetchStakingAndDelegationData = async () => {
        try {
            await stakingService.connect();
            
            // Get unstake request
            const request = await stakingService.getUnstakeRequest();
            setUnstakeRequest(request);
            //console.log('unstakeRequest', request);
            
            // Get delegation info
            const info = await stakingService.getDelegationInfo();
            setDelegationInfo(info);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    // Set up interval to refresh unstake request data
    useEffect(() => {
        // Only set up interval if modal is open and we're on the unstake tab with an active request
        if (isOpen && activeTab === 'unstake' && unstakeRequest) {
            // Clear any existing interval
            if (blockRefreshInterval) {
                clearInterval(blockRefreshInterval);
            }
            
            // Set up new interval to refresh every 2 minutes (120000 ms)
            const interval = setInterval(async () => {
                try {
                    const updatedRequest = await stakingService.getUnstakeRequest();
                    if (updatedRequest) {
                        setUnstakeRequest(updatedRequest);
                        console.log('Updated unstakeRequest', updatedRequest);
                    } else {
                        // If request is completed/cancelled, clear interval
                        clearInterval(interval);
                        setBlockRefreshInterval(null);
                    }
                } catch (error) {
                    console.error("Error refreshing unstake data:", error);
                }
            }, 120000); // 2 minutes
            
            setBlockRefreshInterval(interval);
            
            // Clean up interval on unmount or tab change
            return () => {
                clearInterval(interval);
                setBlockRefreshInterval(null);
            };
        } else if (blockRefreshInterval) {
            // Clear interval if conditions no longer met
            clearInterval(blockRefreshInterval);
            setBlockRefreshInterval(null);
        }
    }, [isOpen, activeTab, unstakeRequest]);

    // Clean up interval when modal closes
    useEffect(() => {
        return () => {
            if (blockRefreshInterval) {
                clearInterval(blockRefreshInterval);
                setBlockRefreshInterval(null);
            }
        };
    }, []);

    // Set up event listeners for staking service
    useEffect(() => {
        const handleSuccess = () => {
            fetchStakingAndDelegationData();
            setAmount('');
            setSuccessMessage('Transaction successful');
        };
        
        const handleError = (data) => {
            // More user-friendly error message in UI
            if (data.code === 4001 || data.error?.includes('user rejected')) {
                setError('User rejected action');
            } else {
                setError('Transaction failed');
            }
            // Log the full error to console
            console.error('Staking service error:', data);
        };
        
        const handleApprovalSuccess = () => {
            setApprovalStatus(prev => ({
                ...prev,
                isApproving: false,
                isApproved: true
            }));
            setSuccessMessage('Approval successful');
        };
        
        stakingService.on('stake_success', handleSuccess);
        stakingService.on('approval_success', handleApprovalSuccess);
        stakingService.on('unstake_requested', handleSuccess);
        stakingService.on('unstake_completed', handleSuccess);
        stakingService.on('unstake_cancelled', handleSuccess);
        stakingService.on('delegation_set', handleSuccess);
        stakingService.on('delegation_removed', handleSuccess);
        stakingService.on('error', handleError);
        
        return () => {
            stakingService.removeListener('stake_success', handleSuccess);
            stakingService.removeListener('approval_success', handleApprovalSuccess);
            stakingService.removeListener('unstake_requested', handleSuccess);
            stakingService.removeListener('unstake_completed', handleSuccess);
            stakingService.removeListener('unstake_cancelled', handleSuccess);
            stakingService.removeListener('delegation_set', handleSuccess);
            stakingService.removeListener('delegation_removed', handleSuccess);
            stakingService.removeListener('error', handleError);
        };
    }, []);

    // Check for existing approval when amount changes in stake tab
    useEffect(() => {
        setSuccessMessage('');
        setError('');
        setTxHash('');
        const checkApproval = async () => {
            if (activeTab === 'stake' && amount && Number(amount) > 0 && !approvalStatus.isApproving) {
                try {
                    setApprovalStatus(prev => ({ ...prev, checkingApproval: true }));
                    const hasApproval = await stakingService.checkApproval(amount);
                    setApprovalStatus({
                        isApproving: false,
                        isApproved: hasApproval,
                        txHash: '',
                        checkingApproval: false
                    });
                } catch (err) {
                    console.error("Error checking approval:", err);
                    setApprovalStatus({
                        isApproving: false,
                        isApproved: false,
                        txHash: '',
                        checkingApproval: false
                    });
                }
            }
        };

        checkApproval();
    }, [activeTab, amount]);

    const handleClose = () => {
        setTxHash('');
        setSuccessMessage('');
        setAmount('');
        setError('');
        onClose();
    };

    const handleTokenSelect = (token) => {
        setSelectedToken(token);
        setIsDropdownOpen(false);
    };

    // Action handlers
    const handleDeposit = async () => {
        if (sessionWalletLoading || loading) return;
        
        try {
            setError('');
            setSuccessMessage('');
            setTxHash('');
            if (!amount || Number(amount) <= 0) {
                setError('Please enter a valid amount');
                return;
            }

            if (selectedToken === 'BOHR' && Number(amount) > Number(balances.main.bohr.value)) {
                setError('Insufficient BOHR balance');
                return;
            }
            if (selectedToken === 'ETH' && Number(amount) > Number(balances.main.eth.value)) {
                setError('Insufficient ETH balance');
                return;
            }
            
            const hash = await deposit(amount, selectedToken);
            if (hash) {
                setTxHash(hash);
                setSuccessMessage('Deposit successful');
            }
        } catch (err) {
            // More user-friendly error message in UI
            if (err.code === 4001 || err.message?.includes('user rejected')) {
                setError('User rejected action');
            } else {
                setError('Transaction failed');
            }
            // Log the full error to console
            console.error('Deposit failed:', err);
        }
    };

    const handleWithdraw = async () => {
        if (sessionWalletLoading || loading) return;
        
        try {
            setError('');
            setSuccessMessage('');
            setTxHash('');
            if (!amount || Number(amount) <= 0) {
                setError('Please enter a valid amount');
                return;
            }

            if (selectedToken === 'BOHR' && Number(amount) > Number(balances.session.bohr.value)) {
                setError('Insufficient BOHR balance');
                return;
            }
            if (selectedToken === 'ETH' && Number(amount) > Number(balances.session.eth.value)) {
                setError('Insufficient ETH balance');
                return;
            }

            const tx = await withdraw(amount, selectedToken);
            if (tx.hash) {
                setTxHash(tx.hash);
                setSuccessMessage('Withdrawal successful');
            }
        } catch (err) {
            setError(err.message || 'Failed to withdraw');
            console.error('Withdrawal error:', err);
        }
    };

    const handleApprove = async () => {
        if (loading || approvalStatus.isApproving) return;
        
        try {
            setError('');
            setTxHash('');
            setSuccessMessage('');
            if (!amount || Number(amount) <= 0) {
                setError('Please enter a valid amount');
                return;
            }

            if (Number(amount) > Number(balances.main.bohr.value)) {
                setError('Insufficient BOHR balance');
                return;
            }
            
            // Update approval status
            setApprovalStatus(prev => ({
                ...prev,
                isApproving: true,
                isApproved: false,
                txHash: ''
            }));
            
            setLoading(true);
            const result = await stakingService.approve(amount);
            
            if(result.hash) {
                setTxHash(result.hash);
            }

            if (result.success) {
                const finalResult = await result.wait();
                if (finalResult.success) {
                    setApprovalStatus(prev => ({
                        ...prev,
                        isApproving: false,
                        isApproved: true
                    }));
                    setSuccessMessage('Approval successful');
                } else {
                    setError(finalResult.error);
                    setApprovalStatus(prev => ({
                        ...prev,
                        isApproving: false,
                        isApproved: false
                    }));
                }
            } else {
                setError(result.error);
                setApprovalStatus(prev => ({
                    ...prev,
                    isApproving: false,
                    isApproved: false
                }));
            }
            setLoading(false);
        } catch (err) {
            setLoading(false);
            setApprovalStatus(prev => ({
                ...prev,
                isApproving: false,
                isApproved: false
            }));
            setError(err.message || 'Failed to approve');
            console.error('Approval error:', err);
        }
    };

    const handleStake = async () => {
        if (loading) return;
        
        try {
            setError('');
            setSuccessMessage('');
            setTxHash('');
            if (!amount || Number(amount) <= 0) {
                setError('Please enter a valid amount');
                return;
            }

            if (Number(amount) > Number(balances.main.bohr.value)) {
                setError('Insufficient BOHR balance');
                return;
            }
            
            // Check if approval is needed
            if (!approvalStatus.isApproved) {
                setError('Please approve first');
                return;
            }
            
            setLoading(true);
            const result = await stakingService.stake(amount);
            if (result.success) {
                setTxHash(result.txHash);
                setSuccessMessage('Staking successful');
            }
            setLoading(false);
        } catch (err) {
            setLoading(false);
            setError(err.message || 'Failed to stake');
            console.error('Staking error:', err);
        }
    };

    const handleRequestUnstake = async () => {
        if (loading) return;
        
        try {
            setError('');
            setSuccessMessage('');
            setTxHash('');
            if (!amount || Number(amount) <= 0) {
                setError('Please enter a valid amount');
                return;
            }

            if (Number(amount) > Number(balances.main.sbohr.value)) {
                setError('Insufficient sBOHR balance');
                return;
            }
            
            setLoading(true);
            const result = await stakingService.requestUnstake(amount);
            if (result.success) {
                setTxHash(result.txHash);
                setSuccessMessage('Unstake requested');
                fetchStakingAndDelegationData();
            }
            setLoading(false);
        } catch (err) {
            setLoading(false);
            setError(err.message || 'Failed to request unstake');
            console.error('Unstake request error:', err);
        }
    };

    const handleCompleteUnstake = async () => {
        if (loading) return;
        
        try {
            setLoading(true);
            setTxHash('');
            setSuccessMessage('');
            const result = await stakingService.completeUnstake();
            if (result.success) {
                setTxHash(result.txHash);
                setSuccessMessage('Unstake completed');
            }
            setLoading(false);
        } catch (err) {
            setLoading(false);
            setError(err.message || 'Failed to complete unstake');
            console.error('Complete unstake error:', err);
        }
    };

    const handleCancelUnstake = async () => {
        if (loading) return;
        
        try {
            setLoading(true);
            setTxHash('');
            setSuccessMessage('');
            const result = await stakingService.cancelUnstake();
            if (result.success) {
                setTxHash(result.txHash);
                setSuccessMessage('Unstake cancelled');
                fetchStakingAndDelegationData();
            }
            setLoading(false);
        } catch (err) {
            setLoading(false);
            setError(err.message || 'Failed to cancel unstake');
            console.error('Cancel unstake error:', err);
        }
    };

    const handleSetDelegation = async () => {
        if (loading) return;
        
        try {
            setError('');
            setSuccessMessage('');
            setTxHash('');
            if (!sessionWalletAddress) {
                setError('Please enter a session wallet address');
                return;
            }
            
            setLoading(true);
            const result = await stakingService.setDelegation(sessionWalletAddress);
            if (result.success) {
                setTxHash(result.txHash);
                setSuccessMessage('Delegation set');
            }
            setLoading(false);
        } catch (err) {
            setLoading(false);
            setError(err.message || 'Failed to set delegation');
            console.error('Set delegation error:', err);
        }
    };

    const handleRemoveDelegation = async () => {
        if (loading) return;
        
        try {
            setLoading(true);
            setTxHash('');
            setSuccessMessage('');
            const result = await stakingService.removeDelegation();
            if (result.success) {
                setTxHash(result.txHash);
                setSuccessMessage('Delegation removed');
            }
            setLoading(false);
        } catch (err) {
            setLoading(false);
            setError(err.message || 'Failed to remove delegation');
            console.error('Remove delegation error:', err);
        }
    };

    if (!isOpen) return null;

    // Tab content components
    const renderDepositTab = () => (
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
                disabled={sessionWalletLoading || !amount}
            >
                {sessionWalletLoading ? 'DEPOSITING...' : 'DEPOSIT'}
            </button>
        </>
    );

    const renderWithdrawTab = () => (
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
        </>
    );

    const renderStakeTab = () => (
        <>  
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
                    disabled={loading || approvalStatus.isApproving || approvalStatus.checkingApproval || !amount}
                >
                    {approvalStatus.checkingApproval ? 'CHECKING...' :
                     approvalStatus.isApproving ? 'APPROVING...' : 'APPROVE'}
                </button>
            ) : (
                <button 
                    className={styles.actionButton}
                    onClick={handleStake}
                    disabled={loading || !amount}
                >
                    {loading ? 'STAKING...' : 'STAKE'}
                </button>
            )}
        </>
    );

    const renderUnstakeTab = () => (
        <>
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
                        disabled={loading || !amount}
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
        </>
    );

    const renderDelegateTab = () => (
        <>
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

    return (
        <div className={styles.modalOverlay} onClick={handleClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Actions</h2>
                    <button className={styles.closeButton} onClick={handleClose}>
                        <Image src="/images/close.png" alt="Close" width={16} height={16} />
                    </button>
                </div>
                
                <div className={styles.tabsContainer}>
                    <button 
                        className={`${styles.tabButton} ${activeTab === 'deposit' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('deposit')}
                    >
                        Deposit
                    </button>
                    <button 
                        className={`${styles.tabButton} ${activeTab === 'withdraw' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('withdraw')}
                    >
                        Withdraw
                    </button>
                    <button 
                        className={`${styles.tabButton} ${activeTab === 'stake' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('stake')}
                    >
                        Stake
                    </button>
                    <button 
                        className={`${styles.tabButton} ${activeTab === 'unstake' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('unstake')}
                    >
                        Unstake
                    </button>
                    {/* <button 
                        className={`${styles.tabButton} ${activeTab === 'delegate' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('delegate')}
                    >
                        Delegate
                    </button> */}
                </div>
                
                <div className={styles.modalBody}>
                    {activeTab === 'deposit' && renderDepositTab()}
                    {activeTab === 'withdraw' && renderWithdrawTab()}
                    {activeTab === 'stake' && renderStakeTab()}
                    {activeTab === 'unstake' && renderUnstakeTab()}
                    {/* {activeTab === 'delegate' && renderDelegateTab()} */}
                    

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
                </div>
            </div>
        </div>
    );
};

export default ActionModal;
