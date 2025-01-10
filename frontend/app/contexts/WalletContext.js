'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'

const WalletContext = createContext({})

const BOHR_CONTRACT_ADDRESS = "0x85dF140E5dC19e49D3866Bb4632387f2FDd04a34"
const BOHR_ABI = [
    // Standard ERC20 balanceOf function
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)"
]

export function WalletProvider({ children }) {
    const [address, setAddress] = useState(null)
    const [isConnected, setIsConnected] = useState(false)

    const connectWallet = async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ 
                    method: 'eth_requestAccounts' 
                })
                setAddress(accounts[0])
                setIsConnected(true)
            } catch (error) {
                console.error('Error connecting wallet:', error)
            }
        } else {
            console.error('Please install MetaMask!')
        }
    }

    // Listen for account changes
    useEffect(() => {
        if (window.ethereum) {
            const handleAccountsChanged = (accounts) => {
                if (accounts.length > 0) {
                    setAddress(accounts[0])
                } else {
                    setAddress(null)
                    setIsConnected(false)
                }
            }

            window.ethereum.on('accountsChanged', handleAccountsChanged)

            return () => {
                if (window.ethereum) {
                    window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
                }
            }
        }
    }, [])

    return (
        <WalletContext.Provider value={{
            address,
            isConnected,
            connectWallet
        }}>
            {children}
        </WalletContext.Provider>
    )
}

export const useWallet = () => useContext(WalletContext)