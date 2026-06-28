import type { Track, TrackDecision } from '@/lib/types'

export type SessionStats = {
  total: number
  keepCount: number
  cullCount: number
  keepRatio: number
  avgBpmKeepers: number | null
  avgBpmCulls: number | null
  colorCounts: Record<number, number>
}

export function computeSessionStats(
  tracks: Track[],
  decisions: Record<string, TrackDecision>,
): SessionStats {
  const byId = new Map(tracks.map((t) => [t.id, t]))
  const values = Object.entries(decisions)
  const keep = values.filter(([, d]) => d.keep)
  const cull = values.filter(([, d]) => !d.keep)

  const bpm = (entries: Array<[string, TrackDecision]>) =>
    entries
      .map(([id]) => byId.get(id)?.bpm)
      .filter((v): v is number => typeof v === 'number')

  const keepBpms = bpm(keep)
  const cullBpms = bpm(cull)
  const colorCounts: Record<number, number> = {}
  for (const [, d] of values) {
    const color = d.colorId ?? 0
    colorCounts[color] = (colorCounts[color] ?? 0) + 1
  }

  const total = values.length
  return {
    total,
    keepCount: keep.length,
    cullCount: cull.length,
    keepRatio: total ? keep.length / total : 0,
    avgBpmKeepers: keepBpms.length ? keepBpms.reduce((a, b) => a + b, 0) / keepBpms.length : null,
    avgBpmCulls: cullBpms.length ? cullBpms.reduce((a, b) => a + b, 0) / cullBpms.length : null,
    colorCounts,
  }
}
