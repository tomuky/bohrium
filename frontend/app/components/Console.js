'use client'
import styles from './Console.module.css'
import ConsoleItem from './ConsoleItem'
import { useMining } from '../contexts/MiningContext'
import NewRound from './ConsoleNewRound'
import ConsoleMiningItem from './ConsoleMiningItem'
import ConsoleTransactionItem from './ConsoleTransactionItem'
import ConsoleWaiting from './ConsoleWaiting'

const Console = () => {
    const { consoleItems } = useMining();

    return (
        <div className={styles.list}>
            {[...consoleItems].reverse().map((item, index) => {

                if(item.type==='round_start') {
                    return <NewRound roundId={item.roundId} />
                }else if(item.type==='mining'){
                    return <ConsoleMiningItem 
                        endTime={item.endTime}
                        icon={item.icon}
                        text={item.text}
                    />
                }else if(item.type==='waiting'){
                    return <ConsoleWaiting 
                        text={item.text}
                        endTime={item.endTime}
                    />
                }else if(item.type==='transaction'){
                    return <ConsoleTransactionItem 
                        text={item.text}
                        transactionHash={item.transactionHash}
                    />  
                }else{
                    return <ConsoleItem
                        key={`${item.timestamp}-${index}`}
                        icon={item.icon}
                        text={item.text}
                        pill={item.pill}
                        error={item.error}
                        timestamp={item.timestamp}
                    />
                }
                
            })}
        </div>
    );
}

export default Console;