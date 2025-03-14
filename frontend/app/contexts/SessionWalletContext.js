'use client'
import { createContext, useContext, useState, useEffect } from 'react';
import { useBalance, useWriteContract, useSendTransaction, useReadContracts } from 'wagmi';
import { TOKEN_ABI as abi, MINING_ABI, STAKED_BOHR_ABI } from '../services/constants';
import { NETWORKS } from '../services/config';  
import { parseEther, formatEther } from 'viem';
import { ethers } from 'ethers';
import { useAccount } from 'wagmi';
import stakingService from '../services/stakingService';

const SessionWalletContext = createContext();

export function SessionWalletProvider({ children }) {
    const { address: mainWalletAddress } = useAccount();
    const [sessionWallet, setSessionWallet] = useState(null);
    const [hasSessionWallet, setHasSessionWallet] = useState(false);
    const [sessionWalletAddress, setSessionWalletAddress] = useState(null);
    const [isDelegated, setIsDelegated] = useState(false);

    // Add contract reads to get token addresses
    const { data: tokenAddresses } = useReadContracts({
        contracts: [
            {
                address: NETWORKS.baseSepolia.contracts.mining,
                abi: MINING_ABI,
                functionName: 'bohriumToken',
            },
            {
                address: NETWORKS.baseSepolia.contracts.mining,
                abi: MINING_ABI,
                functionName: 'stakedBohrToken',
            }
        ],
    });
    const bohrAddress = tokenAddresses?.[0]?.result;
    const sBohrAddress = tokenAddresses?.[1]?.result;

    // Check if session wallet is delegated to main wallet
    const { data: delegationData } = useReadContracts({
        contracts: sBohrAddress && sessionWalletAddress && mainWalletAddress ? [
            {
                address: sBohrAddress,
                abi: STAKED_BOHR_ABI,
                functionName: 'delegatedBy',
                args: [sessionWalletAddress],
            }
        ] : [],
        query: {
            refetchInterval: 5000,
            enabled: Boolean(sBohrAddress && sessionWalletAddress && mainWalletAddress)
        }
    });

    // Update delegation status when data changes
    useEffect(() => {
        if (delegationData && delegationData[0]?.result) {
            const delegatedByAddress = delegationData[0].result;
            setIsDelegated(delegatedByAddress.toLowerCase() === mainWalletAddress?.toLowerCase());
        } else {
            setIsDelegated(false);
        }
    }, [delegationData, mainWalletAddress]);

    // Add useEffect to watch for main wallet changes
    useEffect(() => {
        // Reset session wallet when main wallet changes or disconnects
        setSessionWallet(null);
        setSessionWalletAddress(null);
        setHasSessionWallet(false);
    }, [mainWalletAddress]);

    // Get ETH balance of session wallet
    const { data: sessionEthBalanceData } = useBalance({
        address: sessionWalletAddress,
        watch: true,
        query: {
            refetchInterval: 2000,
        }
    });

    // Get ETH balance of main wallet
    const { data: mainEthBalanceData } = useBalance({
        address: mainWalletAddress,
        watch: true,
        query: {
            refetchInterval: 2000,
        }
    });

    // Get BOHR and staked BOHR balances
    const { data: balancesData, error: balancesError } = useReadContracts({
        contracts: bohrAddress && sBohrAddress && sessionWalletAddress && mainWalletAddress ? [
            {
                address: bohrAddress,
                abi,
                functionName: 'balanceOf',
                args: [sessionWalletAddress],
            },
            {
                address: bohrAddress,
                abi,
                functionName: 'balanceOf',
                args: [mainWalletAddress],
            },
            {
                address: sBohrAddress,
                abi,
                functionName: 'balanceOf',
                args: [mainWalletAddress],
            }
        ] : [],
        query: {
            refetchInterval: 2000,
            enabled: Boolean(bohrAddress && sBohrAddress && sessionWalletAddress && mainWalletAddress)
        }
    });
    
    // Destructure the results
    const [sessionBohrBalanceData, mainBohrBalanceData, mainSbohrBalanceData] = balancesData || [];

    // Separate hooks for ETH and token transfers
    const { data: ethData, sendTransactionAsync, isPending: isEthPending, isSuccess: isEthSuccess } = useSendTransaction();
    const { data: tokenData, writeContractAsync, isPending: isTokenPending, isSuccess: isTokenSuccess } = useWriteContract();

    // Add new state variables for withdraw transactions
    const [isWithdrawPending, setIsWithdrawPending] = useState(false);
    const [isWithdrawSuccess, setIsWithdrawSuccess] = useState(false);

    // Add new state for delegation operations
    const [isDelegationLoading, setIsDelegationLoading] = useState(false);
    const [delegationError, setDelegationError] = useState(null);

    const getSessionWallet = async () => {
        if (!sessionWallet && mainWalletAddress) {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const mainWallet = await provider.getSigner();
                
                const signatureMessage = `WARNING: Only sign this message on the official website. Signing this message elsewhere will expose your session keys to attackers.\n\nThis is a gasless signature to create a session key to mine BOHR.\n\nDomain: ${window.location.hostname}\n\nNetwork: ${NETWORKS.baseSepolia.name}\n\nWallet: ${mainWalletAddress}\n\nUnique App ID: Bohrium-Secure-Session-Key\n\nVersion: 1.0`;

                const signedMessage = await mainWallet.signMessage(signatureMessage);
                const seed = ethers.keccak256(ethers.toUtf8Bytes(signedMessage));
                const wallet = new ethers.Wallet(seed, provider);
                const address = await wallet.getAddress();

                setSessionWallet(wallet);
                setSessionWalletAddress(address);
                setHasSessionWallet(true);
                return { wallet, address };
            } catch (err) {
                console.error('Session wallet creation error:', err);
                throw err;
            }
        }
        return { wallet: sessionWallet, address: sessionWalletAddress };
    };

    const deposit = async (amount, token) => {
        if (!amount || !sessionWalletAddress || !mainWalletAddress) {
            throw new Error('Missing required parameters for deposit');
        }

        const parsedAmount = parseEther(amount);

        try {
            if (token === 'ETH') {
                const hash = await sendTransactionAsync({
                    to: sessionWalletAddress,
                    value: parsedAmount,
                });
                return hash;
            } else if (token === 'BOHR') {
                const result = await writeContractAsync({
                    address: bohrAddress,
                    abi,
                    functionName: 'transfer',
                    args: [sessionWalletAddress, parsedAmount],
                });
                console.log('result', result)
                return result;
            }
        } catch (err) {
            console.error('Deposit error:', err);
            throw err;
        }
    };

    const withdraw = async (amount, token) => {
        if (!amount || !sessionWalletAddress || !mainWalletAddress) {
            throw new Error('Missing required parameters for withdraw');
        }

        setIsWithdrawPending(true);
        setIsWithdrawSuccess(false);
        const parsedAmount = parseEther(amount.toString());

        try {
            if (!sessionWallet) {
                await getSessionWallet();
            }

            if (token === 'ETH') {
                const result = await sessionWallet.sendTransaction({
                    to: mainWalletAddress,
                    value: parsedAmount
                });
                await result.wait(); // Wait for transaction confirmation
                setIsWithdrawSuccess(true);
                return result;
            } else if (token === 'BOHR') {
                const tokenContract = new ethers.Contract(
                    bohrAddress,
                    abi,
                    sessionWallet
                );
                const result = await tokenContract.transfer(mainWalletAddress, parsedAmount);
                await result.wait(); // Wait for transaction confirmation
                setIsWithdrawSuccess(true);
                return result;
            }
        } catch (err) {
            console.error('Withdraw error:', err);
            setIsWithdrawPending(false);
            throw err;
        } finally {
            setIsWithdrawPending(false);
        }
    };

    // Add a new method to handle delegation
    const setDelegation = async () => {
        if (isDelegationLoading || !sessionWalletAddress || !mainWalletAddress) return;
        
        try {
            setDelegationError(null);
            setIsDelegationLoading(true);
            await stakingService.setDelegation(sessionWalletAddress);
            setIsDelegationLoading(false);
        } catch (err) {
            setIsDelegationLoading(false);
            setDelegationError(err.message || 'Failed to set delegation');
            console.error('Set delegation error:', err);
            throw err;
        }
    };
    
    // Add a new method to handle removing delegation
    const removeDelegation = async () => {
        if (isDelegationLoading || !mainWalletAddress) return;
        
        try {
            setDelegationError(null);
            setIsDelegationLoading(true);
            await stakingService.removeDelegation();
            setIsDelegationLoading(false);
        } catch (err) {
            setIsDelegationLoading(false);
            setDelegationError(err.message || 'Failed to remove delegation');
            console.error('Remove delegation error:', err);
            throw err;
        }
    };

    const value = {
        balances: {
            main: {
                eth: {
                    value: mainEthBalanceData ? (Number(mainEthBalanceData.value))/(10**mainEthBalanceData.decimals) : '0',
                    formatted: mainEthBalanceData ? Number(formatEther(Number(mainEthBalanceData.value))).toLocaleString() : '0',
                },
                bohr: {
                    value: mainBohrBalanceData?.result ? formatEther(mainBohrBalanceData.result) : '0',
                    formatted: mainBohrBalanceData?.result ? Number(formatEther(mainBohrBalanceData.result)).toLocaleString() : '0'
                },
                sbohr: {
                    value: mainSbohrBalanceData?.result ? formatEther(mainSbohrBalanceData.result) : '0',
                    formatted: mainSbohrBalanceData?.result ? Number(formatEther(mainSbohrBalanceData.result)).toLocaleString() : '0'
                }
            },
            session: {
                eth: {
                    value: sessionEthBalanceData?.value ? Number(formatEther(sessionEthBalanceData.value)).toFixed(7) : '0',
                    formatted: sessionEthBalanceData?.value ? Number(formatEther(sessionEthBalanceData.value)).toLocaleString(undefined, { minimumFractionDigits: 7, maximumFractionDigits: 7 }) : '0'
                },
                bohr: {
                    value: sessionBohrBalanceData?.result ? formatEther(sessionBohrBalanceData.result) : '0',
                    formatted: sessionBohrBalanceData?.result ? Number(formatEther(sessionBohrBalanceData.result)).toLocaleString() : '0'
                },
                sbohr: {
                    value: 0,
                    formatted: '0'
                }
            },
        },
        sessionWalletAddress,
        sessionHasEth: sessionEthBalanceData?.value ? Number(formatEther(sessionEthBalanceData.value)) > 0 : false,
        isLoading: isEthPending || isTokenPending || isWithdrawPending,
        isSuccess: isEthSuccess || isTokenSuccess || isWithdrawSuccess,
        error: null,

        deposit,
        withdraw,
        getSessionWallet,
        hasSessionWallet,
        data: ethData || tokenData,

        isDelegated,
        isDelegationLoading,
        delegationError,
        setDelegation,
        removeDelegation
    };

    return (
        <SessionWalletContext.Provider value={value}>
            {children}
        </SessionWalletContext.Provider>
    );
}

export function useSessionWallet() {
    const context = useContext(SessionWalletContext);
    if (!context) {
        throw new Error('useSessionWallet must be used within a SessionWalletProvider');
    }
    return context;
}