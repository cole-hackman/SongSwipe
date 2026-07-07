import { useEffect, useState } from 'react'
import { getArtworkUrl } from '@/audio/artwork-cache'
import { PlaylistMembershipBadges } from '@/components/PlaylistMembershipBadges'
import { rb, toMediaUrl } from '@/lib/ipc'
import type { CuePreset } from '@/lib/cue-presets'
import type { AssignedTag, BeatMarker, Cue, Track } from '@/lib/types'
import { useQueueStore } from '@/store/queue'
import { WaveformPlayer } from '@/components/WaveformPlayer'

type TriageTrackCardProps = {
  beatgrid: BeatMarker[]
  cues: Cue[]
  fastMode: boolean
  filePath: string
  media: HTMLAudioElement | null
  normalize: boolean
  onSeek?: (seconds: number) => void
  presets: CuePreset[]
  track: Track
  waveformBarWidth: number
}

export function TriageTrackCard({
  beatgrid,
  cues,
  fastMode,
  filePath,
  media,
  normalize,
  onSeek,
  presets,
  track,
  waveformBarWidth,
}: TriageTrackCardProps) {
  const [artUrl, setArtUrl] = useState<string | null>(null)
  const [tags, setTags] = useState<AssignedTag[]>([])
  const membership = useQueueStore((state) => state.membershipByTrackId[track.id])

  useEffect(() => {
    let active = true
    void getArtworkUrl(track.artworkPath, toMediaUrl).then((url) => {
      if (active) setArtUrl(url)
    })
    return () => {
      active = false
    }
  }, [track.artworkPath])

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
    <article className="triage-card-face">
      <div className="triage-card-face__header">
        {artUrl ? (
          <img className="triage-card-face__art" src={artUrl} alt="" />
        ) : (
          <div className="triage-card-face__art triage-card-face__art--fallback" aria-hidden="true">
            <span>{initials(track.artist || track.title)}</span>
          </div>
        )}
        <div className="triage-card-face__meta">
          <PlaylistMembershipBadges
            inCut={membership?.inCut ?? false}
            inDest={membership?.inDest ?? false}
          />
          <h2 className="triage-card-face__title">{track.title || 'Untitled'}</h2>
          <p className="triage-card-face__artist">{track.artist || 'Unknown artist'}</p>
          <div className="triage-card-face__chips">
            {track.bpm ? <span className="triage-card-chip">{track.bpm.toFixed(1)} BPM</span> : null}
            {track.key ? <span className="triage-card-chip">Key {track.key}</span> : null}
            <span className="triage-card-chip">{formatDuration(track.durationSec)}</span>
            <span className="triage-card-chip">{fileExtension(track.path)}</span>
          </div>
          <div className="triage-card-face__inline-meta">
            <span>Played {track.playCount ?? 0}×</span>
            {track.dateAdded ? <span>Added {formatDate(track.dateAdded)}</span> : null}
            {track.lastPlayed ? <span>Last {formatDate(track.lastPlayed)}</span> : null}
            {track.comment ? <span>{track.comment}</span> : null}
            {tags.map((tag) => (
              <span key={tag.id} className="badge">{tag.name}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="triage-card-face__wave">
        <WaveformPlayer
          media={media}
          filePath={filePath}
          cues={cues}
          durationSec={track.durationSec}
          beatgrid={beatgrid}
          presets={presets}
          barWidth={waveformBarWidth}
          normalize={normalize}
          fastMode={fastMode}
          className="triage-waveform"
          height={196}
          onSeek={onSeek}
        />
      </div>
    </article>
  )
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString()
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function fileExtension(path: string) {
  const segment = path.split('.').pop()
  return segment ? `.${segment.toLowerCase()}` : 'file'
}

function initials(value: string) {
  const parts = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return parts || 'SS'
}
