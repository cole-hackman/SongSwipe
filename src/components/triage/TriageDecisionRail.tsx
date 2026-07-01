import { useMemo, useState } from 'react'
import { rb } from '@/lib/ipc'
import { REKORDBOX_COLORS, type DuplicateCluster, type Track } from '@/lib/types'
import { computeSessionStats } from '@/lib/session-stats'
import { useDecisionsStore } from '@/store/decisions'
import { useQueueStore } from '@/store/queue'
import { useSettingsStore } from '@/store/settings'

type LeanDirection = 'keep' | 'cut' | null

const FolderIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

type TriageDecisionRailProps = {
  clusters: DuplicateCluster[]
  colorId: number
  leanDirection: LeanDirection
  onCut: () => void
  onKeep: () => void
  onLeanChange: (direction: LeanDirection) => void
  onOpenSessionDrawer: () => void
  rating: number
  track: Track | null
  collapsed: boolean
  onToggleCollapse: () => void
  queueFilter: 'all' | 'keep' | 'cut'
  onFilterChange: (filter: 'all' | 'keep' | 'cut') => void
}

export function TriageDecisionRail({
  clusters,
  colorId,
  leanDirection,
  onCut,
  onKeep,
  onLeanChange,
  onOpenSessionDrawer,
  rating,
  track,
  collapsed,
  onToggleCollapse,
  queueFilter,
  onFilterChange,
}: TriageDecisionRailProps) {
  const playlists = useQueueStore((state) => state.playlists)
  const loadPlaylists = useQueueStore((state) => state.loadPlaylists)
  const allTracks = useQueueStore((state) => state.tracks)
  const decisions = useDecisionsStore((state) => state.decisions)
  const patch = useDecisionsStore((state) => state.patch)
  const removeDecision = useDecisionsStore((state) => state.removeDecision)
  const destinationPlaylistId = useSettingsStore((state) => state.destinationPlaylistId)
  const cutPlaylistId = useSettingsStore((state) => state.cutPlaylistId)
  const setDestinationPlaylistId = useSettingsStore((state) => state.setDestinationPlaylistId)
  const setCutPlaylistId = useSettingsStore((state) => state.setCutPlaylistId)
  const [openEditor, setOpenEditor] = useState<'keep' | 'cut' | null>(null)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [createStatus, setCreateStatus] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const decision = track ? decisions[track.id] : undefined
  const keepOverride = decision?.destPlaylistId ?? ''
  const leafPlaylists = useMemo(
    () => playlists.filter((playlist) => !playlist.isFolder && !playlist.isSmart),
    [playlists],
  )
  const stats = useMemo(() => computeSessionStats(allTracks, decisions), [allTracks, decisions])

  async function updateDefaultKeep(value: string) {
    setDestinationPlaylistId(value || null)
  }

  async function updateDefaultCut(value: string) {
    setCutPlaylistId(value || null)
  }

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

  const keepName = playlistName(leafPlaylists, keepOverride || destinationPlaylistId)
  const cutName = playlistName(leafPlaylists, decision?.cutPlaylistId ?? cutPlaylistId)

  if (collapsed) {
    return (
      <aside className="triage-decision-rail triage-decision-rail--collapsed" aria-label="Decision rail (collapsed)">
        <button
          type="button"
          className="triage-decision-rail__collapse-btn"
          onClick={onToggleCollapse}
          aria-label="Expand decision rail"
          title="Expand decision rail"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M15 3v18" />
            <path d="m11 9-3 3 3 3" />
          </svg>
        </button>
      </aside>
    )
  }

  if (!track) {
    return (
      <aside className="triage-decision-rail triage-decision-rail--empty" aria-label="Decision rail (empty)">
        <div className="triage-decision-rail__header">
          <button
            type="button"
            className="triage-decision-rail__collapse-btn"
            onClick={onToggleCollapse}
            aria-label="Collapse decision rail"
            title="Collapse decision rail"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M15 3v18" />
              <path d="m8 9 3 3-3 3" />
            </svg>
          </button>
          <span className="triage-decision-rail__title">Decision Rail</span>
        </div>
        <p className="top-bar__meta">Load a playlist to edit destinations, rating, and color.</p>
      </aside>
    )
  }

  return (
    <aside className="triage-decision-rail" aria-label="Decision rail">
      <div className="triage-decision-rail__header">
        <button
          type="button"
          className="triage-decision-rail__collapse-btn"
          onClick={onToggleCollapse}
          aria-label="Collapse decision rail"
          title="Collapse decision rail"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M15 3v18" />
            <path d="m8 9 3 3-3 3" />
          </svg>
        </button>
        <span className="triage-decision-rail__title">Decision Rail</span>
      </div>

      <div className="triage-decision-actions--primary">
        <button
          type="button"
          className="triage-action triage-action--cut"
          onClick={onCut}
          onMouseEnter={() => onLeanChange('cut')}
          onMouseLeave={() => onLeanChange(null)}
        >
          Cut
        </button>
        <button
          type="button"
          className="triage-action triage-action--keep"
          onClick={onKeep}
          onMouseEnter={() => onLeanChange('keep')}
          onMouseLeave={() => onLeanChange(null)}
        >
          Keep
        </button>
      </div>

      {decision && (
        <div style={{ marginTop: -4 }}>
          <button
            type="button"
            className="triage-action triage-action--reset"
            onClick={() => removeDecision(track.id)}
          >
            Reset Decision
          </button>
        </div>
      )}

      <section className="triage-rail-card">
        <h2>Rating</h2>
        <div className="triage-stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`triage-stars__button${rating >= star ? ' is-active' : ''}`}
              aria-label={`Rate ${star}`}
              onClick={() => patch(track.id, { rating: star, keep: decision?.keep ?? true })}
            >
              ★
            </button>
          ))}
        </div>
      </section>

      <section className="triage-rail-card">
        <h2>Color</h2>
        <div className="triage-colors">
          {REKORDBOX_COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              className={`triage-colors__button${colorId === color.id ? ' is-active' : ''}`}
              style={{ background: color.hex }}
              aria-label={color.label}
              onClick={() => patch(track.id, { colorId: color.id, keep: decision?.keep ?? true })}
            />
          ))}
        </div>
      </section>

      <div className="triage-destination-list">
        <button
          type="button"
          className={`triage-destination-chip triage-destination-chip--keep${keepName === 'Not set' ? ' triage-destination-chip--unset' : ''}`}
          onClick={() => setOpenEditor((current) => (current === 'keep' ? null : 'keep'))}
          onMouseEnter={() => onLeanChange('keep')}
          onMouseLeave={() => onLeanChange(null)}
          aria-expanded={openEditor === 'keep'}
        >
          <FolderIcon />
          <span className="triage-destination-chip__tag">Keep folder:</span>
          <span className="triage-destination-chip__name">{keepName} ▾</span>
        </button>
        {openEditor === 'keep' ? (
          <div className="triage-editor">
            <label className="triage-editor__label">
              Default keep playlist
              <select
                className="select"
                value={destinationPlaylistId ?? ''}
                onChange={(event) => void updateDefaultKeep(event.target.value)}
              >
                <option value="">Choose destination…</option>
                {leafPlaylists.map((playlist) => (
                  <option key={playlist.id} value={playlist.id}>
                    {playlist.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="triage-editor__label">
              Per-track override
              <select
                className="select"
                value={keepOverride}
                onChange={(event) =>
                  patch(track.id, { destPlaylistId: event.target.value || undefined, keep: true })
                }
              >
                <option value="">Use default playlist</option>
                {leafPlaylists.map((playlist) => (
                  <option key={playlist.id} value={playlist.id}>
                    {playlist.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="triage-editor__create">
              <input
                className="input"
                value={newPlaylistName}
                placeholder="New keep playlist"
                onChange={(event) => setNewPlaylistName(event.target.value)}
              />
              <button type="button" className="btn" disabled={creating} onClick={() => void createKeepPlaylist()}>
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
            {createStatus ? <p className="top-bar__meta">{createStatus}</p> : null}
          </div>
        ) : null}

        <button
          type="button"
          className={`triage-destination-chip triage-destination-chip--cut${cutName === 'Not set' ? ' triage-destination-chip--unset' : ''}`}
          onClick={() => setOpenEditor((current) => (current === 'cut' ? null : 'cut'))}
          onMouseEnter={() => onLeanChange('cut')}
          onMouseLeave={() => onLeanChange(leanDirection)}
          aria-expanded={openEditor === 'cut'}
        >
          <FolderIcon />
          <span className="triage-destination-chip__tag">Cut folder:</span>
          <span className="triage-destination-chip__name">{cutName} ▾</span>
        </button>
        {openEditor === 'cut' ? (
          <div className="triage-editor">
            <label className="triage-editor__label">
              Default cut playlist
              <select
                className="select"
                value={cutPlaylistId ?? ''}
                onChange={(event) => void updateDefaultCut(event.target.value)}
              >
                <option value="">Choose cut destination…</option>
                {leafPlaylists.map((playlist) => (
                  <option key={playlist.id} value={playlist.id}>
                    {playlist.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </div>

      <div className="triage-mini-stat">
        <span>
          <strong>{stats.keepCount}</strong> keep · <strong>{stats.cutCount}</strong> cut
        </span>
        <span>{Math.round(stats.keepRatio * 100)}% kept</span>
      </div>

      <div className="triage-filter-pill" role="group" aria-label="Filter queue">
        <span className="triage-filter-pill__label">Filter</span>
        <button
          type="button"
          className={`triage-filter-pill__btn${queueFilter === 'all' ? ' is-active' : ''}`}
          onClick={() => onFilterChange('all')}
        >
          All
        </button>
        <button
          type="button"
          className={`triage-filter-pill__btn${queueFilter === 'keep' ? ' is-active' : ''}`}
          onClick={() => onFilterChange('keep')}
        >
          Kept
        </button>
        <button
          type="button"
          className={`triage-filter-pill__btn${queueFilter === 'cut' ? ' is-active' : ''}`}
          onClick={() => onFilterChange('cut')}
        >
          Cut
        </button>
      </div>

      <button type="button" className="triage-more" onClick={onOpenSessionDrawer}>
        ⋯ Session · Export · Dupes ({clusters.length})
      </button>
    </aside>
  )
}

function playlistName(playlists: Array<{ id: string; name: string }>, playlistId: string | null | undefined) {
  if (!playlistId) return 'Not set'
  return playlists.find((playlist) => playlist.id === playlistId)?.name ?? 'Unknown playlist'
}
