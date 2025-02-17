'use client'
import { createContext, useContext, useState } from 'react';
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

    // Get ETH balance using wagmi's useBalance hook
    const { data: ethBalanceData } = useBalance({
        address: sessionWalletAddress,
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

    // Separate hooks for ETH and token transfers
    const { sendTransaction, isPending: isEthPending } = useSendTransaction();
    const { writeContract, isPending: isTokenPending } = useWriteContract();

    const getSessionWallet = async () => {
        console.log('sessionWallet', sessionWallet)
        console.log('mainWalletAddress', mainWalletAddress)
        if (!sessionWallet && mainWalletAddress) {
            console.log('getSessionWallet')
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const mainWallet = await provider.getSigner();
                
                const signatureMessage = `This is a gasless signature to create a session key for Bohrium mining.\n\nWARNING: Only sign this message on the official Bohrium website. Signing this message on another website could expose your session keys to attackers.\n\nCheck our socials for offical links.\n\nWallet: ${mainWalletAddress}`;
                
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
                const result = await sendTransaction({
                    to: sessionWalletAddress,
                    value: parsedAmount,
                });
                return result;
            } else if (token === 'BOHR') {
                const result = await writeContract({
                    address: NETWORKS.baseSepolia.contracts.bohr,
                    abi: TOKEN_ABI,
                    functionName: 'transfer',
                    args: [sessionWalletAddress, parsedAmount],
                });
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

        const parsedAmount = parseEther(amount);

        try {
            if (!sessionWallet) {
                await getSessionWallet();
            }

            if (token === 'ETH') {
                return await sessionWallet.sendTransaction({
                    to: mainWalletAddress,
                    value: parsedAmount
                });
            } else if (token === 'BOHR') {
                const tokenContract = new ethers.Contract(
                    NETWORKS.baseSepolia.contracts.bohr,
                    TOKEN_ABI,
                    sessionWallet
                );
                return await tokenContract.transfer(mainWalletAddress, parsedAmount);
            }
        } catch (err) {
            console.error('Withdraw error:', err);
            throw err;
        }
    };

    const value = {
        sessionWalletAddress,
        balances: {
            eth: ethBalanceData?.value ? Number(formatEther(ethBalanceData.value)).toFixed(7) : '0',
            bohr: bohrBalance ? formatEther(bohrBalance) : '0'
        },
        isLoading: isEthPending || isTokenPending,
        error: null,
        deposit,
        withdraw,
        getSessionWallet,
        hasSessionWallet,
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