'use client';
import { useState, useEffect } from 'react';
import stakingService from '../services/stakingService';
import { formatAddress } from '../utils/formatters';

export default function DelegationPanel() {
    const [delegationInfo, setDelegationInfo] = useState({
        isMainWallet: false,
        isSessionWallet: false,
        sessionWallet: null,
        mainWallet: null
    });
    const [sessionWalletAddress, setSessionWalletAddress] = useState('');
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        const fetchDelegationInfo = async () => {
            try {
                await stakingService.connect();
                const info = await stakingService.getDelegationInfo();
                setDelegationInfo(info);
            } catch (error) {
                console.error("Error fetching delegation info:", error);
            }
        };
        
        fetchDelegationInfo();
        
        // Set up event listeners
        const handleDelegationSet = () => {
            fetchDelegationInfo();
            setSessionWalletAddress('');
        };
        
        const handleDelegationRemoved = () => {
            fetchDelegationInfo();
        };
        
        stakingService.on('delegation_set', handleDelegationSet);
        stakingService.on('delegation_removed', handleDelegationRemoved);
        
        return () => {
            stakingService.removeListener('delegation_set', handleDelegationSet);
            stakingService.removeListener('delegation_removed', handleDelegationRemoved);
        };
    }, []);
    
    const handleSetDelegation = async () => {
        if (!sessionWalletAddress) return;
        
        setLoading(true);
        await stakingService.setDelegation(sessionWalletAddress);
        setLoading(false);
    };
    
    const handleRemoveDelegation = async () => {
        setLoading(true);
        await stakingService.removeDelegation();
        setLoading(false);
    };
    
    return (
        <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4">Delegation</h2>
            
            {delegationInfo.isMainWallet ? (
                <div className="mb-4">
                    <div className="bg-gray-700 p-4 rounded mb-4">
                        <h3 className="font-bold mb-2">Active Delegation</h3>
                        <div className="mb-3">
                            <span className="text-gray-400 text-sm">Session Wallet:</span>
                            <span className="ml-2">{formatAddress(delegationInfo.sessionWallet)}</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">
                            Your main wallet is delegated to this session wallet. Mining rewards from the session wallet will be sent to your main wallet.
                        </p>
                        <button
                            onClick={handleRemoveDelegation}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded w-full disabled:opacity-50"
                        >
                            Remove Delegation
                        </button>
                    </div>
                </div>
            ) : delegationInfo.isSessionWallet ? (
                <div className="mb-4">
                    <div className="bg-gray-700 p-4 rounded mb-4">
                        <h3 className="font-bold mb-2">Delegated Session Wallet</h3>
                        <div className="mb-3">
                            <span className="text-gray-400 text-sm">Main Wallet:</span>
                            <span className="ml-2">{formatAddress(delegationInfo.mainWallet)}</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">
                            This session wallet is delegated from the main wallet above. Mining rewards will be sent to the main wallet.
                        </p>
                    </div>
                </div>
            ) : (
                <div>
                    <p className="text-sm text-gray-400 mb-4">
                        Delegation allows you to separate your main wallet (which holds funds) from your session wallet (which does the mining). 
                        Stake BOHR from your main wallet and have it count for your session wallet's mining difficulty.
                    </p>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Session Wallet Address
                        </label>
                        <div className="flex">
                            <input
                                type="text"
                                value={sessionWalletAddress}
                                onChange={(e) => setSessionWalletAddress(e.target.value)}
                                placeholder="0x..."
                                className="flex-1 bg-gray-700 text-white p-2 rounded-l"
                            />
                            <button
                                onClick={handleSetDelegation}
                                disabled={loading || !sessionWalletAddress}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r disabled:opacity-50"
                            >
                                Set Delegation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 