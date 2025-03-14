'use client'
import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { baseSepolia, base } from 'wagmi/chains'
import { MiningProvider } from './contexts/MiningContext'
import { SessionWalletProvider } from './contexts/SessionWalletContext'

const config = getDefaultConfig({
  appName: 'Bohrium',
  projectId: 'b95c18e2f7c838c9e3ef9ae47e7bf081',
  chains: [baseSepolia],
  ssr: true
})

const queryClient = new QueryClient()

export function Providers({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          <SessionWalletProvider>
            <MiningProvider>
              {children}
            </MiningProvider>
          </SessionWalletProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}