import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { KeyboardHint } from '@/components/triage/KeyboardHint'
import { SessionDrawer } from '@/components/triage/SessionDrawer'
import { TriageDecisionRail } from '@/components/triage/TriageDecisionRail'
import { TriageSourceRail } from '@/components/triage/TriageSourceRail'
import { PlaylistNav } from '@/components/PlaylistNav'
import type { DuplicateCluster, Track } from '@/lib/types'
import type { KeyAction } from '@/lib/keymap'

type LeanDirection = 'keep' | 'cut' | null

type SessionMode = 'triage' | 'audit' | 'compare'

type TriageViewProps = {
  centerContent: ReactNode
  clusters: DuplicateCluster[]
  colorId: number
  keymap: Record<KeyAction, string>
  leanDirection: LeanDirection
  mode?: SessionMode
  onLeanChange: (direction: LeanDirection) => void
  onCut: () => void
  onKeep: () => void
  onOpenHelp: () => void
  onSelectTrack: (trackId: string) => void
  rating: number
  showKeyboardHint?: boolean
  track: Track | null
  tracks: Track[]
  showRightRail: boolean
  onToggleRightRail: () => void
  queueFilter: 'all' | 'keep' | 'cut'
  onFilterChange: (filter: 'all' | 'keep' | 'cut') => void
}

export function TriageView({
  centerContent,
  clusters,
  colorId,
  keymap,
  leanDirection,
  mode = 'triage',
  onLeanChange,
  onCut,
  onKeep,
  onOpenHelp,
  onSelectTrack,
  rating,
  showKeyboardHint = true,
  track,
  tracks,
  showRightRail,
  onToggleRightRail,
  queueFilter,
  onFilterChange,
}: TriageViewProps) {
  const [playlistDrawerOpen, setPlaylistDrawerOpen] = useState(false)
  const [sessionDrawerOpen, setSessionDrawerOpen] = useState(false)
  const [playlistSearch, setPlaylistSearch] = useState('')

  useEffect(() => {
    if (!leanDirection) return
    const timeoutId = window.setTimeout(() => onLeanChange(null), 520)
    return () => window.clearTimeout(timeoutId)
  }, [leanDirection, onLeanChange])

  const hideRailComponent = mode === 'audit' || mode === 'compare'

  const handleClosePlaylistDrawer = useCallback(() => {
    setPlaylistDrawerOpen(false)
    setPlaylistSearch('')
  }, [])

  return (
    <>
      <div
        className={`triage-stage${
          hideRailComponent
            ? ' triage-stage--no-rail'
            : !showRightRail
              ? ' triage-stage--collapsed-rail'
              : ''
        }`}
      >
        <TriageSourceRail
          drawerOpen={playlistDrawerOpen}
          onOpenHelp={onOpenHelp}
          onToggleDrawer={() => setPlaylistDrawerOpen((open) => !open)}
        />

        <div className="triage-center">{centerContent}</div>

        {!hideRailComponent ? (
          <TriageDecisionRail
            clusters={clusters}
            colorId={colorId}
            leanDirection={leanDirection}
            onCut={onCut}
            onKeep={onKeep}
            onLeanChange={onLeanChange}
            onOpenSessionDrawer={() => setSessionDrawerOpen(true)}
            rating={rating}
            track={track}
            collapsed={!showRightRail}
            onToggleCollapse={onToggleRightRail}
            queueFilter={queueFilter}
            onFilterChange={onFilterChange}
          />
        ) : null}
      </div>

      {playlistDrawerOpen ? (
        <div className="triage-drawer-backdrop" role="presentation" onClick={handleClosePlaylistDrawer}>
          <aside
            id="triage-playlist-drawer"
            className="triage-playlist-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Playlist source selector"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="triage-playlist-drawer__header">
              <h2>Playlists</h2>
              <button
                type="button"
                className="triage-drawer-close"
                onClick={handleClosePlaylistDrawer}
                aria-label="Close playlist drawer"
              >
                ×
              </button>
            </div>
            <input
              type="search"
              className="triage-playlist-drawer__search"
              placeholder="Search playlists…"
              value={playlistSearch}
              onChange={(event) => setPlaylistSearch(event.target.value)}
              autoFocus
            />
            <PlaylistNav searchQuery={playlistSearch} />
          </aside>
        </div>
      ) : null}

      <SessionDrawer
        clusters={clusters}
        onClose={() => setSessionDrawerOpen(false)}
        onSelectTrack={onSelectTrack}
        open={sessionDrawerOpen}
        tracks={tracks}
      />
      {showKeyboardHint ? <KeyboardHint keymap={keymap} /> : null}
    </>
  )
}
