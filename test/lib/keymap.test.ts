import { describe, expect, it } from 'vitest'
import { DEFAULT_KEYMAP, resolveKeyAction } from '@/lib/keymap'

describe('resolveKeyAction', () => {
  it('maps ArrowRight to keep', () => {
    const event = {
      key: 'ArrowRight',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
    } as KeyboardEvent
    expect(resolveKeyAction(event, DEFAULT_KEYMAP)).toBe('keep')
  })
})
