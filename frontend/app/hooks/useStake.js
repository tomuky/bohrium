import { useState } from 'react';

export const useStake = () => {
    const [stakeStatus, setStakeStatus] = useState({
        isStaking: false,
        isStaked: false,
        txHash: ''
    });

    const resetStake = () => {
        setStakeStatus({
            isStaking: false,
            isStaked: false,
            txHash: ''
        });
    };

    return {
        stakeStatus,
        setStakeStatus,
        resetStake
    };
};
