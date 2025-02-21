'use client'
import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { DEFAULT_NETWORK } from '../services/config'
import { TOKEN_ABI } from '../services/constants'

const BOHR_TOKEN_ADDRESS = DEFAULT_NETWORK.contracts.bohr

export function useBohrBalance(address) {
    const { data: balance, isError, isLoading } = useReadContract({
        address: BOHR_TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'balanceOf',
        args: [address],
        query: {
            refetchInterval: 1000,
            enabled: !!address
        }
    })

    const { data: decimals } = useReadContract({
        address: BOHR_TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'decimals',
        query: {
            enabled: !!address
        }
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