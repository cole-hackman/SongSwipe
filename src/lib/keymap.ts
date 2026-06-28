export type KeyAction =
  | 'keep'
  | 'cull'
  | 'play'
  | 'undo'
  | 'help'
  | 'cue1'
  | 'cue2'
  | 'cue3'
  | 'cue4'
  | 'cue5'
  | 'cue6'
  | 'cue7'
  | 'cue8'
  | 'rate1'
  | 'rate2'
  | 'rate3'
  | 'rate4'
  | 'rate5'

export const KEY_ACTIONS: KeyAction[] = [
  'keep',
  'cull',
  'play',
  'undo',
  'help',
  'cue1',
  'cue2',
  'cue3',
  'cue4',
  'cue5',
  'cue6',
  'cue7',
  'cue8',
  'rate1',
  'rate2',
  'rate3',
  'rate4',
  'rate5',
]

export const DEFAULT_KEYMAP: Record<KeyAction, string> = {
  keep: 'ArrowRight',
  cull: 'ArrowLeft',
  play: ' ',
  undo: 'z',
  help: '?',
  cue1: '1',
  cue2: '2',
  cue3: '3',
  cue4: '4',
  cue5: '5',
  cue6: '6',
  cue7: '7',
  cue8: '8',
  rate1: 'Shift+1',
  rate2: 'Shift+2',
  rate3: 'Shift+3',
  rate4: 'Shift+4',
  rate5: 'Shift+5',
}

export function resolveKeyAction(
  event: KeyboardEvent,
  map: Record<KeyAction, string>,
): KeyAction | null {
  const pressed = event.shiftKey ? `Shift+${event.key}` : event.key
  for (const action of KEY_ACTIONS) {
    if (map[action] === pressed) return action
  }
  return null
}
