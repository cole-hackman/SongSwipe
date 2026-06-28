import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQueueStore } from '@/store/queue'

vi.mock('@/lib/ipc', () => ({
  rb: vi.fn(),
  batchFileExists: vi.fn(async () => ({})),
}))

import { rb } from '@/lib/ipc'

describe('queue store', () => {
  beforeEach(() => {
    useQueueStore.setState({
      playlists: [],
      tracks: [],
      cues: [],
      cuesByTrackId: {},
      missingPaths: [],
      membershipByTrackId: {},
      currentIndex: 0,
      loading: false,
      error: null,
      sourcePlaylistId: null,
    })
    vi.mocked(rb).mockReset()
  })

  it('loads tracks for a playlist', async () => {
    vi.mocked(rb).mockImplementation(async (method) => {
      if (method === 'get_playlist_bundle') {
        return {
          tracks: [
            {
              id: '1',
              path: '/a.mp3',
              title: 'A',
              artist: '',
              album: '',
              bpm: null,
              key: '',
              rating: 0,
              colorId: 0,
              durationSec: 0,
              artworkPath: null,
              cues: [],
            },
          ],
        }
      }
      return []
    })

    await useQueueStore.getState().selectPlaylist('playlist-1')
    expect(useQueueStore.getState().tracks).toHaveLength(1)
    expect(useQueueStore.getState().sourcePlaylistId).toBe('playlist-1')
  })
})
