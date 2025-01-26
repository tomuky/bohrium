import styles from './Instructions.module.css'

const Instructions = () => {
    return (
        <div className={styles.area}>
            <div className={styles.title}>
                <h2>How to mine</h2>
            </div>
            <div className={styles.content}>
                <p>1. Connect your wallet</p>
                <p>2. Create a miner</p>
                <p>3. Start mining</p>
            </div>
        </div>
    )
}

export default Instructions;