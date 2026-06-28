import type { SessionMode } from '@/lib/types'

type ModeSwitcherProps = {
  mode: SessionMode
  onChange: (mode: SessionMode) => void
}

const MODES: Array<{ id: SessionMode; label: string }> = [
  { id: 'triage', label: 'Triage' },
  { id: 'audit', label: 'Audit' },
  { id: 'compare', label: 'Compare' },
]

export function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  return (
    <div className="mode-switcher">
      {MODES.map((item) => (
        <button
          key={item.id}
          type="button"
          className={item.id === mode ? 'btn btn--primary' : 'btn'}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
