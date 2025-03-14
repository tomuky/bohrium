import styles from './Instructions.module.css'
import Image from 'next/image';

const InstructionsItem = ({number, icon, text, completed}) => {
    return (
        <div className={`${styles.item} ${completed ? styles.itemCompleted : ''}`}>
            <div className={styles.number}>{number}.</div>
            <div className={styles.itemContent}>
                <Image src={icon} alt={text} width={24} height={24} className={styles.icon} />
                <p>{text}</p>
            </div>
        </div>
    )
}

export default InstructionsItem;