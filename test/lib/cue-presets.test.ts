import { describe, expect, it } from 'vitest'
import { buildCuePresets, getEffectivePresets } from '@/lib/cue-presets'
import type { Cue } from '@/lib/types'

const track = {
  id: '1',
  path: '',
  title: '',
  artist: '',
  album: '',
  bpm: 120,
  key: '',
  rating: 0,
  colorId: 0,
  durationSec: 240,
  artworkPath: null,
}

describe('buildCuePresets', () => {
  it('computes 32-bar offset from BPM', () => {
    const presets = buildCuePresets(track, [])
    const bars32 = presets.find((p) => p.id === 'bars32')
    expect(bars32?.positionSec).toBeCloseTo(64, 0)
  })

  it('computes 64-bar offset from BPM', () => {
    const presets = buildCuePresets(track, [])
    const bars64 = presets.find((p) => p.id === 'bars64')
    expect(bars64?.positionSec).toBeCloseTo(128, 0)
  })
})

describe('getEffectivePresets', () => {
  it('returns standard presets in presets mode', () => {
    const presets = getEffectivePresets(track, [], undefined, 'presets')
    expect(presets.length).toBe(4)
    expect(presets[0].id).toBe('intro')
  })

  it('returns smart cues in smart mode if they exist', () => {
    const smartCues: Cue[] = [
      { name: 'Smart 1', type: 0, positionSec: 12 },
      { name: 'Smart 2', type: 0, positionSec: 36 },
    ]
    const presets = getEffectivePresets(track, [], smartCues, 'smart')
    expect(presets).toEqual([
      { id: 'smart-0', label: 'Smart 1', positionSec: 12 },
      { id: 'smart-1', label: 'Smart 2', positionSec: 36 },
    ])
  })

  it('falls back to standard presets in smart mode if smart cues are missing', () => {
    const presets = getEffectivePresets(track, [], undefined, 'smart')
    expect(presets.length).toBe(4)
    expect(presets[0].id).toBe('intro')
  })

  it('falls back to standard presets in smart mode if smart cues array is empty', () => {
    const presets = getEffectivePresets(track, [], [], 'smart')
    expect(presets.length).toBe(4)
    expect(presets[0].id).toBe('intro')
  })
})

