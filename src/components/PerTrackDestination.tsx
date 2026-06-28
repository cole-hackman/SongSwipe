import { useQueueStore } from '@/store/queue'
import { useDecisionsStore } from '@/store/decisions'
import { useSettingsStore } from '@/store/settings'

type PerTrackDestinationProps = {
  trackId: string
}

export function PerTrackDestination({ trackId }: PerTrackDestinationProps) {
  const playlists = useQueueStore((s) => s.playlists)
  const destinationPlaylistId = useSettingsStore((s) => s.destinationPlaylistId)
  const override = useDecisionsStore((s) => s.decisions[trackId]?.destPlaylistId)
  const patch = useDecisionsStore((s) => s.patch)

  const leafPlaylists = playlists.filter((p) => !p.isFolder && !p.isSmart)
  const effective = override ?? destinationPlaylistId ?? ''

  return (
    <div className="panel-block">
      <h2>Keep destination</h2>
      <p className="top-bar__meta">
        {override ? 'Per-track override' : 'Using default keep playlist'}
      </p>
      <select
        className="select"
        value={effective}
        onChange={(event) => {
          const value = event.target.value
          patch(trackId, { destPlaylistId: value || undefined })
        }}
      >
        <option value="">Default playlist</option>
        {leafPlaylists.map((playlist) => (
          <option key={playlist.id} value={playlist.id}>
            {playlist.name}
          </option>
        ))}
      </select>
    </div>
  )
}
