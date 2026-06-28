import type { Track, TrackDecision } from '@/lib/types'

export function buildSessionReportCsv(
  tracks: Track[],
  decisions: Record<string, TrackDecision>,
): string {
  const header = 'trackId,title,artist,action,rating,colorId,destPlaylistId'
  const byId = new Map(tracks.map((t) => [t.id, t]))
  const rows = Object.entries(decisions).map(([trackId, d]) => {
    const t = byId.get(trackId)
    return [
      trackId,
      csvEscape(t?.title ?? ''),
      csvEscape(t?.artist ?? ''),
      d.keep ? 'keep' : 'cull',
      d.rating ?? '',
      d.colorId ?? '',
      d.destPlaylistId ?? '',
    ].join(',')
  })
  return [header, ...rows].join('\n')
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export function buildSessionReportJson(
  tracks: Track[],
  decisions: Record<string, TrackDecision>,
): string {
  return JSON.stringify({ tracks, decisions, exportedAt: new Date().toISOString() }, null, 2)
}
