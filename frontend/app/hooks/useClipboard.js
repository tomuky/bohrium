import { useState } from 'react';

export const useClipboard = (duration = 2000) => {
    const [showCopied, setShowCopied] = useState(false);

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), duration);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    };

    return { showCopied, copyToClipboard };
};