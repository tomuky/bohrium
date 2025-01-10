'use client'
import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'

const BOHR_TOKEN_ADDRESS = '0x85dF140E5dC19e49D3866Bb4632387f2FDd04a34'

const BOHR_TOKEN_ABI = [{
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
}, {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
}]

export function useBohrBalance(address) {
    const { data: balance, isError, isLoading } = useReadContract({
        address: BOHR_TOKEN_ADDRESS,
        abi: BOHR_TOKEN_ABI,
        functionName: 'balanceOf',
        args: [address],
        watch: true,
    })

    const { data: decimals } = useReadContract({
        address: BOHR_TOKEN_ADDRESS,
        abi: BOHR_TOKEN_ABI,
        functionName: 'decimals',
    })

    const formattedBalance = balance && decimals
        ? formatUnits(balance, decimals)
        : null

    return {
        balance: formattedBalance,
        isError,
        isLoading
    }
}