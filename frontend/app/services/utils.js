import { ethers } from 'ethers';

export const formatBalance = async (balance) => {
    return ethers.formatEther(balance);
};

export const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const getCurrentTimestamp = () => {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
};

export function formatAddress(address) {
    if (!address) return ''
    return `${address.slice(0, 5)}...${address.slice(-3)}`
}

export function formatHashRate(hashesPerSecond) {
    if (hashesPerSecond === 0) return '0 H/s'
    
    const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s']
    const k = 1000
    const i = Math.floor(Math.log(hashesPerSecond) / Math.log(k))
    
    return `${(hashesPerSecond / Math.pow(k, i)).toFixed(2)} ${units[i]}`
}