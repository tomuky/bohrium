'use client'
import Header from '../components/Header'
import LeftPane from '../components/LeftPane'
import MainPane from '../components/MainPane'
import { MiningProvider } from '../contexts/MiningContext'

export default function MineLayout({ children }) {
  return (
    <MiningProvider>
      <div className="container">
        <Header />
        <div className="layout">
          <LeftPane />
          <MainPane>
            {children}
          </MainPane>
        </div>
      </div>
    </MiningProvider>
  )
}
