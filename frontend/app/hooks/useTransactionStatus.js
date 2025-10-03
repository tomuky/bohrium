import { useState } from 'react';

export const useTransactionStatus = () => {
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const resetStatus = () => {
        setError('');
        setTxHash('');
        setSuccessMessage('');
        setLoading(false);
    };

    const setSuccess = (message, hash = '') => {
        setSuccessMessage(message);
        setTxHash(hash);
        setError('');
    };

    const setErrorState = (errorMessage) => {
        setError(errorMessage);
        setSuccessMessage('');
        setTxHash('');
    };

    const handleUserRejectedError = (err) => {
        if (err.code === 4001 || err.message?.includes('user rejected')) {
            setErrorState('User rejected action');
        } else {
            setErrorState('Transaction failed');
        }
        console.error('Transaction error:', err);
    };

    return {
        error,
        txHash,
        successMessage,
        loading,
        setError,
        setTxHash,
        setSuccessMessage,
        setLoading,
        resetStatus,
        setSuccess,
        setErrorState,
        handleUserRejectedError
    };
};