'use client'
import { useState, useRef } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useWriteContract } from 'wagmi'
import MiningConsole from './components/MiningConsole'
import MiningStats from './components/MiningStats'
import { MINING_CONTRACT_ADDRESS, MINING_ABI } from './wagmi'
import { ethers } from 'ethers'
import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'

export default function Home() {
  const [isMining, setIsMining] = useState(false)
  const isMiningRef = useRef(false)
  const [logs, setLogs] = useState([])
  const progressIntervalRef = useRef(null)
  const { isConnected, address } = useAccount()
  
  const { writeContractAsync: submitNonce } = useWriteContract()
  const { writeContractAsync: endRound } = useWriteContract()

  const findBestNonce = async (roundId, minerAddress, duration) => {
    let bestNonce = 0
    let bestHash = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")
    const endTime = Date.now() + duration
    
    while (Date.now() < endTime) {
      for (let i = 0; i < 1000; i++) { // Batch size
        const nonce = Math.floor(Math.random() * 2**32) // Nonce range
        const hash = ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "address", "uint256"],
            [roundId, minerAddress, nonce]
          )
        )

        const hashValue = BigInt(hash)
        if (hashValue < bestHash) {
          bestHash = hashValue
          bestNonce = nonce
        }
      }
      // Let UI update
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    return bestNonce
  }

  const addLog = (message, updateLast = false, isCountdown = false) => {
    setLogs((prev) => {
      if (updateLast && prev.length > 0) {
        if (isCountdown) {
          // Find the last countdown message and update only that one
          const lastCountdownIndex = [...prev].reverse().findIndex(msg => msg.startsWith('⏳') || msg.startsWith('⛏️'))
          if (lastCountdownIndex !== -1) {
            const actualIndex = prev.length - 1 - lastCountdownIndex
            return [
              ...prev.slice(0, actualIndex),
              message,
              ...prev.slice(actualIndex + 1)
            ]
          }
        }
        // Default behavior for non-countdown updates
        return [...prev.slice(0, -1), message]
      }
      return [...prev, message]
    })
  }

  const clearLogs = () => {
    setLogs([])
  }

  const startMining = async () => {
    if (!isConnected) {
      addLog('❌ Error: Not connected')
      return
    }

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http()
    })

    setIsMining(true)
    isMiningRef.current = true
    addLog('🚀 Starting Bohrium Mining...')

    while (isMiningRef.current) {
      console.log('isMining', isMiningRef.current);
      try {
        // Get fresh contract data in each iteration
        const [currentRoundId, currentRoundStartTime] = await Promise.all([
          publicClient.readContract({
            address: MINING_CONTRACT_ADDRESS,
            abi: MINING_ABI,
            functionName: 'roundId'
          }),
          publicClient.readContract({
            address: MINING_CONTRACT_ADDRESS,
            abi: MINING_ABI,
            functionName: 'roundStartTime'
          })
        ])

        const roundId = currentRoundId
        const roundStartTime = currentRoundStartTime
        const roundAge = Number(BigInt(Math.floor(Date.now() / 1000)) - roundStartTime) // in seconds
        const MIN_ROUND_DURATION = 60; // in seconds
        const TX_BUFFER = 10; // in seconds  
        const END_ROUND_WAIT = 5; // in seconds

        // Modified end-round handling block
        if (roundAge >= MIN_ROUND_DURATION) {
          if (roundAge >= MIN_ROUND_DURATION + END_ROUND_WAIT) {
            addLog('🏁 Ending round...')
            await endRound({
              address: MINING_CONTRACT_ADDRESS,
              abi: MINING_ABI,
              functionName: 'endRound'
            })
            addLog('✅ Round ended successfully')
            // Add a delay to allow the new round to start
            await new Promise(resolve => setTimeout(resolve, 2000))
          } else {
            const startWaitTime = Date.now()
            const totalWait = (MIN_ROUND_DURATION + END_ROUND_WAIT) - roundAge
            
            const updateWaitProgress = () => {
              const elapsed = Math.floor((Date.now() - startWaitTime) / 1000)
              const remaining = Math.max(0, totalWait - elapsed)
              addLog(`⏳ Waiting ${remaining} seconds before ending round...`, true, true)
            }

            // Initial message
            updateWaitProgress()
            
            // Update countdown every second
            const waitInterval = setInterval(updateWaitProgress, 1000)
            
            // Wait for the full duration
            await new Promise(resolve => setTimeout(resolve, totalWait * 1000))
            clearInterval(waitInterval)
            
            // Skip the next iteration to prevent double-checking
            continue
          }
          // Skip to next iteration after ending round
          continue
        }

        // Calculate mining duration
        const miningDuration = Math.max(0, MIN_ROUND_DURATION - roundAge - TX_BUFFER)
        
        if (miningDuration > 0) {
          const startTime = Date.now()
          const updateMiningProgress = () => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000)
            const remaining = miningDuration - elapsed
            if (remaining >= 0) {
              addLog(`⛏️ Mining for ${remaining} seconds...`, true, true)
            }
          }

          updateMiningProgress()

          // Store interval reference
          progressIntervalRef.current = setInterval(updateMiningProgress, 1000)
          
          const bestNonce = await findBestNonce(Number(roundId), address, miningDuration * 1000)
          
          // Clean up interval
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
            progressIntervalRef.current = null
          }
          
          addLog(`✨ Found best nonce: ${bestNonce}`)

          await submitNonce({
            address: MINING_CONTRACT_ADDRESS,
            abi: MINING_ABI,
            functionName: 'submitNonce',
            args: [bestNonce],
            gas: BigInt(Math.floor(1.5 * 100000))
          })
          addLog('✅ Nonce submitted successfully')
        }

        // Add small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        // Clean up interval on error
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
        addLog(`❌ Error: ${error.message}`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
  }

  return (
    <div>
      <MiningConsole logs={logs} />
    </div>
  )
}