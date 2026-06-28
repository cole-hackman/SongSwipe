import { useEffect, useState } from 'react'
import { rb } from '@/lib/ipc'

export function RekordboxStatus() {
  const [running, setRunning] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    async function poll() {
      try {
        const value = await rb<boolean>('is_rekordbox_running')
        if (active) setRunning(value)
      } catch {
        if (active) setRunning(null)
      }
    }
    void poll()
    const id = window.setInterval(() => void poll(), 5000)
    return () => {
      active = false
      window.clearInterval(id)
    }
  }, [])

  if (running === null) return null

  return (
    <span className={`rb-status ${running ? 'rb-status--open' : 'rb-status--closed'}`}>
      {running ? 'Rekordbox open' : 'Rekordbox closed'}
    </span>
  )
}
