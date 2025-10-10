import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { baseSepolia } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'Bohrium Mining',
  projectId: 'b95c18e2f7c838c9e3ef9ae47e7bf081',
  chains: [baseSepolia],
  ssr: true
})