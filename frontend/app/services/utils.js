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