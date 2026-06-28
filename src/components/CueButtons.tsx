import type { Cue } from '@/lib/types'

type CueButtonsProps = {
  cues: Cue[]
  onJump: (positionSec: number) => void
}

export function CueButtons({ cues, onJump }: CueButtonsProps) {
  if (!cues.length) {
    return <div className="top-bar__meta">No hot cues on this track</div>
  }

  return (
    <div className="cue-buttons">
      {cues.map((cue, index) => (
        <button
          key={`${cue.name}-${cue.positionSec}-${index}`}
          type="button"
          className="btn"
          onClick={() => onJump(cue.positionSec)}
        >
          {cue.name || `Cue ${index + 1}`}
        </button>
      ))}
    </div>
  )
}
