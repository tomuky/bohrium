import { ethers } from 'ethers';
import { TOKEN_ABI } from './constants';
import { NETWORKS } from './config';

class SessionWalletService {
    constructor() {
        this.provider = null;
        this.mainWallet = null;
        this.sessionWallet = null;
    }

    async initializeForWithdrawal() {
        if (!window.ethereum) {
            throw new Error('MetaMask is not installed');
        }

        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.mainWallet = await this.provider.getSigner();
        
        // Generate session wallet using same deterministic approach as mining service
        const mainAddress = await this.mainWallet.getAddress();
        const signatureMessage = `This is a gasless signature to create a session key for Bohrium mining.\n\nWARNING: Only sign this message on the official Bohrium website. Signing this message on another website could expose your session keys to attackers.\n\nCheck our socials for offical links.\n\nWallet: ${mainAddress}`;
        
        const signedMessage = await this.mainWallet.signMessage(signatureMessage);
        const seed = ethers.keccak256(ethers.toUtf8Bytes(signedMessage));
        this.sessionWallet = new ethers.Wallet(seed, this.provider);
    }

    async withdrawETH(amount, toAddress) {
        if (!this.sessionWallet) {
            await this.initializeForWithdrawal();
        }

        const tx = await this.sessionWallet.sendTransaction({
            to: toAddress,
            value: amount
        });

        return tx;
    }

    async withdrawToken(tokenAddress, amount, toAddress) {
        if (!this.sessionWallet) {
            await this.initializeForWithdrawal();
        }

        const tokenContract = new ethers.Contract(
            tokenAddress,
            TOKEN_ABI,
            this.sessionWallet
        );

        const tx = await tokenContract.transfer(toAddress, amount);
        return tx;
    }
}

export const sessionWalletService = new SessionWalletService();