import { useState } from 'react';

export const useTokenSelection = (initialToken = 'ETH') => {
    const [selectedToken, setSelectedToken] = useState(initialToken);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const handleTokenSelect = (token) => {
        setSelectedToken(token);
        setIsDropdownOpen(false);
    };

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    return {
        selectedToken,
        isDropdownOpen,
        handleTokenSelect,
        toggleDropdown,
        setSelectedToken
    };
};
