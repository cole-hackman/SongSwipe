type UndoToastProps = {
  message: string
}

export function UndoToast({ message }: UndoToastProps) {
  if (!message) return null
  return <div className="toast">{message}</div>
}
