'use client'
import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { DEFAULT_NETWORK } from '../services/config'

// Basic ERC20 ABI for totalSupply
const BOHR_TOKEN_ABI = [{
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
}]

export function useBohrToken() {
    const { data: totalSupply, isError, isLoading } = useReadContract({
        address: DEFAULT_NETWORK.contracts.bohr,
        abi: BOHR_TOKEN_ABI,
        functionName: 'totalSupply',
        query: {
            refetchInterval: 5000
        }
    })

    const formattedTotalSupply = totalSupply 
        ? formatUnits(totalSupply, 18)
        : null

    return {
        totalSupply: formattedTotalSupply,
        isError,
        isLoading,
        price: 0.00
    }
}
