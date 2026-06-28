export type MidiAction = 'keep' | 'cull' | 'play'

const DEFAULT_NOTE_MAP: Record<number, MidiAction> = {
  36: 'cull',
  37: 'keep',
  38: 'play',
}

export async function setupMidi(
  onAction: (action: MidiAction) => void,
  noteMap: Record<number, MidiAction> = DEFAULT_NOTE_MAP,
): Promise<() => void> {
  if (!navigator.requestMIDIAccess) return () => {}

  const access = await navigator.requestMIDIAccess()
  const handler = (event: MIDIMessageEvent) => {
    const [status, note] = event.data ?? []
    if ((status & 0xf0) !== 0x90) return
    const action = noteMap[note]
    if (action) onAction(action)
  }

  for (const input of access.inputs.values()) {
    input.addEventListener('midimessage', handler)
  }

  return () => {
    for (const input of access.inputs.values()) {
      input.removeEventListener('midimessage', handler)
    }
  }
}
