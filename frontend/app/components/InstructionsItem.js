'use client'
import styles from './Instructions.module.css'
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

const InstructionsItem = ({number, icon, text, completed, help}) => {
    const [tooltipOpen, setTooltipOpen] = useState(false);
    const tooltipRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
                setTooltipOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className={`${styles.item} ${completed ? styles.itemCompleted : ''}`}>
            <div className={styles.number}>{number}.</div>
            <div className={styles.itemContent}>
                <Image src={icon} alt={text} width={24} height={24} className={styles.icon} />
                <p>{text}</p>
                {help && (
                  <div className={styles.tooltipContainer} ref={tooltipRef}>
                    <img 
                      src="/images/question-mark.png" 
                      alt="Help" 
                      className={styles.tooltipIcon} 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTooltipOpen(!tooltipOpen);
                      }}
                    />
                    <div className={`${styles.tooltipText} ${tooltipOpen ? styles.showTooltip : ''}`}>
                      {help}
                    </div>
                  </div>
                )}
            </div>
        </div>
    )
}

export default InstructionsItem;