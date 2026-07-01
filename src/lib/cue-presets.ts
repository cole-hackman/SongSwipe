import type { Cue, Track } from '@/lib/types'

export type CuePreset = { id: string; label: string; positionSec: number }

function barsToSeconds(bars: number, bpm: number | null): number {
  const effectiveBpm = bpm && bpm > 0 ? bpm : 120
  const beats = bars * 4
  return (beats / effectiveBpm) * 60
}

export function buildCuePresets(track: Track, cues: Cue[]): CuePreset[] {
  const bars32Sec = barsToSeconds(32, track.bpm)
  const bars64Sec = barsToSeconds(64, track.bpm)
  const outroStart = Math.max(0, track.durationSec - bars32Sec)

  return [
    { id: 'intro', label: 'Intro', positionSec: 0 },
    { id: 'bars32', label: '32 bars', positionSec: Math.min(bars32Sec, track.durationSec) },
    { id: 'bars64', label: '64 bars', positionSec: Math.min(bars64Sec, track.durationSec) },
    { id: 'outro', label: 'Outro', positionSec: outroStart },
  ]
}

export function getEffectivePresets(
  track: Track,
  cues: Cue[],
  smartCues: Cue[] | undefined,
  cuePlacementMode: 'presets' | 'smart'
): CuePreset[] {
  if (cuePlacementMode === 'smart' && smartCues && smartCues.length > 0) {
    return smartCues.map((cue, index) => ({
      id: `smart-${index}`,
      label: cue.name,
      positionSec: cue.positionSec,
    }))
  }
  return buildCuePresets(track, cues)
}
