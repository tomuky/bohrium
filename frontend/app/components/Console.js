'use client'
import styles from './Console.module.css'
import ConsoleItem from './ConsoleItem'
import { useMining } from '../contexts/MiningContext'
import ConsoleMiningItem from './ConsoleMiningItem'
import ConsoleRewardItem from './ConsoleRewardItem'
import { memo, useMemo } from 'react'

// Memoize the item renderer function
const ConsoleItemRenderer = memo(({ item, index, isLatestMining }) => {
    if(item.type === 'mining') {
        return <ConsoleMiningItem 
            key={`mining-${item.endTime}-${index}`}
            endTime={item.endTime}
            icon={item.icon}
            text={item.text}
            type={item.type}
            isLatest={isLatestMining}
        />
    } else if(item.type === 'nonce_found') {
        return <ConsoleRewardItem 
            key={`${item.timestamp}-${index}`}
            icon={item.icon}
            text={item.text}
            pill={item.pill}
            timestamp={item.timestamp}
        />
    } else {
        return <ConsoleItem
            key={`${item.timestamp}-${index}`}
            icon={item.icon}
            text={item.text}
            pill={item.pill}
            timestamp={item.timestamp}
        />
    }
});

ConsoleItemRenderer.displayName = 'ConsoleItemRenderer';

// Memoize the Console component
const Console = memo(() => {
    const { consoleItems } = useMining();

    // Find the latest mining item's endTime - memoized to prevent recalculation on every render
    const latestMiningEndTime = useMemo(() => {
        return consoleItems.reduce((latest, item) => {
            if (item.type === 'mining' && (!latest || item.endTime > latest)) {
                return item.endTime;
            }
            return latest;
        }, null);
    }, [consoleItems]);

    return (
        <div className={styles.list}>
            {[...consoleItems].map((item, index) => (
                <ConsoleItemRenderer 
                    key={`${item.type}-${index}`}
                    item={item}
                    index={index}
                    isLatestMining={item.type === 'mining' && item.endTime === latestMiningEndTime}
                />
            ))}
        </div>
    );
});

Console.displayName = 'Console';

export default Console;