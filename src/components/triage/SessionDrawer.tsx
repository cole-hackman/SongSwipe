import { DuplicatesPanel } from '@/components/DuplicatesPanel'
import { NamedSessions } from '@/components/NamedSessions'
import { SessionStatsPanel } from '@/components/triage/SessionStatsPanel'
import type { DuplicateCluster, Track } from '@/lib/types'

type SessionDrawerProps = {
  clusters: DuplicateCluster[]
  onClose: () => void
  onSelectTrack: (trackId: string) => void
  open: boolean
  tracks: Track[]
}

export function SessionDrawer({
  clusters,
  onClose,
  onSelectTrack,
  open,
  tracks,
}: SessionDrawerProps) {
  if (!open) return null

  return (
    <div className="triage-drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="triage-session-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Session, export, and duplicates"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="triage-session-drawer__header">
          <h2>Session · Export · Dupes</h2>
          <button type="button" className="triage-drawer-close" onClick={onClose} aria-label="Close drawer">
            ×
          </button>
        </div>
        <div className="triage-session-drawer__content">
          <SessionStatsPanel tracks={tracks} clusters={clusters} />
          <NamedSessions />
          <DuplicatesPanel clusters={clusters} tracks={tracks} onSelectTrack={onSelectTrack} />
        </div>
      </aside>
    </div>
  )
}
