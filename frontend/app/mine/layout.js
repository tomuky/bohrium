'use client'
import Header from '../components/Header'
import LeftPane from '../components/LeftPane'
import MainPane from '../components/MainPane'

export default function MineLayout({ children }) {
  return (
    <div className="container">
      <Header />
      <div className="layout">
        <LeftPane />
        <MainPane>
          {children}
        </MainPane>
      </div>
    </div>
  )
}
