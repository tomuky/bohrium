'use client'
import styles from './page.module.css'
import Console from '../components/Console';
import Instructions from '../components/Instructions';
import ButtonOpenSession from '../components/ButtonOpenSession';
import ButtonFundSession from '../components/ButtonFundSession';
import ButtonDelegateSession from '../components/ButtonDelegateSession';
import ButtonMining from '../components/ButtonMining';

const Mine = () => {    

    return (
        <div className={styles.console}>
            <div className={styles.buttonContainer}>

                <ButtonOpenSession/>

                <ButtonFundSession/>

                <ButtonDelegateSession/>

                <ButtonMining/>

            </div>

            <Console/>

            <Instructions/>
            
        </div>
    )
}

export default Mine;