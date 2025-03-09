'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { grantPermissions } from '@reown/appkit-experimental/smart-session'
import { toHex } from 'viem'
import { baseSepolia } from 'viem/chains'
import { DEFAULT_NETWORK } from '../services/config'

// Create the context
const SmartSessionContext = createContext(null)

// Custom hook to use the Smart Session context
export const useSmartSession = () => {
  const context = useContext(SmartSessionContext)
  if (!context) {
    throw new Error('useSmartSession must be used within a SmartSessionProvider')
  }
  return context
}

export const SmartSessionProvider = ({ children }) => {
  const [sessionContext, setSessionContext] = useState(null)
  const [hasActiveSession, setHasActiveSession] = useState(false)
  const [isRequestingSession, setIsRequestingSession] = useState(false)
  const { address, isConnected } = useAccount()

  // Load session from localStorage on component mount and when address changes
  useEffect(() => {
    if (isConnected && address) {
      const storedSession = localStorage.getItem('miningSessionContext')
      if (storedSession) {
        try {
          setSessionContext(storedSession)
          setHasActiveSession(true)
        } catch (error) {
          console.error('Error parsing stored session:', error)
          clearSession()
        }
      } else {
        setHasActiveSession(false)
      }
    } else {
      // Clear session when wallet disconnects
      clearSession()
    }
  }, [address, isConnected])

  // Save session context to localStorage
  const saveSession = (context) => {
    if (context) {
      localStorage.setItem('miningSessionContext', context)
      setSessionContext(context)
      setHasActiveSession(true)
    }
  }

  // Clear session from localStorage and state
  const clearSession = () => {
    localStorage.removeItem('miningSessionContext')
    setSessionContext(null)
    setHasActiveSession(false)
  }

  // Check if session is expired
  const isSessionExpired = () => {
    if (!sessionContext) return true
    
    try {
      // This is a simplified implementation
      // In a real app, you would parse the session context and check the expiry
      const now = Math.floor(Date.now() / 1000)
      
      // Assuming the context contains an expiry field
      // This would need to be adjusted based on the actual structure
      // of the session context returned by grantPermissions
      const sessionData = JSON.parse(sessionContext)
      return sessionData.expiry && sessionData.expiry < now
    } catch (error) {
      console.error('Error checking session expiry:', error)
      return true
    }
  }

  // Request a new Smart Session
  const requestSmartSession = async () => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    if (hasActiveSession && !isSessionExpired()) {
      console.log('Using existing Smart Session')
      return { success: true, context: sessionContext }
    }

    setIsRequestingSession(true)

    try {
      // Check if the wallet supports Smart Sessions
      const provider = window.ethereum;
      if (!provider?.request) {
        throw new Error('No provider available');
      }

      // Check wallet capabilities first
    //   try {
    //     await provider.request({
    //       method: 'wallet_getCapabilities',
    //     });
    //   } catch (error) {
    //     console.warn('Wallet does not support capabilities check:', error);
    //     throw new Error('Your wallet does not support Smart Sessions. Please use a compatible wallet.');
    //   }

      // Create the Smart Session permission request
      const request = {
        expiry: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
        chainId: toHex(baseSepolia.id),
        address: address,
        signer: {
          type: 'keys',
          data: {
            keys: [{
              type: 'secp256k1',
              publicKey: address
            }]
          }
        },
        permissions: [{
          type: 'contract-call',
          data: {
            address: DEFAULT_NETWORK.contracts.mining,
            abi: [
              {
                inputs: [{ name: "nonce", type: "uint256" }],
                name: 'submitBlock',
                outputs: [],
                stateMutability: 'nonpayable',
                type: 'function'
              }
            ],
            functions: [{
              functionName: 'submitBlock'
            }]
          }
        }],
        policies: [{
          type: 'gas-price-cap',
          data: {
            maxGasPrice: '100000000000' // 100 gwei
          }
        }]
      };

      console.log('request', request);
      // Try to request permissions from the wallet
      const response = await grantPermissions(request);
      console.log('Smart Session granted:', response);
      
      // Store the session context
      saveSession(response.context);
      
      return { success: true, context: response.context };
    } catch (error) {
      console.error('Error requesting Smart Session:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to request Smart Session' 
      };
    } finally {
      setIsRequestingSession(false);
    }
  }

  // Function to execute a transaction using the Smart Session
  const executeWithSession = async (contractAddress, functionName, args) => {
    if (!hasActiveSession || !sessionContext) {
      throw new Error('No active Smart Session')
    }
    
    if (isSessionExpired()) {
      clearSession()
      throw new Error('Smart Session has expired')
    }
    
    // This is a placeholder for the actual implementation
    // In a real app, you would use the session context to execute
    // the transaction without user confirmation
    console.log(`Executing ${functionName} on ${contractAddress} with args:`, args)
    console.log('Using session context:', sessionContext)
    
    // Return a mock transaction result
    return {
      hash: '0x' + Math.random().toString(16).substring(2),
      wait: async () => ({ status: 1 })
    }
  }

  // Specific function for mining operations
  const submitMiningBlock = async (nonce) => {
    return executeWithSession(
      DEFAULT_NETWORK.contracts.mining,
      'submitBlock',
      [nonce]
    );
  }

  const value = {
    sessionContext,
    hasActiveSession,
    isRequestingSession,
    saveSession,
    clearSession,
    isSessionExpired,
    requestSmartSession,
    executeWithSession,
    submitMiningBlock
  }

  return (
    <SmartSessionContext.Provider value={value}>
      {children}
    </SmartSessionContext.Provider>
  )
} 