'use client'
import { createContext, useContext, useState } from 'react';

const MiningContext = createContext();

export function MiningProvider({ children }) {
    const [isMining, setIsMining] = useState(false);

    return (
        <MiningContext.Provider value={{ isMining, setIsMining }}>
            {children}
        </MiningContext.Provider>
    );
}

export function useMining() {
    const context = useContext(MiningContext);
    if (context === undefined) {
        throw new Error('useMining must be used within a MiningProvider');
    }
    return context;
}