export type AuditColumnId =
  | 'index'
  | 'title'
  | 'artist'
  | 'album'
  | 'bpm'
  | 'key'
  | 'duration'
  | 'rating'
  | 'color'
  | 'decision'
  | 'comment'
  | 'playCount'
  | 'dateAdded'
  | 'lastPlayed'
  | 'fileType'

export type AuditColumnConfig = {
  id: AuditColumnId
  visible: boolean
  width: number
}

export const AUDIT_COLUMN_LABELS: Record<AuditColumnId, string> = {
  index: '#',
  title: 'Title',
  artist: 'Artist',
  album: 'Album',
  bpm: 'BPM',
  key: 'Key',
  duration: 'Length',
  rating: 'Rating',
  color: 'Color',
  decision: 'Decision',
  comment: 'Comment',
  playCount: 'Plays',
  dateAdded: 'Added',
  lastPlayed: 'Last played',
  fileType: 'Type',
}

export const DEFAULT_AUDIT_COLUMNS: AuditColumnConfig[] = [
  { id: 'index', visible: true, width: 50 },
  { id: 'title', visible: true, width: 240 },
  { id: 'artist', visible: true, width: 180 },
  { id: 'bpm', visible: true, width: 80 },
  { id: 'key', visible: true, width: 70 },
  { id: 'duration', visible: true, width: 80 },
  { id: 'decision', visible: true, width: 100 },
  { id: 'rating', visible: true, width: 90 },
  { id: 'color', visible: true, width: 90 },
  { id: 'album', visible: false, width: 180 },
  { id: 'comment', visible: false, width: 220 },
  { id: 'playCount', visible: false, width: 70 },
  { id: 'dateAdded', visible: false, width: 110 },
  { id: 'lastPlayed', visible: false, width: 110 },
  { id: 'fileType', visible: false, width: 70 },
]

/**
 * Merge saved column config with the default set so that newly-added columns
 * are still picked up and unknown ids are dropped.
 */
export function mergeAuditColumns(saved: AuditColumnConfig[] | undefined): AuditColumnConfig[] {
  if (!saved || !Array.isArray(saved) || !saved.length) return [...DEFAULT_AUDIT_COLUMNS]
  const defaultsById = new Map(DEFAULT_AUDIT_COLUMNS.map((column) => [column.id, column]))
  const seen = new Set<AuditColumnId>()
  const merged: AuditColumnConfig[] = []
  for (const entry of saved) {
    if (!defaultsById.has(entry.id) || seen.has(entry.id)) continue
    seen.add(entry.id)
    merged.push({
      id: entry.id,
      visible: Boolean(entry.visible),
      width: Math.max(40, Math.min(800, Number(entry.width) || defaultsById.get(entry.id)!.width)),
    })
  }
  for (const column of DEFAULT_AUDIT_COLUMNS) {
    if (!seen.has(column.id)) merged.push({ ...column })
  }
  return merged
}
