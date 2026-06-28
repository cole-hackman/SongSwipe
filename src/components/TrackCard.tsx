import { useEffect, useState } from 'react'
import type { Track } from '@/lib/types'
import { toMediaUrl } from '@/lib/ipc'

type TrackCardProps = {
  track: Track
}

export function TrackCard({ track }: TrackCardProps) {
  const [artUrl, setArtUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function loadArt() {
      if (!track.artworkPath) {
        setArtUrl(null)
        return
      }
      try {
        const url = await toMediaUrl(track.artworkPath)
        if (active) setArtUrl(url)
      } catch {
        if (active) setArtUrl(null)
      }
    }
    void loadArt()
    return () => {
      active = false
    }
  }, [track.artworkPath])

  return (
    <article className="track-card">
      {artUrl ? (
        <img className="track-card__art" src={artUrl} alt="" />
      ) : (
        <div className="track-card__art" aria-hidden />
      )}
      <div>
        <h2 className="track-card__title">{track.title || 'Untitled'}</h2>
        <p className="track-card__artist">{track.artist || 'Unknown artist'}</p>
        <div className="track-card__meta">
          {track.bpm ? <span>{track.bpm.toFixed(1)} BPM</span> : null}
          {track.key ? <span>Key {track.key}</span> : null}
          <span>{formatDuration(track.durationSec)}</span>
        </div>
      </div>
    </article>
  )
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
