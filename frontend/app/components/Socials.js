import styles from './Socials.module.css'
import Image from 'next/image'
import Link from 'next/link'

const Socials = () => {
    return (
        <div className={`${styles.area} ${styles.desktopOnly}`}>
            <div className={styles.item}>
                <Link href="https://discord.gg/xyZW4Ck36V">
                    <Image src="/images/discord.png" alt="Discord" width={30} height={24} className={styles.icon} />
                </Link>
            </div>
            <div className={styles.item}>
                <Link href="https://github.com/tomuky/bohrium">
                    <Image src="/images/github.png" alt="Github" width={24} height={24} className={styles.icon} />
                </Link>
            </div>
            <div className={styles.item}>
                <Link href="https://x.com/bohrsupply">
                    <Image src="/images/x.png" alt="Twitter" width={24} height={24} className={styles.icon} />
                </Link>
            </div>
        </div>
    )
}

export default Socials;