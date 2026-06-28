export type Playlist = {
  id: string
  name: string
  parentId: string | null
  isFolder: boolean
  isSmart?: boolean
  sortIndex?: number
}

export type Track = {
  id: string
  path: string
  title: string
  artist: string
  album: string
  bpm: number | null
  key: string
  rating: number
  colorId: number
  durationSec: number
  artworkPath: string | null
  comment?: string
  playCount?: number
  dateAdded?: string | null
  lastPlayed?: string | null
}

export type BeatMarker = {
  positionSec: number
  bpm: number | null
  beatInBar: number
}

export type DuplicateCluster = {
  key: string
  trackIds: string[]
  reason: 'path' | 'metadata'
}

export type TrackMembership = {
  inDest: boolean
  inCull: boolean
}

export type SessionMode = 'triage' | 'audit' | 'compare'

export type BatchRule = {
  id: string
  enabled: boolean
  field: 'bpm' | 'rating' | 'key'
  op: 'lt' | 'gt' | 'eq' | 'empty'
  value?: string | number
  action: 'suggest_keep' | 'suggest_cull'
}

export type Cue = {
  name: string
  type: number
  positionSec: number
}

export type TrackDecision = {
  keep: boolean
  rating?: number
  colorId?: number
  destPlaylistId?: string
  cullPlaylistId?: string
}

export type CommitSummary = {
  keepCount: number
  cullCount: number
  ratingCount: number
  colorCount: number
}

export const REKORDBOX_COLORS: Array<{ id: number; label: string; hex: string }> = [
  { id: 0, label: 'None', hex: '#2a2a2e' },
  { id: 1, label: 'Pink', hex: '#ff5470' },
  { id: 2, label: 'Red', hex: '#e84545' },
  { id: 3, label: 'Orange', hex: '#f5a623' },
  { id: 4, label: 'Yellow', hex: '#f7d154' },
  { id: 5, label: 'Green', hex: '#00d4aa' },
  { id: 6, label: 'Aqua', hex: '#3ddbd9' },
  { id: 7, label: 'Blue', hex: '#5b8def' },
  { id: 8, label: 'Purple', hex: '#a78bfa' },
]
