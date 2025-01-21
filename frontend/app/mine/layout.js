'use client'
import { useState, useEffect } from 'react'
import Header from '../components/Header'
import LeftPane from '../components/LeftPane'
import MainPane from '../components/MainPane'

export default function MineLayout({ children }) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // Common breakpoint for mobile devices
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isMobile) {
    return (
        <div className="container">
            <Header/>
            <div className="desktopOnlyMessage">Using your browser to mine BOHR is only available on desktop</div>
            <div className="social-links">
                <a href="https://x.com/bohrsupply" target="_blank" rel="noopener noreferrer" className="social-link">
                    <img src="images/x.png" alt="X (Twitter) Logo" className="social-icon" />
                    Follow
                </a>
                <a href="https://github.com/tomuky/bohrium" target="_blank" rel="noopener noreferrer" className="social-link">
                    <img src="images/github.png" alt="GitHub Logo" className="social-icon" />
                    Contribute
                </a>
            </div>
        </div>
    )
  }

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
