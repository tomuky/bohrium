import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import styles from '../mine/page.module.css';

const ButtonConnectWallet = () => {
    const { isConnected } = useAccount();

    // Only show this button when wallet is not connected
    if (isConnected) {
        return null;
    }

    return (
        <div className={styles.connectWalletButton}>
            <ConnectButton.Custom>
                {({
                    account,
                    chain,
                    openAccountModal,
                    openChainModal,
                    openConnectModal,
                    mounted,
                }) => {
                    const ready = mounted;
                    const connected = ready && account && chain;

                    return (
                        <div
                            {...(!ready && {
                                'aria-hidden': true,
                                'style': {
                                    opacity: 0,
                                    pointerEvents: 'none',
                                    userSelect: 'none',
                                },
                            })}
                            onClick={openConnectModal}
                            style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            CONNECT WALLET
                        </div>
                    );
                }}
            </ConnectButton.Custom>
        </div>
    );
};

export default ButtonConnectWallet;
