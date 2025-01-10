'use client'
import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'

// You'll need to replace this with your actual token contract address
const BOHR_TOKEN_ADDRESS = '0x9a65702Ed8ebD21de4F5e08F354D8064fDD0Cf9D'

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
        address: BOHR_TOKEN_ADDRESS,
        abi: BOHR_TOKEN_ABI,
        functionName: 'totalSupply',
        watch: true,
        pollingInterval: 100000
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
