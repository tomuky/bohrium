const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const os = require("os");
const inquirer = require("inquirer");

const WALLET_DIR = path.join(os.homedir(), '.bohrium');
const WALLET_PATH = path.join(WALLET_DIR, 'wallet.json');

function ensureWalletDir() {
    if (!fs.existsSync(WALLET_DIR)) {
        fs.mkdirSync(WALLET_DIR, { recursive: true });
    }
}

async function createWallet() {
    ensureWalletDir();
    
    // Generate new wallet
    const wallet = ethers.Wallet.createRandom();
    
    // Get password from user
    const { password } = await inquirer.prompt([
        {
            type: 'password',
            name: 'password',
            message: 'Enter a password to encrypt your wallet:',
            validate: input => input.length >= 8 || 'Password must be at least 8 characters'
        }
    ]);

    // Encrypt the wallet
    const encryptedWallet = await wallet.encrypt(password);
    
    // Save only the encrypted keystore and address
    const walletData = {
        address: wallet.address,
        keystore: encryptedWallet
    };
    
    fs.writeFileSync(WALLET_PATH, JSON.stringify(walletData, null, 2));
    
    // Return the sensitive data for one-time display
    return {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic.phrase
    };
}

function getWallet() {
    if (!fs.existsSync(WALLET_PATH)) {
        return null;
    }
    const data = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf8'));
    return { address: data.address };
}

module.exports = {
    createWallet,
    getWallet
};