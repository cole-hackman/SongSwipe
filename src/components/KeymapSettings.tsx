import { useEffect, useState } from 'react'
import { KEY_ACTIONS, type KeyAction } from '@/lib/keymap'
import { writeSettings } from '@/lib/ipc'
import { useSettingsStore } from '@/store/settings'

const ACTION_LABELS: Record<KeyAction, string> = {
  keep: 'Keep',
  cut: 'Cut',
  play: 'Play / Pause',
  undo: 'Undo',
  help: 'Help',
  cue1: 'Cue 1',
  cue2: 'Cue 2',
  cue3: 'Cue 3',
  cue4: 'Cue 4',
  cue5: 'Cue 5',
  cue6: 'Cue 6',
  cue7: 'Cue 7',
  cue8: 'Cue 8',
  rate1: 'Rate 1★',
  rate2: 'Rate 2★',
  rate3: 'Rate 3★',
  rate4: 'Rate 4★',
  rate5: 'Rate 5★',
}

const IGNORED_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta'])

function formatBinding(binding: string): string {
  if (!binding) return '—'
  const parts = binding.split('+')
  const key = parts[parts.length - 1]
  const mods = parts.slice(0, -1)
  const display = key === ' ' ? 'Space' : key === 'ArrowLeft' ? '←' : key === 'ArrowRight' ? '→' : key === 'ArrowUp' ? '↑' : key === 'ArrowDown' ? '↓' : key
  return [...mods, display].join(' + ')
}

export function KeymapSettings() {
  const keymap = useSettingsStore((s) => s.keymap)
  const setKeymap = useSettingsStore((s) => s.setKeymap)
  const [listeningAction, setListeningAction] = useState<KeyAction | null>(null)

  async function commitBinding(action: KeyAction, binding: string) {
    const next = { ...keymap, [action]: binding }
    setKeymap(next)
    await writeSettings({ keymap: next })
  }

  useEffect(() => {
    if (!listeningAction) return
    const action = listeningAction

    function onKeyDown(event: KeyboardEvent) {
      event.preventDefault()
      event.stopPropagation()

      if (event.key === 'Escape') {
        setListeningAction(null)
        return
      }

      if (IGNORED_KEYS.has(event.key)) return

      const binding = event.shiftKey ? `Shift+${event.key}` : event.key
      void commitBinding(action, binding)
      setListeningAction(null)
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [listeningAction, keymap])

  function findConflict(action: KeyAction): KeyAction | null {
    const binding = keymap[action]
    if (!binding) return null
    for (const other of KEY_ACTIONS) {
      if (other !== action && keymap[other] === binding) return other
    }
    return null
  }

  const categories: { label: string; actions: KeyAction[] }[] = [
    { label: 'Playback', actions: ['play'] },
    { label: 'Decisions', actions: ['keep', 'cut', 'undo'] },
    { label: 'Cue Points', actions: ['cue1', 'cue2', 'cue3', 'cue4', 'cue5', 'cue6', 'cue7', 'cue8'] },
    { label: 'Rating', actions: ['rate1', 'rate2', 'rate3', 'rate4', 'rate5'] },
    { label: 'Other', actions: ['help'] },
  ]

  return (
    <div className="panel-block">
      <h2>Keyboard map</h2>
      <p className="top-bar__meta">
        Click a binding then press the key you want. Esc to cancel.
      </p>
      <div className="keymap-table">
        {categories.map((cat) => (
          <div key={cat.label} style={{ display: 'contents' }}>
            <div className="keymap-category" style={{ gridColumn: '1 / -1' }}>
              {cat.label}
            </div>
            {cat.actions.map((action) => {
              const isListening = listeningAction === action
              const conflict = findConflict(action)
              return (
                <div key={action} style={{ display: 'contents' }}>
                  <span className="keymap-table__action">{ACTION_LABELS[action]}</span>
                  <div className="keymap-table__binding">
                    <button
                      type="button"
                      className={`keymap-row__binding${isListening ? ' is-listening' : ''}`}
                      aria-label={`Rebind ${ACTION_LABELS[action]}`}
                      onClick={() => setListeningAction(isListening ? null : action)}
                    >
                      <kbd className="keycap">
                        {isListening ? 'Press a key…' : formatBinding(keymap[action])}
                      </kbd>
                      {conflict && !isListening ? (
                        <span className="keymap-row__conflict" title={`Also bound to ${ACTION_LABELS[conflict]}`}>
                          ⚠
                        </span>
                      ) : null}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
