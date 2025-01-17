'use client'
import styles from './Console.module.css'
import Image from 'next/image'

const ConsoleItem = ({icon, text, pill, error}) => {

    if(error){
        console.log("Mining error", error);
    }

    return (
        <div className={styles.item}>
            <div className={styles.itemContent}>
                <Image src={icon} alt={icon} width={20} height={20}/>
                <div className={styles.itemText}>
                    {text}
                </div>
                {pill && <div className={styles.pill}>{pill}</div>}
            </div>
        </div>
    )
}

export default ConsoleItem;