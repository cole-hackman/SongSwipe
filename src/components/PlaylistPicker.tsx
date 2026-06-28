import { useEffect } from 'react'
import { useQueueStore } from '@/store/queue'

export function PlaylistPicker() {
  const playlists = useQueueStore((s) => s.playlists)
  const sourcePlaylistId = useQueueStore((s) => s.sourcePlaylistId)
  const loadPlaylists = useQueueStore((s) => s.loadPlaylists)
  const selectPlaylist = useQueueStore((s) => s.selectPlaylist)
  const loading = useQueueStore((s) => s.loading)

  useEffect(() => {
    void loadPlaylists()
  }, [loadPlaylists])

  const leafPlaylists = playlists.filter((p) => !p.isFolder)

  return (
    <label className="panel-block" style={{ minWidth: 280 }}>
      <span className="top-bar__meta">Source playlist</span>
      <select
        className="select"
        value={sourcePlaylistId ?? ''}
        disabled={loading}
        onChange={(event) => {
          const value = event.target.value
          if (value) void selectPlaylist(value)
        }}
      >
        <option value="">Select playlist…</option>
        {leafPlaylists.map((playlist) => (
          <option key={playlist.id} value={playlist.id}>
            {playlist.name}
          </option>
        ))}
      </select>
    </label>
  )
}
