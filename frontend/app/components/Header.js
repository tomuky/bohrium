'use client'
import { useState } from 'react'
import styles from './Header.module.css'    
import { ConnectButton } from '@rainbow-me/rainbowkit'
import Image from 'next/image'
import SocialModal from './SocialModal'
import { useAccount } from 'wagmi';

const Header = () => {
    const [isSocialModalOpen, setIsSocialModalOpen] = useState(false)
    const { isConnected } = useAccount();
    
    const handleSocialClick = () => {
        setIsSocialModalOpen(true)
    }

    const handleCloseSocialModal = () => {
        setIsSocialModalOpen(false)
    }

    return (
        <>
            <div className={styles.header}>
                <div className={styles.left}>
                    <Image src="/images/bohr.png" alt="BOHRIUM" width={40} height={40} className={styles.logo}/>
                    <h1 className={styles.title}>BOHRIUM</h1>
                </div>
                <div className={styles.right}>
                    <button 
                        className={styles.socialButton}
                        onClick={handleSocialClick}
                        aria-label="Social links"
                    >
                        <Image 
                            src="/images/socials.png" 
                            alt="Social links" 
                            width={24} 
                            height={24} 
                            className={styles.socialIcon}
                        />
                    </button>
                    {isConnected && <ConnectButton chainStatus="full" accountStatus="address" showBalance={false}/>}
                </div>
            </div>
            <SocialModal 
                isOpen={isSocialModalOpen} 
                onClose={handleCloseSocialModal} 
            />
        </>
    )
}

export default Header