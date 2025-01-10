'use client'
import './globals.css'
import Header from './components/Header'
import { Providers } from './providers'
import LeftPane from './components/LeftPane'
import MainPane from './components/MainPane'
// import Menu from './components/Menu'
import { MiningProvider } from './contexts/MiningContext'

export default function RootLayout({ children }) {

  return (
    <html lang="en">
      <body>
        <Providers>
          <MiningProvider>
            <div className="container">
              <Header />
              {/* <Menu/> */}
              <div className="layout">
                <LeftPane/>
                <MainPane>
                  {children}
                </MainPane>
              </div>
            </div>
          </MiningProvider>
        </Providers>
      </body>
    </html>
  )
}