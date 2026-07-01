type TriageSourceRailProps = {
  drawerOpen: boolean
  onOpenHelp: () => void
  onToggleDrawer: () => void
}

export function TriageSourceRail({
  drawerOpen,
  onOpenHelp,
  onToggleDrawer,
}: TriageSourceRailProps) {
  return (
    <aside className="triage-source-rail" aria-label="Triage navigation">
      <button
        type="button"
        className={`triage-source-rail__playlists-trigger${drawerOpen ? ' is-active' : ''}`}
        onClick={onToggleDrawer}
        aria-expanded={drawerOpen}
        aria-controls="triage-playlist-drawer"
        aria-label="Toggle playlist drawer"
      >
        <span className="triage-source-rail__music-icon">♫</span>
        <span className="triage-source-rail__label">Playlists</span>
      </button>
      <button
        type="button"
        className="triage-source-rail__button triage-source-rail__help-button"
        onClick={onOpenHelp}
        aria-label="Show keyboard help"
      >
        ?
      </button>
    </aside>
  )
}
