import type { CuePreset } from '@/lib/cue-presets'
import type { Cue } from '@/lib/types'

export type WaveformMarkerKind = 'intro' | 'drop' | 'bars32' | 'bars64' | 'outro' | 'cue'

export type WaveformMarker = {
  id: string
  label: string
  kind: WaveformMarkerKind
  color: string
  positionSec: number
}

const KIND_PRIORITY: Record<WaveformMarkerKind, number> = {
  intro: 6,
  drop: 5,
  bars64: 4,
  bars32: 3,
  outro: 2,
  cue: 1,
}

export const MARKER_COLORS: Record<WaveformMarkerKind, string> = {
  intro: '#60a5fa',
  drop: '#fb7185',
  bars64: '#ec4899',
  bars32: '#a78bfa',
  outro: '#9aa7af',
  cue: '#fbbf24',
}

const DEFAULT_CLUSTER_SECONDS = 2

/**
 * Combine preset markers (intro/32 bars/64 bars/outro) and named hot cues into
 * a single de-duplicated list. When two markers fall within `clusterSeconds`
 * of each other only the higher-priority one is kept, so e.g. Intro wins over
 * a Cue placed at the same start position.
 */
export function buildWaveformMarkers(
  cues: Cue[],
  presets: CuePreset[],
  durationSec: number,
  clusterSeconds = DEFAULT_CLUSTER_SECONDS,
): WaveformMarker[] {
  const raw: WaveformMarker[] = []

  presets.forEach((preset) => {
    const kind = preset.id as WaveformMarkerKind
    if (!(kind in MARKER_COLORS)) return
    raw.push({
      id: `preset-${preset.id}`,
      label: preset.label,
      kind,
      color: MARKER_COLORS[kind],
      positionSec: clamp(preset.positionSec, durationSec),
    })
  })

  cues.forEach((cue, index) => {
    const name = (cue.name ?? '').trim() || `Cue ${index + 1}`
    raw.push({
      id: `cue-${index}`,
      label: name,
      kind: 'cue',
      color: MARKER_COLORS.cue,
      positionSec: clamp(cue.positionSec, durationSec),
    })
  })

  raw.sort((a, b) => a.positionSec - b.positionSec)

  const winners: WaveformMarker[] = []
  for (const marker of raw) {
    const neighbor = winners[winners.length - 1]
    if (neighbor && Math.abs(marker.positionSec - neighbor.positionSec) < clusterSeconds) {
      if (KIND_PRIORITY[marker.kind] > KIND_PRIORITY[neighbor.kind]) {
        winners[winners.length - 1] = marker
      }
      continue
    }
    winners.push(marker)
  }

  return winners
}

function clamp(value: number, durationSec: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  if (durationSec > 0 && value > durationSec) return durationSec
  return value
}
