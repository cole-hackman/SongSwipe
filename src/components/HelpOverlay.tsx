type HelpOverlayProps = {
  open: boolean
  onClose: () => void
}

export function HelpOverlay({ open, onClose }: HelpOverlayProps) {
  if (!open) return null

  return (
    <div className="help-overlay" role="presentation" onClick={onClose}>
      <div className="help-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>Keyboard shortcuts</h2>
        <p className="top-bar__meta">Defaults — customize in Keyboard map settings.</p>
        <dl>
          <dt>← / →</dt>
          <dd>Cut / Keep (Triage mode)</dd>
          <dt>Space</dt>
          <dd>Play / Pause</dd>
          <dt>1-8</dt>
          <dd>Jump to hot cue</dd>
          <dt>Shift+1-5</dt>
          <dd>Set rating</dd>
          <dt>Z</dt>
          <dd>Undo last decision</dd>
          <dt>?</dt>
          <dd>Show this help</dd>
        </dl>
        <h3>Modes</h3>
        <p className="top-bar__meta">
          Triage — swipe workflow. Audit — review all tracks. Compare — A/B two tracks.
        </p>
        <h3>Controllers</h3>
        <p className="top-bar__meta">
          Gamepad: A=cut, B=keep, X=play. MIDI: C2=cut, D2=keep, E2=play.
        </p>
        <h3>Commit</h3>
        <p className="top-bar__meta">
          Use Review changes, Dry-run, or Export XML in the commit dialog. Rollback restores a
          previous backup when Rekordbox is closed.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
