import { useEffect } from 'react'
import { createGamepadLoop, type GamepadAction } from '@/audio/gamepad'

export function useGamepad(enabled: boolean, onAction: (action: GamepadAction) => void) {
  useEffect(() => {
    if (!enabled) return
    return createGamepadLoop(onAction)
  }, [enabled, onAction])
}
