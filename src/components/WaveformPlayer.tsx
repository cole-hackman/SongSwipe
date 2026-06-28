import { useWaveform } from '@/audio/useWaveform'
import type { BeatMarker, Cue } from '@/lib/types'

type WaveformPlayerProps = {
  media: HTMLAudioElement | null
  filePath: string
  cues: Cue[]
  beatgrid?: BeatMarker[]
  barWidth?: number
  normalize?: boolean
  fastMode?: boolean
}

export function WaveformPlayer({
  media,
  filePath,
  cues,
  beatgrid,
  barWidth,
  normalize,
  fastMode,
}: WaveformPlayerProps) {
  const { containerRef } = useWaveform({
    media,
    filePath,
    cues,
    beatgrid,
    barWidth,
    normalize,
    fastMode,
  })

  return (
    <div className="waveform-wrap">
      <div ref={containerRef} />
    </div>
  )
}
