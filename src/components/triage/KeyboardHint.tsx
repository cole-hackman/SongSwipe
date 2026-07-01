import type { KeyAction } from '@/lib/keymap'

type KeyboardHintProps = {
  keymap: Record<KeyAction, string>
}

export function KeyboardHint({ keymap }: KeyboardHintProps) {
  return (
    <div className="triage-keyhint" aria-label="Keyboard shortcuts">
      <span>
        <kbd>{displayKey(keymap.cut)}</kbd> Cut
      </span>
      <span>
        Keep <kbd>{displayKey(keymap.keep)}</kbd>
      </span>
      <span>
        <kbd>{displayKey(keymap.play)}</kbd> Play
      </span>
      <span>
        <kbd>{displayKey(keymap.cue1)}</kbd>-<kbd>{displayKey(keymap.cue8)}</kbd> Cues
      </span>
      <span>
        <kbd>{displayKey(keymap.undo)}</kbd> Undo
      </span>
    </div>
  )
}

function displayKey(value: string) {
  if (value === ' ') return 'Space'
  return value.replace('Arrow', '')
}
