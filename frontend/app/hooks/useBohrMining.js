'use client'
import { useReadContract } from 'wagmi'
import { DEFAULT_NETWORK } from '../services/config'
import { MINING_ABI } from '../services/constants'

const BOHRIUM_MINING_ADDRESS = DEFAULT_NETWORK.contracts.mining

export function useBohrMining() {
    const { data: currentRoundId } = useReadContract({
        address: BOHRIUM_MINING_ADDRESS,
        abi: MINING_ABI,
        functionName: 'roundId',
        query: {
            refetchInterval: 1000
        }
    })

    const { data: activeMinerCount } = useReadContract({
        address: BOHRIUM_MINING_ADDRESS,
        abi: MINING_ABI,
        functionName: 'noncesSubmitted',
        args: [currentRoundId ? BigInt(Number(currentRoundId) - 1) : 0n], // get previous round's noncesSubmitted
        enabled: currentRoundId != null,
        query: {
            refetchInterval: 5000
        }
    })

    return {
        activeMinerCount: activeMinerCount ? Number(activeMinerCount) : 0,
        currentRoundId: currentRoundId ? Number(currentRoundId) : 0
    }
}