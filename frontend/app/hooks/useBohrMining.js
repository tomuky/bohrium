'use client'
import { useReadContract } from 'wagmi'
import { DEFAULT_NETWORK } from '../services/config'

const BOHRIUM_MINING_ADDRESS = DEFAULT_NETWORK.contracts.mining

const MINING_ABI = [{
    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "name": "noncesSubmitted",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
}, {
    "inputs": [],
    "name": "roundId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
}]

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