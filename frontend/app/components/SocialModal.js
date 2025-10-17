'use client';
import { useState } from 'react';
import styles from './Modal.module.css';
import Image from 'next/image';
import Link from 'next/link';

const SocialModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Connect with us</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <Image src="/images/close.png" alt="Close" width={16} height={16} />
                    </button>
                </div>
                
                <div className={styles.modalBody}>
                    <div className={styles.socialLinks}>
                        <Link 
                            href="https://discord.gg/xyZW4Ck36V" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={styles.socialLink}
                            title="Discord"
                        >
                            <Image src="/images/discord.png" alt="Discord" width={42} height={32} />
                        </Link>
                        
                        <Link 
                            href="https://github.com/tomuky/bohrium" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={styles.socialLink}
                            title="GitHub"
                        >
                            <Image src="/images/github.png" alt="Github" width={32} height={32} />
                        </Link>
                        
                        <Link 
                            href="https://x.com/bohrsupply" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={styles.socialLink}
                            title="X (Twitter)"
                        >
                            <Image src="/images/x.png" alt="Twitter" width={32} height={32} />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocialModal;
