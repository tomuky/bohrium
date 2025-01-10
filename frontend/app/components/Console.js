import styles from './Console.module.css'
import ConsoleItem from './ConsoleItem'

const Console = () => {
    return (
        <div className={styles.list}>
            <ConsoleItem icon="/images/start.png" text="Mining started" timestamp="2025-01-09 17:07:40"/>
            <ConsoleItem icon="/images/round.png" text="Round 78 started" timestamp="2025-01-09 17:07:45"/>
            <ConsoleItem icon="/images/pickaxe.png" text="Mining for best nonce" timestamp="2025-01-09 17:07:48"/>
            <ConsoleItem icon="/images/wand.png" text="Best nonce found" pill="74981" timestamp="2025-01-09 17:07:52"/>
            <ConsoleItem icon="/images/end.png" text="Round 78 ended" timestamp="2025-01-09 17:07:55"/>
            <ConsoleItem icon="/images/coins.png" text="BOHR: 140" pill="+10 BOHR" timestamp="2025-01-09 17:07:57"/>
            <ConsoleItem icon="/images/stop.png" text="Mining stopped" timestamp="2025-01-09 17:08:00"/>
            <ConsoleItem icon="/images/send.png" text="Submitting best nonce" timestamp="2025-01-09 17:08:00"/>
            <ConsoleItem icon="/images/check.png" text="Transaction confirmed" timestamp="2025-01-09 17:08:00"/>
            <ConsoleItem icon="/images/wait.png" text="Waiting for next round" timestamp="2025-01-09 17:08:00"/>

            <ConsoleItem icon="/images/pickaxe.png" text="Mining for best nonce" timestamp="2025-01-09 17:07:48"/>
            <ConsoleItem icon="/images/wand.png" text="Best nonce found" pill="74981" timestamp="2025-01-09 17:07:52"/>
            <ConsoleItem icon="/images/end.png" text="Round 78 ended" timestamp="2025-01-09 17:07:55"/>
            <ConsoleItem icon="/images/coins.png" text="BOHR: 140" pill="+10 BOHR" timestamp="2025-01-09 17:07:57"/>
            <ConsoleItem icon="/images/stop.png" text="Mining stopped" timestamp="2025-01-09 17:08:00"/>
            <ConsoleItem icon="/images/send.png" text="Submitting best nonce" timestamp="2025-01-09 17:08:00"/>
            <ConsoleItem icon="/images/check.png" text="Transaction confirmed" timestamp="2025-01-09 17:08:00"/>
            <ConsoleItem icon="/images/wait.png" text="Waiting for next round" timestamp="2025-01-09 17:08:00"/>
        </div>
    )
}

export default Console;