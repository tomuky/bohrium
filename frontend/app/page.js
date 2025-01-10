'use client'
import Link from 'next/link'
import styles from './splash.module.css'
import Image from 'next/image'

export default function Home() {
  return (
    <div className={styles.splashContainer}>
      <nav className={styles.topNav}>
        <div className={styles.logo}>BOHRIUM</div>
        <div className={styles.socialLinks}>
          <Link href="https://x.com/BohriumMining" target="_blank">
            <Image src="/images/x.png" alt="X" width={28} height={28} style={{ filter: 'invert(1)' }}/> 
          </Link>
          <Link href="https://github.com/tomuky/bohrium" target="_blank">
            <Image src="/images/github.png" alt="GitHub" width={28} height={28} style={{ filter: 'invert(1)' }}/>
          </Link>
        </div>
      </nav>

      <div className={styles.mainContent}>
        <h1>Do the work. Earn BOHR.</h1>
        <p>BOHR is the first PoW token on Base</p>
        <Link href="/mine">
          <button className={styles.startButton}>
            START MINING
          </button>
        </Link>
      </div>

      <video autoPlay muted loop className={styles.backgroundVideo}>
        <source src="/videos/blue-static.mp4" type="video/mp4" />
      </video>
    </div>
  )
}