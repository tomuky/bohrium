'use client'
import { useEffect, useRef, useState } from 'react'

export default function MiningConsole({ logs }) {
  const consoleEndRef = useRef(null)

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
      {logs.map((log, index) => (
        <div key={index} className="whitespace-pre-wrap">
          {log}
        </div>
      ))}
      <div ref={consoleEndRef} />
    </div>
  )
}