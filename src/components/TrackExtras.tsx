import { useEffect, useState } from 'react'
import { rb } from '@/lib/ipc'
import type { AssignedTag, Track } from '@/lib/types'

export function TrackExtras({ track }: { track: Track }) {
  const [tags, setTags] = useState<AssignedTag[]>([])

  useEffect(() => {
    let active = true
    void rb<AssignedTag[]>('get_my_tags', { trackId: track.id })
      .then((assigned) => {
        if (active) setTags(assigned)
      })
      .catch(() => {
        if (active) setTags([])
      })
    return () => {
      active = false
    }
  }, [track.id])

  return (
    <div className="panel-block track-extras">
      <h2>Track info</h2>
      {track.comment ? <p className="track-extras__comment">{track.comment}</p> : null}
      <p className="top-bar__meta">
        Played {track.playCount ?? 0}×
        {track.dateAdded ? ` · Added ${formatDate(track.dateAdded)}` : ''}
        {track.lastPlayed ? ` · Last ${formatDate(track.lastPlayed)}` : ''}
      </p>
      {tags.length ? (
        <div className="track-extras__tags">
          {tags.map((tag) => (
            <span key={tag.id} className="badge">
              {tag.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}
