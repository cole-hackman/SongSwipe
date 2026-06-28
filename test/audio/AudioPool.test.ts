import { describe, expect, it, vi } from 'vitest'
import { AudioPool } from '@/audio/AudioPool'

describe('AudioPool', () => {
  it('retains up to 2 behind and 5 ahead of the current index', async () => {
    const resolveUrl = vi.fn(async (path: string) => `file://${path}`)
    const pool = new AudioPool({ ahead: 5, behind: 2, resolveUrl })
    const tracks = Array.from({ length: 12 }, (_, index) => ({ path: `/track-${index}.mp3` }))
    await pool.setTracks(tracks)
    await pool.setCurrent(3)

    expect(pool.loadedIndices()).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
})
