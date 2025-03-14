import styles from './Instructions.module.css'
import InstructionsItem from './InstructionsItem';
import { useAccount } from 'wagmi';
import { useSessionWallet } from '../contexts/SessionWalletContext'

const Instructions = () => {
    const {isConnected} = useAccount();
    const {
        data: sessionBalance, 
        hasSessionWallet, 
        isDelegated, 
        sessionHasEth 
    } = useSessionWallet();

    if(!hasSessionWallet || !sessionHasEth || !isDelegated){
        return (
            <div className={styles.area}>
                <div className={styles.title}>
                    <h3>How to mine</h3>
                </div>
                <div className={styles.content}>
                    <InstructionsItem number="1" icon="/images/simple-wallet.png" text="Connect wallet" completed={isConnected}/>
                    <InstructionsItem number="2" icon="/images/bolt.png" text="Open session wallet" completed={hasSessionWallet}/>
                    <InstructionsItem number="3" icon="/images/delegate2.png" text="Delegate session wallet" completed={isDelegated}/>
                    <InstructionsItem number="4" icon="/images/dollar-sign.png" text="Fund session wallet" completed={sessionBalance > 0}/>
                    <InstructionsItem number="5" icon="/images/pickaxe.png" text="Start mining" completed={false}/>
                </div>
            </div>
        )
    }
}

export default Instructions;