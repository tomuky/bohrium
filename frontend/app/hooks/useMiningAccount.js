'use client'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi'
import { formatAddress } from '../services/utils'
import { ZeroAddress } from 'ethers'
import { DEFAULT_NETWORK } from '../services/config'
import { formatUnits } from 'viem'

const FACTORY_ABI = [{
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "userToMiningAccount",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
}, {
    "inputs": [],
    "name": "createMiningAccount",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "function"
}]

const MINING_ACCOUNT_ABI = [{
    "inputs": [],
    "name": "owner",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
}]

const TOKEN_ABI = [{
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
}]

export function useMiningAccount() {
    const { address } = useAccount()
    
    // Get mining account address from factory
    const { data: miningAccountAddress } = useReadContract({
        address: DEFAULT_NETWORK.contracts.factory,
        abi: FACTORY_ABI,
        functionName: 'userToMiningAccount',
        args: [address],
        enabled: !!address
    })

    // Use wagmi's useBalance hook instead of direct provider access
    const { data: ethBalanceData } = useBalance({
        address: miningAccountAddress,
        enabled: !!miningAccountAddress && miningAccountAddress !== ZeroAddress,
        query: {
            refetchInterval: 5000
        }
    })

    // Get BOHR balance of mining account
    const { data: bohrBalance } = useReadContract({
        address: DEFAULT_NETWORK.contracts.bohr,
        abi: TOKEN_ABI,
        functionName: 'balanceOf',
        args: [miningAccountAddress],
        enabled: !!miningAccountAddress && miningAccountAddress !== ZeroAddress,
        query: {
            refetchInterval: 5000
        }
    })

    // Add creation logic
    const { writeContract: createAccount, data: txData, error: writeError } = useWriteContract()

    const { isLoading: isCreating } = useWaitForTransactionReceipt({
        hash: txData?.hash,
        enabled: !!txData?.hash,
    })

    const create = async () => {
        try {
            await createAccount({
                address: DEFAULT_NETWORK.contracts.factory,
                abi: FACTORY_ABI,
                functionName: 'createMiningAccount'
            })
        } catch (error) {
            console.error('Failed to create mining account:', error)
            throw error
        }
    }

    return {
        miningAccountAddress,
        hasAccount: miningAccountAddress && miningAccountAddress !== ZeroAddress,
        formattedAddress: miningAccountAddress ? formatAddress(miningAccountAddress) : '',
        ethBalance: ethBalanceData?.formatted ?? '0',
        bohrBalance: bohrBalance ? formatUnits(bohrBalance, 18) : '0',
        create,
        isCreating
    }
}