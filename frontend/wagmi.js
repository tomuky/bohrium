import { cookieStorage, createStorage } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { baseSepolia } from '@reown/appkit/networks'

export const projectId = 'b95c18e2f7c838c9e3ef9ae47e7bf081';

// export const config = getDefaultConfig({
//   appName: 'Bohrium Mining',
//   projectId: projectId,
//   chains: [baseSepolia],
//   ssr: true
// })

export const networks = [baseSepolia]

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks
})