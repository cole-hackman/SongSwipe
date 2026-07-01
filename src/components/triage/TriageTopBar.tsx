import { ModeSwitcher } from '@/components/ModeSwitcher'
import { formatTriageProgress, resolveSourcePlaylistName } from '@/components/triage/model'
import type { Playlist, SessionMode } from '@/lib/types'

type TriageTopBarProps = {
  currentIndex: number
  onCommit: () => void
  onModeChange: (mode: SessionMode) => void
  onOpenSettings: () => void
  playlists: Playlist[]
  sourcePlaylistId: string | null
  trackCount: number
  mode: SessionMode
}

export function TriageTopBar({
  currentIndex,
  onCommit,
  onModeChange,
  onOpenSettings,
  playlists,
  sourcePlaylistId,
  trackCount,
  mode,
}: TriageTopBarProps) {
  const progress = formatTriageProgress(currentIndex, trackCount)
  const sourceName = resolveSourcePlaylistName(playlists, sourcePlaylistId)

  return (
    <header className="triage-topbar">
      <div className="triage-topbar__brand">
        <div className="triage-wordmark">
          <span className="triage-wordmark__dot" />
          <span>SongSwipe</span>
        </div>
        <ModeSwitcher mode={mode} onChange={onModeChange} />
      </div>

      <div className="triage-topbar__source">
        <div className="triage-topbar__source-name">
          <span>{sourceName}</span>
        </div>
        <div className="triage-progress" aria-label={`Track ${progress.currentLabel} of ${progress.totalLabel}`}>
          <span className="triage-progress__reviewed">{progress.reviewedLabel}</span>
          <div className="triage-progress__bar" aria-hidden="true">
            <i style={{ width: `${progress.ratio * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="triage-topbar__actions">
        <button
          type="button"
          className="triage-topbar__icon-btn"
          onClick={onOpenSettings}
          aria-label="Open settings"
          title="Settings"
        >
          ⚙
        </button>
        <button type="button" className="triage-commit" onClick={onCommit}>
          Review &amp; Commit →
        </button>
      </div>
    </header>
  )
}
