import { useEffect } from 'react'
import { setupMidi, type MidiAction } from '@/audio/midi'

export function useMidi(enabled: boolean, onAction: (action: MidiAction) => void) {
  useEffect(() => {
    if (!enabled) return
    let cleanup = () => {}
    void setupMidi(onAction).then((dispose) => {
      cleanup = dispose
    })
    return () => cleanup()
  }, [enabled, onAction])
}
