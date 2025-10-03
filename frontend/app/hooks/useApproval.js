import { useState, useEffect } from 'react';
import stakingService from '../services/stakingService';

export const useApproval = (amount, activeTab) => {
    const [approvalStatus, setApprovalStatus] = useState({
        isApproving: false,
        isApproved: false,
        txHash: '',
        checkingApproval: false
    });

    // Check for existing approval when amount changes in stake tab
    useEffect(() => {
        const checkApproval = async () => {
            if (activeTab === 'stake' && amount && Number(amount) > 0 && !approvalStatus.isApproving) {
                try {
                    setApprovalStatus(prev => ({ ...prev, checkingApproval: true }));
                    const hasApproval = await stakingService.checkApproval(amount);
                    setApprovalStatus({
                        isApproving: false,
                        isApproved: hasApproval,
                        txHash: '',
                        checkingApproval: false
                    });
                } catch (err) {
                    console.error("Error checking approval:", err);
                    setApprovalStatus({
                        isApproving: false,
                        isApproved: false,
                        txHash: '',
                        checkingApproval: false
                    });
                }
            }
        };

        checkApproval();
    }, [activeTab, amount]);

    const resetApproval = () => {
        setApprovalStatus({
            isApproving: false,
            isApproved: false,
            txHash: '',
            checkingApproval: false
        });
    };

    return {
        approvalStatus,
        setApprovalStatus,
        resetApproval
    };
};
