import styles from './Instructions.module.css'
import Image from 'next/image';

const Instructions = () => {
    return (
        <div className={styles.area}>
            <div className={styles.title}>
                <h3>How to mine</h3>
            </div>
            <div className={styles.content}>
                <div className={styles.item}>
                    <div className={styles.number}>1.</div>
                    <div className={styles.itemContent}>
                        <Image src="/images/simple-wallet.png" alt="Wallet" width={24} height={24} className={styles.icon} />
                        <p>Connect wallet</p>
                    </div>
                </div>
                <div className={styles.item}>
                    <div className={styles.number}>2.</div>
                    <div className={styles.itemContent}>
                        <Image src="/images/sign.png" alt="Sign" width={24} height={24} className={styles.icon} />
                        <p>Open session wallet</p>
                    </div>
                </div>
                <div className={styles.item}>
                    <div className={styles.number}>3.</div>
                    <div className={styles.itemContent}>
                        <Image src="/images/deposit.png" alt="Deposit" width={24} height={24} className={styles.icon} />
                        <p>Fund session wallet</p>
                    </div>
                </div>
                <div className={styles.item}>
                    <div className={styles.number}>4.</div>
                    <div className={styles.itemContent}>
                        <Image src="/images/pickaxe.png" alt="Pickaxe" width={24} height={24} className={styles.icon} />
                        <p>Start mining</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Instructions;