'use client'
import { createContext, useContext, useState, useEffect } from 'react';
import { useBalance, useReadContract, useWriteContract, useSendTransaction } from 'wagmi';
import { TOKEN_ABI } from '../services/constants';
import { NETWORKS } from '../services/config';  
import { parseEther, formatEther } from 'viem';
import { ethers } from 'ethers';
import { useAccount } from 'wagmi';

const SessionWalletContext = createContext();

export function SessionWalletProvider({ children }) {
    const { address: mainWalletAddress } = useAccount();
    const [sessionWallet, setSessionWallet] = useState(null);
    const [hasSessionWallet, setHasSessionWallet] = useState(false);
    const [sessionWalletAddress, setSessionWalletAddress] = useState(null);

    // Add useEffect to watch for main wallet changes
    useEffect(() => {
        // Reset session wallet when main wallet changes or disconnects
        setSessionWallet(null);
        setSessionWalletAddress(null);
        setHasSessionWallet(false);
    }, [mainWalletAddress]);

    // Get ETH balance using wagmi's useBalance hook
    const { data: ethBalanceData } = useBalance({
        address: sessionWalletAddress,
        watch: true,
        query: {
            refetchInterval: 2000,
        }
    });

    // Get ETH balance of main wallet
    const { data: ethBalanceMain } = useBalance({
        address: mainWalletAddress,
        watch: true,
        query: {
            refetchInterval: 2000,
        }
    });

    // Get BOHR balance
    const { data: bohrBalance } = useReadContract({
        address: NETWORKS.baseSepolia.contracts.bohr,
        abi: TOKEN_ABI,
        functionName: 'balanceOf',
        args: [sessionWalletAddress],
        query: {
            refetchInterval: 2000,
        }
    });

    // Get BOHR balance for main wallet
    const { data: bohrBalanceMain } = useReadContract({
        address: NETWORKS.baseSepolia.contracts.bohr,
        abi: TOKEN_ABI,
        functionName: 'balanceOf',
        args: [mainWalletAddress],
        query: {
            refetchInterval: 2000,
        }
    });

    // Separate hooks for ETH and token transfers
    const { data: ethData, sendTransactionAsync, isPending: isEthPending, isSuccess: isEthSuccess } = useSendTransaction();
    const { data: tokenData, writeContractAsync, isPending: isTokenPending, isSuccess: isTokenSuccess } = useWriteContract();

    // Add new state variables for withdraw transactions
    const [isWithdrawPending, setIsWithdrawPending] = useState(false);
    const [isWithdrawSuccess, setIsWithdrawSuccess] = useState(false);

    const getSessionWallet = async () => {
        if (!sessionWallet && mainWalletAddress) {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const mainWallet = await provider.getSigner();
                
                const signatureMessage = `WARNING: Only sign this message on the official website. Signing this message elsewhere will expose your session keys to attackers.\n\nThis is a gasless signature to create a session key to mine BOHR.\n\nDomain: ${window.location.hostname}\n\nWallet: ${mainWalletAddress}\n\nUnique App ID: Bohrium-Secure-Session-Key\n\nVersion: 1.0`;

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
                    address: NETWORKS.baseSepolia.contracts.bohr,
                    abi: TOKEN_ABI,
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
        const parsedAmount = parseEther(amount);

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
                    NETWORKS.baseSepolia.contracts.bohr,
                    TOKEN_ABI,
                    sessionWallet
                );
                const result = await tokenContract.transfer(mainWalletAddress, parsedAmount);
                await result.wait(); // Wait for transaction confirmation
                setIsWithdrawSuccess(true);
                return result;
            }
        } catch (err) {
            console.error('Withdraw error:', err);
            throw err;
        } finally {
            setIsWithdrawPending(false);
        }
    };

    const value = {
        sessionWalletAddress,
        balances: {
            eth: ethBalanceData?.value ? Number(formatEther(ethBalanceData.value)).toFixed(7) : '0',
            bohr: bohrBalance ? formatEther(bohrBalance) : '0'
        },
        formattedBalances: {
            eth: ethBalanceData?.value ? Number(formatEther(ethBalanceData.value)).toLocaleString(undefined, { minimumFractionDigits: 7, maximumFractionDigits: 7 }) : '0',
            bohr: bohrBalance ? Number(formatEther(bohrBalance)).toLocaleString() : '0'
        },
        isLoading: isEthPending || isTokenPending || isWithdrawPending,
        isSuccess: isEthSuccess || isTokenSuccess || isWithdrawSuccess,
        error: null,
        deposit,
        withdraw,
        getSessionWallet,
        hasSessionWallet,
        data: ethData || tokenData,
        balancesMain: {
            bohr: bohrBalanceMain ? formatEther(bohrBalanceMain) : '0',
            eth: ethBalanceMain ? Number(formatEther(ethBalanceMain)).toFixed(7) : '0'
        }
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