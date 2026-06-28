export type GamepadAction = 'keep' | 'cull' | 'play'

const DEFAULT_BINDINGS: Record<number, GamepadAction> = {
  0: 'cull',
  1: 'keep',
  2: 'play',
}

export function createGamepadLoop(
  onAction: (action: GamepadAction) => void,
  bindings: Record<number, GamepadAction> = DEFAULT_BINDINGS,
): () => void {
  const previous: Record<number, boolean> = {}
  const id = window.setInterval(() => {
    const pads = navigator.getGamepads()
    const pad = pads[0]
    if (!pad) return
    for (const [indexStr, action] of Object.entries(bindings)) {
      const index = Number(indexStr)
      const pressed = Boolean(pad.buttons[index]?.pressed)
      if (pressed && !previous[index]) onAction(action)
      previous[index] = pressed
    }
  }, 50)
  return () => window.clearInterval(id)
}
