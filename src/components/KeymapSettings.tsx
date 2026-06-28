import { KEY_ACTIONS, type KeyAction } from '@/lib/keymap'
import { writeSettings } from '@/lib/ipc'
import { useSettingsStore } from '@/store/settings'

const ACTION_LABELS: Record<KeyAction, string> = {
  keep: 'Keep',
  cull: 'Cull',
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

export function KeymapSettings() {
  const keymap = useSettingsStore((s) => s.keymap)
  const setKeymap = useSettingsStore((s) => s.setKeymap)

  async function updateAction(action: KeyAction, binding: string) {
    const next = { ...keymap, [action]: binding }
    setKeymap(next)
    await writeSettings({ keymap: next })
  }

  return (
    <div className="panel-block">
      <h2>Keyboard map</h2>
      {KEY_ACTIONS.map((action) => (
        <label key={action} className="keymap-row">
          <span className="top-bar__meta">{ACTION_LABELS[action]}</span>
          <input
            className="input"
            value={keymap[action]}
            onChange={(e) => void updateAction(action, e.target.value)}
          />
        </label>
      ))}
    </div>
  )
}
