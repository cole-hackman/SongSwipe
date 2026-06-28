import { describe, expect, it } from 'vitest'
import { buildCuePresets } from '@/lib/cue-presets'

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

  it('uses first cue as drop when present', () => {
    const presets = buildCuePresets(track, [{ name: 'Drop', type: 1, positionSec: 90 }])
    expect(presets.find((p) => p.id === 'drop')?.positionSec).toBe(90)
  })
})
