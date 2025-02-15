'use client'
import styles from './Console.module.css'
import ConsoleItem from './ConsoleItem'
import { useMining } from '../contexts/MiningContext'
import ConsoleMiningItem from './ConsoleMiningItem'
import ConsoleRainbowItem from './ConsoleRainbowItem'
import { memo } from 'react'

// Memoize the item renderer function
const ConsoleItemRenderer = memo(({ item, index }) => {
    if(item.type === 'mining') {
        return <ConsoleMiningItem 
            key={`mining-${item.endTime}-${index}`}
            endTime={item.endTime}
            icon={item.icon}
            text={item.text}
            type={item.type}
            timestamp={item.timestamp}
        />
    } else if(item.type === 'nonce_found') {
        return <ConsoleRainbowItem 
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

    return (
        <div className={styles.list}>
            {[...consoleItems].map((item, index) => (
                <ConsoleItemRenderer 
                    key={`${item.type}-${index}`}
                    item={item}
                    index={index}
                />
            ))}
        </div>
    );
});

Console.displayName = 'Console';

export default Console;