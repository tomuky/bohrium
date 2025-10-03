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

export function formatElapsedTime(seconds) {
    if (seconds === 0) return '0s'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`
    } else {
        return `${secs}s`
    }
}