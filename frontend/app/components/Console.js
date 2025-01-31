'use client'
import styles from './Console.module.css'
import ConsoleItem from './ConsoleItem'
import { useMining } from '../contexts/MiningContext'
import NewRound from './ConsoleNewRound'
import ConsoleMiningItem from './ConsoleMiningItem'
import ConsoleTransactionItem from './ConsoleTransactionItem'
import ConsoleWaiting from './ConsoleWaiting'
import { memo } from 'react'

// Memoize the item renderer function
const ConsoleItemRenderer = memo(({ item, index }) => {
    if(item.type === 'round_start') {
        return <NewRound 
            key={`${item.roundId}-${index}`}
            roundId={item.roundId} 
        />
    } else if(item.type === 'mining') {
        return <ConsoleMiningItem 
            key={`mining-${item.endTime}-${index}`}
            endTime={item.endTime}
            icon={item.icon}
            text={item.text}
        />
    } else if(item.type === 'waiting') {
        return <ConsoleWaiting 
            key={`waiting-${item.endTime}-${index}`}
            text={item.text}
            endTime={item.endTime}
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

// Memoize the entire Console component
const Console = memo(() => {
    const { consoleItems } = useMining();

    return (
        <div className={styles.list}>
            {[...consoleItems].reverse().map((item, index) => (
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