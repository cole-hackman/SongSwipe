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
        <dl>
          <dt>← / →</dt>
          <dd>Cull / Keep</dd>
          <dt>Space</dt>
          <dd>Play / Pause</dd>
          <dt>1-8</dt>
          <dd>Jump to cue</dd>
          <dt>Shift+1-5</dt>
          <dd>Set rating</dd>
          <dt>Z</dt>
          <dd>Undo last decision</dd>
          <dt>?</dt>
          <dd>Show this help</dd>
        </dl>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
