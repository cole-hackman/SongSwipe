import { useEffect } from 'react'

type UndoToastProps = {
  message: string
  onDismiss: () => void
}

export function UndoToast({ message, onDismiss }: UndoToastProps) {
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(onDismiss, 2200)
    return () => window.clearTimeout(timer)
  }, [message, onDismiss])

  if (!message) return null
  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  )
}
