import { useEffect, useState } from 'react'
import type { Track } from '@/lib/types'
import { getArtworkUrl } from '@/audio/artwork-cache'
import { toMediaUrl } from '@/lib/ipc'
import { useQueueStore } from '@/store/queue'
import { PlaylistMembershipBadges } from '@/components/PlaylistMembershipBadges'

type TrackCardProps = {
  track: Track
}

export function TrackCard({ track }: TrackCardProps) {
  const [artUrl, setArtUrl] = useState<string | null>(null)
  const membership = useQueueStore((s) => s.membershipByTrackId[track.id])

  useEffect(() => {
    let active = true
    void getArtworkUrl(track.artworkPath, toMediaUrl).then((url) => {
      if (active) setArtUrl(url)
    })
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
        <PlaylistMembershipBadges
          inDest={membership?.inDest ?? false}
          inCull={membership?.inCull ?? false}
        />
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
