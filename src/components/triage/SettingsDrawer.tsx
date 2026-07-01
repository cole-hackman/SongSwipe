import { KeymapSettings } from '@/components/KeymapSettings'
import { LibrarySettings } from '@/components/LibrarySettings'

type SettingsDrawerProps = {
  onClose: () => void
  open: boolean
}

export function SettingsDrawer({ onClose, open }: SettingsDrawerProps) {
  if (!open) return null

  return (
    <div className="settings-modal-overlay" role="presentation" onClick={onClose}>
      <aside
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="settings-modal__header">
          <h2>Settings</h2>
          <button type="button" className="settings-modal__close-btn" onClick={onClose} aria-label="Close settings">
            ×
          </button>
        </div>
        <div className="settings-modal__content">
          <div className="settings-modal__grid">
            <div className="settings-modal__col">
              <LibrarySettings />
            </div>
            <div className="settings-modal__col">
              <KeymapSettings />
            </div>
          </div>
        </div>
        <div className="settings-modal__footer">
          <button type="button" className="btn btn--primary settings-modal__done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </aside>
    </div>
  )
}
