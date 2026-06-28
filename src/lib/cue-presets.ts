import type { Cue, Track } from '@/lib/types'

export type CuePreset = { id: string; label: string; positionSec: number }

function barsToSeconds(bars: number, bpm: number | null): number {
  const effectiveBpm = bpm && bpm > 0 ? bpm : 120
  const beats = bars * 4
  return (beats / effectiveBpm) * 60
}

export function buildCuePresets(track: Track, cues: Cue[]): CuePreset[] {
  const bars32Sec = barsToSeconds(32, track.bpm)
  const dropCue = cues.find((c) => /drop/i.test(c.name)) ?? cues[0]
  const outroStart = Math.max(0, track.durationSec - bars32Sec)

  return [
    { id: 'intro', label: 'Intro', positionSec: 0 },
    { id: 'bars32', label: '32 bars', positionSec: Math.min(bars32Sec, track.durationSec) },
    { id: 'drop', label: 'Drop', positionSec: dropCue?.positionSec ?? bars32Sec },
    { id: 'outro', label: 'Outro', positionSec: outroStart },
  ]
}
