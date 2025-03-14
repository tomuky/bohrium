import { useAccount } from 'wagmi';
import { useSessionWallet } from '../contexts/SessionWalletContext';
import styles from '../mine/page.module.css';
import { useMining } from '../contexts/MiningContext';

const ButtonDelegateSession = () => {
    const { isConnected } = useAccount();
    const { setDelegation, isDelegationLoading, hasSessionWallet, isDelegated } = useSessionWallet();
    const { isMining } = useMining();

    if(hasSessionWallet && !isDelegated && !isMining){
        return (
            <div 
                className={`${styles.startMiningButton} ${!isConnected || isDelegationLoading ? styles.disabled : ''}`} 
                onClick={() => isConnected && !isDelegationLoading && setDelegation()}
            >
                {isDelegationLoading ? 'DELEGATING...' : 'DELEGATE SESSION WALLET'}
            </div>
        )
    }
}

export default ButtonDelegateSession;