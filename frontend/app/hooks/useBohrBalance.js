'use client'
import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'

const BOHR_TOKEN_ADDRESS = '0x9a65702Ed8ebD21de4F5e08F354D8064fDD0Cf9D'

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
        pollingInterval: 10000
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