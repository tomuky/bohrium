import { useState, useEffect } from 'react'

export const useTimeAgo = (timestamp) => {
    const [timeAgo, setTimeAgo] = useState('')

    useEffect(() => {
        const updateTimeAgo = () => {
            const now = new Date()
            const timestampDate = new Date(timestamp.replace(' ', 'T'))
            const milliseconds = now.getTime() - timestampDate.getTime()
            const seconds = Math.floor(milliseconds / 1000)
            
            if (seconds < 60) {
                setTimeAgo(`${seconds}s ago`)
            } else if (seconds < 3600) {
                setTimeAgo(`${Math.floor(seconds / 60)}m ago`)
            } else if (seconds < 86400) {
                setTimeAgo(`${Math.floor(seconds / 3600)}h ago`)
            } else {
                setTimeAgo(`${Math.floor(seconds / 86400)}d ago`)
            }
        }

        updateTimeAgo()
        const interval = setInterval(updateTimeAgo, 1000)
        
        return () => clearInterval(interval)
    }, [timestamp])

    return timeAgo
}