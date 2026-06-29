import { describe, expect, it } from 'vitest'
import { useSettingsStore } from '@/store/settings'

describe('settings store', () => {
  it('manages cuePlacementMode setting and persistent hydration', () => {
    const store = useSettingsStore.getState()
    // Should default to 'presets'
    expect(store.cuePlacementMode).toBe('presets')

    useSettingsStore.getState().setCuePlacementMode('smart')
    expect(useSettingsStore.getState().cuePlacementMode).toBe('smart')

    // Verify it hydrates correctly
    useSettingsStore.getState().hydrate({ cuePlacementMode: 'presets' })
    expect(useSettingsStore.getState().cuePlacementMode).toBe('presets')

    useSettingsStore.getState().hydrate({ cuePlacementMode: 'smart' })
    expect(useSettingsStore.getState().cuePlacementMode).toBe('smart')
  })
})
