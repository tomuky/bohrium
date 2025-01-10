'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const WalletContext = createContext({})

export function WalletProvider({ children }) {
    const [balance, setBalance] = useState(0)
    const [address, setAddress] = useState(null)
    const [isConnected, setIsConnected] = useState(false)

    const connectWallet = async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                // Request account access
                const accounts = await window.ethereum.request({ 
                    method: 'eth_requestAccounts' 
                })
                setAddress(accounts[0])
                setIsConnected(true)
                await updateBalance(accounts[0])
            } catch (error) {
                console.error('Error connecting wallet:', error)
            }
        } else {
            console.error('Please install MetaMask!')
        }
    }

    const updateBalance = async (walletAddress) => {
        if (!walletAddress) return
        try {
            // This is a placeholder - you'll need to implement the actual
            // balance checking logic for your BOHR token contract
            const balance = await getBohrBalance(walletAddress)
            setBalance(balance)
        } catch (error) {
            console.error('Error fetching balance:', error)
        }
    }

    // Listen for account changes
    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    setAddress(accounts[0])
                    updateBalance(accounts[0])
                } else {
                    setAddress(null)
                    setBalance(0)
                    setIsConnected(false)
                }
            })
        }

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', () => {})
            }
        }
    }, [])

    return (
        <WalletContext.Provider value={{
            balance,
            address,
            isConnected,
            connectWallet,
            updateBalance
        }}>
            {children}
        </WalletContext.Provider>
    )
}

export const useWallet = () => useContext(WalletContext)

// Placeholder function - replace with actual implementation
async function getBohrBalance(address) {
    // You'll need to implement this function to:
    // 1. Connect to your BOHR token contract
    // 2. Call the balanceOf method
    // 3. Format the balance appropriately
    return 0
}