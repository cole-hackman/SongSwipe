type TransportBarProps = {
  isPlaying: boolean
  onTogglePlay: () => void
  children?: React.ReactNode
}

export function TransportBar({ isPlaying, onTogglePlay, children }: TransportBarProps) {
  return (
    <div className="transport-bar">
      <button type="button" className="btn" onClick={onTogglePlay}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      {children}
    </div>
  )
}
