'use client'
import { useAccount, useBalance, useReadContract } from 'wagmi'
import { MINING_CONTRACT_ADDRESS, MINING_ABI } from '../wagmi'

export default function MiningStats() {
  const { address } = useAccount()
  
  // Get ETH balance
  const { data: ethBalance } = useBalance({
    address: address,
  })

  // Get BOHR token address from mining contract
  const { data: bohrTokenAddress } = useReadContract({
    address: MINING_CONTRACT_ADDRESS,
    abi: MINING_ABI,
    functionName: 'bohriumToken',
  })

  // Get BOHR balance using the token address
  const { data: bohrBalance } = useBalance({
    address: address,
    token: bohrTokenAddress,
    enabled: Boolean(bohrTokenAddress), // Only run this query when we have the token address
  })

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Mining Stats</h2>
      <div className="space-y-2">
        <p>ETH Balance: {ethBalance?.value ? (Number(ethBalance.value) / 1e18).toFixed(4) : '0'} ETH</p>
        <p>BOHR Balance: {bohrBalance?.value ? (Number(bohrBalance.value) / 1e18).toFixed(2) : '0'} BOHR</p>
      </div>
    </div>
  )
}