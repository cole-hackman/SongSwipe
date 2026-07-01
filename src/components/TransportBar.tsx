type TransportBarProps = {
  isPlaying: boolean
  currentSec: number
  durationSec: number
  onTogglePlay: () => void
  onSeek: (seconds: number) => void
  children?: React.ReactNode
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function TransportBar({
  isPlaying,
  currentSec,
  durationSec,
  onTogglePlay,
  onSeek,
  children,
}: TransportBarProps) {
  const max = Math.max(durationSec, 0.01)

  return (
    <div className="transport-bar">
      <div className="transport-bar__left">
        <button type="button" className="btn" onClick={onTogglePlay}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <span className="transport-time">{formatTime(currentSec)}</span>
      </div>
      <div className="transport-bar__seek">
        <input
          className="transport-seek"
          type="range"
          min={0}
          max={max}
          step={0.1}
          value={Math.min(currentSec, max)}
          onChange={(event) => onSeek(Number(event.target.value))}
          aria-label="Seek"
        />
        <span className="transport-time">{formatTime(durationSec)}</span>
      </div>
      <div className="transport-bar__actions">{children}</div>
    </div>
  )
}
