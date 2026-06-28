import { useEffect, useState } from 'react'
import { rb, writeSettings } from '@/lib/ipc'
import { useQueueStore } from '@/store/queue'
import { useSettingsStore } from '@/store/settings'

export function DestinationPlaylist() {
  const playlists = useQueueStore((s) => s.playlists)
  const loadPlaylists = useQueueStore((s) => s.loadPlaylists)
  const destinationPlaylistId = useSettingsStore((s) => s.destinationPlaylistId)
  const cullPlaylistId = useSettingsStore((s) => s.cullPlaylistId)
  const setDestinationPlaylistId = useSettingsStore((s) => s.setDestinationPlaylistId)
  const setCullPlaylistId = useSettingsStore((s) => s.setCullPlaylistId)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createStatus, setCreateStatus] = useState<string | null>(null)

  const leafPlaylists = playlists.filter((p) => !p.isFolder && !p.isSmart)

  async function createKeepPlaylist() {
    const name = newPlaylistName.trim()
    if (!name) return
    setCreating(true)
    setCreateStatus(null)
    try {
      const created = await rb<{ id: string; name: string }>('create_playlist', { name })
      await loadPlaylists()
      setDestinationPlaylistId(created.id)
      setNewPlaylistName('')
      setCreateStatus(`Created "${created.name}"`)
    } catch (error) {
      setCreateStatus(error instanceof Error ? error.message : 'Failed to create playlist')
    } finally {
      setCreating(false)
    }
  }

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
        <div className="action-row">
          <input
            className="input"
            placeholder="New playlist name"
            value={newPlaylistName}
            onChange={(event) => setNewPlaylistName(event.target.value)}
          />
          <button
            type="button"
            className="btn"
            disabled={creating || !newPlaylistName.trim()}
            onClick={() => void createKeepPlaylist()}
          >
            {creating ? 'Creating…' : 'New playlist'}
          </button>
        </div>
        {createStatus ? <p className="top-bar__meta">{createStatus}</p> : null}
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
