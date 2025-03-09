
import { MiningProvider } from './contexts/MiningContext'
import { SessionWalletProvider } from './contexts/SessionWalletContext'
import { SmartSessionProvider } from './contexts/SmartSessionContext'
import { headers } from 'next/headers'
import ContextProvider from '../ContextProvider'

export async function Providers({ children }) {

  const headersObj = await headers();
  const cookies = headersObj.get('cookie')

  return (
    <ContextProvider cookies={cookies}>
      <SmartSessionProvider>
        <SessionWalletProvider>
          <MiningProvider>
            {children}
          </MiningProvider>
        </SessionWalletProvider>
      </SmartSessionProvider>
    </ContextProvider>
  )
}