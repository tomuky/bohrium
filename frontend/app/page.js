'use client'
import Link from 'next/link'
import styles from './splash.module.css'
import Image from 'next/image'

export default function Home() {
  return (
    <div className={styles.splashContainer}>
      <nav className={styles.topNav}>
        <div className={styles.logo}>
          <Image 
            src="/images/bohr.png" 
            alt="Bohrium Logo" 
            width={36} 
            height={36} 
            style={{ marginRight: '6px' }}
          />
          BOHRIUM
        </div>
        <div className={styles.socialLinks}>
          <Link href="https://x.com/bohrsupply" target="_blank">
            <Image src="/images/x.png" alt="X" width={24} height={24} style={{ filter: 'invert(1)' }}/> 
          </Link>
          <Link href="https://discord.gg/xyZW4Ck36V" target="_blank">
            <Image src="/images/discord.png" alt="Discord" width={30} height={24}/>
          </Link>
          <Link href="https://github.com/tomuky/bohrium" target="_blank">
            <Image src="/images/github.png" alt="GitHub" width={24} height={24} style={{ filter: 'invert(1)' }}/>
          </Link>
        </div>
      </nav>

      <div className={styles.mainContent}>
        <h1>Do the work. Earn BOHR.</h1>
        <p>BOHR is the first proof-of-work token on Base</p>
        <Link href="/mine">
          <button 
            className={styles.startButton} 
            disabled={true}
          >
            COMING SOON
          </button>
        </Link>
      </div>

      <video 
        autoPlay 
        muted 
        loop 
        playsInline
        className={styles.backgroundVideo}
      >
        <source src="/videos/blob-orb.mp4" type="video/mp4" />
      </video>
    </div>
  )
}