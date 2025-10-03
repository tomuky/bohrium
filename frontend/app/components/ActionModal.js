'use client';
import { useState, useEffect } from 'react';
import { useSessionWallet } from '../contexts/SessionWalletContext';
import stakingService from '../services/stakingService';
import styles from './Modal.module.css';
import Image from 'next/image';
import { DEFAULT_NETWORK } from '../services/config';
import ActionModalDeposit from './ActionModalDeposit';
import ActionModalWithdraw from './ActionModalWithdraw';
import ActionModalStake from './ActionModalStake';
import ActionModalUnstake from './ActionModalUnstake';
import ActionModalDelegate from './ActionModalDelegate';

const ActionModal = ({ isOpen, onClose, initialTab = 'deposit' }) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [unstakeRequest, setUnstakeRequest] = useState(null);
    const [blockRefreshInterval, setBlockRefreshInterval] = useState(null);
    const [delegationInfo, setDelegationInfo] = useState({
        isMainWallet: false,
        isSessionWallet: false,
        sessionWallet: null,
        mainWallet: null
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
        
        stakingService.on('stake_success', handleSuccess);
        stakingService.on('unstake_requested', handleSuccess);
        stakingService.on('unstake_completed', handleSuccess);
        stakingService.on('unstake_cancelled', handleSuccess);
        stakingService.on('delegation_set', handleSuccess);
        stakingService.on('delegation_removed', handleSuccess);
        stakingService.on('error', handleError);
        
        return () => {
            stakingService.removeListener('stake_success', handleSuccess);
            stakingService.removeListener('unstake_requested', handleSuccess);
            stakingService.removeListener('unstake_completed', handleSuccess);
            stakingService.removeListener('unstake_cancelled', handleSuccess);
            stakingService.removeListener('delegation_set', handleSuccess);
            stakingService.removeListener('delegation_removed', handleSuccess);
            stakingService.removeListener('error', handleError);
        };
    }, []);


    const handleClose = () => {
        setTxHash('');
        setSuccessMessage('');
        setAmount('');
        setError('');
        onClose();
    };

    // Simplified action handlers that call staking service
    const handleApprove = async (amount) => {
        return await stakingService.approve(amount);
    };

    const handleStake = async (amount) => {
        return await stakingService.stake(amount);
    };

    const handleRequestUnstake = async (amount) => {
        const result = await stakingService.requestUnstake(amount);
        if (result.success) {
            fetchStakingAndDelegationData();
        }
        return result;
    };

    const handleCompleteUnstake = async () => {
        return await stakingService.completeUnstake();
    };

    const handleCancelUnstake = async () => {
        const result = await stakingService.cancelUnstake();
        if (result.success) {
            fetchStakingAndDelegationData();
        }
        return result;
    };

    const handleSetDelegation = async (sessionWalletAddress) => {
        return await stakingService.setDelegation(sessionWalletAddress);
    };

    const handleRemoveDelegation = async () => {
        return await stakingService.removeDelegation();
    };

    if (!isOpen) return null;

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
                    {activeTab === 'deposit' && (
                        <ActionModalDeposit
                            amount={amount}
                            setAmount={setAmount}
                            balances={balances}
                            sessionWalletLoading={sessionWalletLoading}
                            onDeposit={deposit}
                        />
                    )}
                    {activeTab === 'withdraw' && (
                        <ActionModalWithdraw
                            amount={amount}
                            setAmount={setAmount}
                            balances={balances}
                            sessionWalletLoading={sessionWalletLoading}
                            onWithdraw={withdraw}
                        />
                    )}
                    {activeTab === 'stake' && (
                        <ActionModalStake
                            amount={amount}
                            setAmount={setAmount}
                            balances={balances}
                            onApprove={handleApprove}
                            onStake={handleStake}
                        />
                    )}
                    {activeTab === 'unstake' && (
                        <ActionModalUnstake
                            amount={amount}
                            setAmount={setAmount}
                            balances={balances}
                            unstakeRequest={unstakeRequest}
                            onRequestUnstake={handleRequestUnstake}
                            onCompleteUnstake={handleCompleteUnstake}
                            onCancelUnstake={handleCancelUnstake}
                        />
                    )}
                    {/* {activeTab === 'delegate' && (
                        <ActionModalDelegate
                            sessionWalletAddress={sessionWalletAddress}
                            delegationInfo={delegationInfo}
                            onSetDelegation={handleSetDelegation}
                            onRemoveDelegation={handleRemoveDelegation}
                        />
                    )} */}

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
