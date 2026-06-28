import { useWaveform } from '@/audio/useWaveform'
import type { Cue } from '@/lib/types'

type WaveformPlayerProps = {
  media: HTMLAudioElement | null
  cues: Cue[]
}

export function WaveformPlayer({ media, cues }: WaveformPlayerProps) {
  const { containerRef } = useWaveform({ media, cues })

  return (
    <div className="waveform-wrap">
      <div ref={containerRef} />
    </div>
  )
}
