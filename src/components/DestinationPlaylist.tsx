import { useQueueStore } from '@/store/queue'
import { useSettingsStore } from '@/store/settings'

export function DestinationPlaylist() {
  const playlists = useQueueStore((s) => s.playlists)
  const destinationPlaylistId = useSettingsStore((s) => s.destinationPlaylistId)
  const cullPlaylistId = useSettingsStore((s) => s.cullPlaylistId)
  const setDestinationPlaylistId = useSettingsStore((s) => s.setDestinationPlaylistId)
  const setCullPlaylistId = useSettingsStore((s) => s.setCullPlaylistId)

  const leafPlaylists = playlists.filter((p) => !p.isFolder)

  return (
    <>
      <div className="panel-block">
        <h2>Keep playlist</h2>
        <select
          className="select"
          value={destinationPlaylistId ?? ''}
          onChange={(event) => setDestinationPlaylistId(event.target.value || null)}
        >
          <option value="">Choose destination…</option>
          {leafPlaylists.map((playlist) => (
            <option key={playlist.id} value={playlist.id}>
              {playlist.name}
            </option>
          ))}
        </select>
      </div>
      <div className="panel-block">
        <h2>Cull playlist</h2>
        <select
          className="select"
          value={cullPlaylistId ?? ''}
          onChange={(event) => setCullPlaylistId(event.target.value || null)}
        >
          <option value="">Choose cull list…</option>
          {leafPlaylists.map((playlist) => (
            <option key={playlist.id} value={playlist.id}>
              {playlist.name}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
