import { useBalance, useReadContract, useWriteContract, useSendTransaction } from 'wagmi';
import { useMining } from '../contexts/MiningContext';
import { TOKEN_ABI } from '../services/constants';
import { NETWORKS } from '../services/config';
import { parseEther, formatEther } from 'viem';
import { sessionWalletService } from '../services/sessionWalletService';

export const useSessionWallet = () => {
    const { sessionWalletAddress, mainWalletAddress } = useMining();
    
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
            if (token === 'ETH') {
                return await sessionWalletService.withdrawETH(
                    parsedAmount,
                    mainWalletAddress
                );
            } else if (token === 'BOHR') {
                return await sessionWalletService.withdrawToken(
                    NETWORKS.baseSepolia.contracts.bohr,
                    parsedAmount,
                    mainWalletAddress
                );
            }
        } catch (err) {
            console.error('Withdraw error:', err);
            throw err;
        }
    };

    return {
        balances: {
            eth: ethBalanceData?.value ? Number(formatEther(ethBalanceData.value)).toFixed(5) : '0',
            bohr: bohrBalance ? (bohrBalance / 10n ** 18n).toString() : '0',
        },
        isLoading: isEthPending || isTokenPending,
        error: null, // You might want to handle specific error states here
        deposit,
        withdraw,
    };
};
