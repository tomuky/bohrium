import styles from './Console.module.css'

const NewRound = ({roundId}) => {
    return (
        <div className={styles.newRound}>
            Round {roundId}
        </div>
    )
}

export default NewRound;