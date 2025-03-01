'use client';
import { useState, useEffect } from 'react';
import stakingService from '../services/stakingService';
import { formatAddress } from '../utils/formatters';

export default function StakingPanel() {
    const [balances, setBalances] = useState({ bohr: '0', sBohr: '0' });
    const [stakeAmount, setStakeAmount] = useState('');
    const [unstakeAmount, setUnstakeAmount] = useState('');
    const [unstakeRequest, setUnstakeRequest] = useState(null);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                await stakingService.connect();
                const balances = await stakingService.getBalances();
                setBalances(balances);
                
                const request = await stakingService.getUnstakeRequest();
                setUnstakeRequest(request);
            } catch (error) {
                console.error("Error fetching staking data:", error);
            }
        };
        
        fetchData();
        
        // Set up event listeners
        const handleStakeSuccess = () => {
            fetchData();
            setStakeAmount('');
        };
        
        const handleUnstakeRequested = () => {
            fetchData();
            setUnstakeAmount('');
        };
        
        const handleUnstakeCompleted = () => {
            fetchData();
        };
        
        const handleUnstakeCancelled = () => {
            fetchData();
        };
        
        stakingService.on('stake_success', handleStakeSuccess);
        stakingService.on('unstake_requested', handleUnstakeRequested);
        stakingService.on('unstake_completed', handleUnstakeCompleted);
        stakingService.on('unstake_cancelled', handleUnstakeCancelled);
        
        return () => {
            stakingService.removeListener('stake_success', handleStakeSuccess);
            stakingService.removeListener('unstake_requested', handleUnstakeRequested);
            stakingService.removeListener('unstake_completed', handleUnstakeCompleted);
            stakingService.removeListener('unstake_cancelled', handleUnstakeCancelled);
        };
    }, []);
    
    const handleStake = async () => {
        if (!stakeAmount || parseFloat(stakeAmount) <= 0) return;
        
        setLoading(true);
        await stakingService.stake(stakeAmount);
        setLoading(false);
    };
    
    const handleRequestUnstake = async () => {
        if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) return;
        
        setLoading(true);
        await stakingService.requestUnstake(unstakeAmount);
        setLoading(false);
    };
    
    const handleCompleteUnstake = async () => {
        setLoading(true);
        await stakingService.completeUnstake();
        setLoading(false);
    };
    
    const handleCancelUnstake = async () => {
        setLoading(true);
        await stakingService.cancelUnstake();
        setLoading(false);
    };
    
    return (
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <h2 className="text-xl font-bold mb-4">Staking</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-700 p-3 rounded">
                    <div className="text-gray-400 text-sm">BOHR Balance</div>
                    <div className="text-xl font-bold">{balances.bohr}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded">
                    <div className="text-gray-400 text-sm">Staked BOHR</div>
                    <div className="text-xl font-bold">{balances.sBohr}</div>
                </div>
            </div>
            
            {!unstakeRequest ? (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Stake Amount
                        </label>
                        <div className="flex">
                            <input
                                type="number"
                                value={stakeAmount}
                                onChange={(e) => setStakeAmount(e.target.value)}
                                placeholder="0.0"
                                className="flex-1 bg-gray-700 text-white p-2 rounded-l"
                            />
                            <button
                                onClick={handleStake}
                                disabled={loading || !stakeAmount}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r disabled:opacity-50"
                            >
                                Stake
                            </button>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Unstake Amount
                        </label>
                        <div className="flex">
                            <input
                                type="number"
                                value={unstakeAmount}
                                onChange={(e) => setUnstakeAmount(e.target.value)}
                                placeholder="0.0"
                                className="flex-1 bg-gray-700 text-white p-2 rounded-l"
                            />
                            <button
                                onClick={handleRequestUnstake}
                                disabled={loading || !unstakeAmount}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-r disabled:opacity-50"
                            >
                                Unstake
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-700 p-4 rounded mb-4">
                    <h3 className="font-bold mb-2">Pending Unstake Request</h3>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <div>
                            <span className="text-gray-400 text-sm">Amount:</span>
                            <span className="ml-2">{unstakeRequest.amount} BOHR</span>
                        </div>
                        <div>
                            <span className="text-gray-400 text-sm">Blocks Remaining:</span>
                            <span className="ml-2">{unstakeRequest.blocksRemaining}</span>
                        </div>
                    </div>
                    
                    <div className="flex space-x-2">
                        {unstakeRequest.canComplete ? (
                            <button
                                onClick={handleCompleteUnstake}
                                disabled={loading}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex-1 disabled:opacity-50"
                            >
                                Complete Unstake
                            </button>
                        ) : (
                            <button
                                disabled={true}
                                className="bg-gray-600 text-white px-4 py-2 rounded flex-1 opacity-50"
                            >
                                Waiting for Cooldown
                            </button>
                        )}
                        
                        <button
                            onClick={handleCancelUnstake}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex-1 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
} 