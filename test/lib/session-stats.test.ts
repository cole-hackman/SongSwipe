import { describe, expect, it } from 'vitest'
import { computeSessionStats } from '@/lib/session-stats'
import type { Track } from '@/lib/types'

describe('computeSessionStats', () => {
  it('computes keep ratio and average BPM of keepers', () => {
    const tracks: Track[] = [
      {
        id: '1',
        path: '',
        title: '',
        artist: '',
        album: '',
        bpm: 120,
        key: '',
        rating: 0,
        colorId: 0,
        durationSec: 0,
        artworkPath: null,
      },
      {
        id: '2',
        path: '',
        title: '',
        artist: '',
        album: '',
        bpm: 140,
        key: '',
        rating: 0,
        colorId: 0,
        durationSec: 0,
        artworkPath: null,
      },
    ]
    const decisions = {
      '1': { keep: true },
      '2': { keep: false },
    }
    const stats = computeSessionStats(tracks, decisions)
    expect(stats.total).toBe(2)
    expect(stats.keepCount).toBe(1)
    expect(stats.keepRatio).toBe(0.5)
    expect(stats.avgBpmKeepers).toBe(120)
  })
})
