import { useMemo } from 'react'
import { useWaveform } from '@/audio/useWaveform'
import type { CuePreset } from '@/lib/cue-presets'
import type { BeatMarker, Cue } from '@/lib/types'
import { buildWaveformMarkers, type WaveformMarker } from '@/lib/waveform-markers'

type WaveformPlayerProps = {
  media: HTMLAudioElement | null
  filePath: string
  cues: Cue[]
  durationSec: number
  beatgrid?: BeatMarker[]
  presets?: CuePreset[]
  barWidth?: number
  normalize?: boolean
  fastMode?: boolean
  className?: string
  height?: number
  onSeek?: (seconds: number) => void
}

export function WaveformPlayer({
  media,
  filePath,
  cues,
  durationSec,
  beatgrid,
  presets,
  barWidth,
  normalize,
  fastMode,
  className,
  height,
  onSeek,
}: WaveformPlayerProps) {
  const markers = useMemo(
    () => buildWaveformMarkers(cues, presets ?? [], durationSec),
    [cues, presets, durationSec],
  )
  const { containerRef } = useWaveform({
    media,
    filePath,
    markers,
    beatgrid,
    barWidth,
    normalize,
    fastMode,
    height,
    onSeek,
  })

  return (
    <div className={className ? `waveform-shell ${className}` : 'waveform-shell'}>
      <WaveformMarkerStrip markers={markers} durationSec={durationSec} onSeek={onSeek} />
      <div className="waveform-wrap">
        <div ref={containerRef} />
      </div>
    </div>
  )
}

type WaveformMarkerStripProps = {
  markers: WaveformMarker[]
  durationSec: number
  onSeek?: (seconds: number) => void
}

function WaveformMarkerStrip({ markers, durationSec, onSeek }: WaveformMarkerStripProps) {
  if (!markers.length || durationSec <= 0) return <div className="waveform-markers" aria-hidden="true" />
  return (
    <div className="waveform-markers" role="group" aria-label="Track sections">
      {markers.map((marker) => {
        const pct = Math.max(0, Math.min(100, (marker.positionSec / durationSec) * 100))
        return (
          <button
            key={marker.id}
            type="button"
            className={`waveform-marker waveform-marker--${marker.kind}`}
            style={{
              left: `${pct}%`,
              ['--marker-color' as any]: marker.color,
            } as React.CSSProperties}
            title={`Jump to ${marker.label}`}
            onClick={() => onSeek?.(marker.positionSec)}
          >
            {marker.label}
          </button>
        )
      })}
    </div>
  )
}
