import type { CuePreset } from '@/lib/cue-presets'

type SkipPresetButtonsProps = {
  presets: CuePreset[]
  onJump: (positionSec: number) => void
}

export function SkipPresetButtons({ presets, onJump }: SkipPresetButtonsProps) {
  return (
    <div className="cue-buttons">
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className="btn"
          onClick={() => onJump(preset.positionSec)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
