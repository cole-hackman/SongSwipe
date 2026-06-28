import { useMemo, useState } from 'react'
import type { Track, TrackDecision } from '@/lib/types'
import { REKORDBOX_COLORS } from '@/lib/types'

type AuditViewProps = {
  tracks: Track[]
  decisions: Record<string, TrackDecision>
  onSelectIndex: (index: number) => void
}

type Filter = 'all' | 'decided' | 'undecided'

export function AuditView({ tracks, decisions, onSelectIndex }: AuditViewProps) {
  const [filter, setFilter] = useState<Filter>('all')

  const rows = useMemo(() => {
    return tracks
      .map((track, index) => ({ track, index, decision: decisions[track.id] }))
      .filter(({ decision }) => {
        if (filter === 'decided') return Boolean(decision)
        if (filter === 'undecided') return !decision
        return true
      })
  }, [tracks, decisions, filter])

  return (
    <div className="audit-view">
      <div className="audit-view__toolbar">
        <span className="top-bar__meta">Filter</span>
        {(['all', 'decided', 'undecided'] as Filter[]).map((value) => (
          <button
            key={value}
            type="button"
            className={filter === value ? 'btn btn--primary' : 'btn'}
            onClick={() => setFilter(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <table className="audit-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Title</th>
            <th>Artist</th>
            <th>Decision</th>
            <th>Rating</th>
            <th>Color</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ track, index, decision }) => (
            <tr key={track.id} onClick={() => onSelectIndex(index)}>
              <td>{index + 1}</td>
              <td>{track.title || 'Untitled'}</td>
              <td>{track.artist || 'Unknown'}</td>
              <td>{decision ? (decision.keep ? 'Keep' : 'Cull') : '—'}</td>
              <td>{decision?.rating ?? track.rating}</td>
              <td>
                {REKORDBOX_COLORS.find((c) => c.id === (decision?.colorId ?? track.colorId))?.label ??
                  'None'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
