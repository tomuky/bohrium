'use client'
import { useAccount, useReadContract, useWriteContract, useBalance, useWaitForTransactionReceipt } from 'wagmi'
import { formatAddress } from '../services/utils'
import { ZeroAddress } from 'ethers'
import { DEFAULT_NETWORK } from '../services/config'
import { formatUnits } from 'viem'
import { useState } from 'react'
import { FACTORY_ABI, TOKEN_ABI } from '../services/constants'

export function useMiningAccount() {
    const { address } = useAccount()
    const [transactionHash, setTransactionHash] = useState(null);
    
    // Get mining account address from factory, returns zero address if no account exists
    const { data: miningAccountAddress } = useReadContract({
        address: DEFAULT_NETWORK.contracts.factory,
        abi: FACTORY_ABI,
        functionName: 'getMiningAccount',
        args: [address],
        enabled: !!address
    })

    const { data: ethBalanceData } = useBalance({
        address: address,
        enabled: !!address && address !== ZeroAddress,
        query: {
            refetchInterval: 5000
        }
    })

    const { data: bohrBalance, isError, error, status } = useReadContract({
        address: DEFAULT_NETWORK.contracts.bohr,
        abi: TOKEN_ABI,
        functionName: 'balanceOf',
        args: [address],
        enabled: !!address && address !== ZeroAddress,
        query: {
            refetchInterval: 5000
        }
    })

    // Add creation logic
    const { 
        writeContractAsync: createAccount, 
        data: txData,
        error: writeError 
    } = useWriteContract();

    const { isLoading: isCreating, isSuccess: isCreated, error: createError } = useWaitForTransactionReceipt({
        hash: transactionHash,
        enabled: !!transactionHash,
    })
 
    const create = async () => {
        try {
            await createAccount({
                address: DEFAULT_NETWORK.contracts.factory,
                abi: FACTORY_ABI,
                functionName: 'createMiningAccount'
            });
            //console.log('txData', txData)
            setTransactionHash(txData)

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
        isCreating,
        isCreated,
        createError,
        txData
    }
}