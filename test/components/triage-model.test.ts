import { describe, expect, it } from 'vitest'
import type { Playlist } from '@/lib/types'
import {
  formatTriageProgress,
  resolveSourcePlaylistName,
} from '@/components/triage/model'

describe('triage model helpers', () => {
  it('formats current progress for the top bar', () => {
    expect(formatTriageProgress(0, 18)).toEqual({
      currentLabel: '01',
      totalLabel: '18',
      ratio: 1 / 18,
      reviewedLabel: '1 / 18 reviewed',
    })
    expect(formatTriageProgress(17, 18)).toEqual({
      currentLabel: '18',
      totalLabel: '18',
      ratio: 1,
      reviewedLabel: '18 / 18 reviewed',
    })
    expect(formatTriageProgress(0, 0)).toEqual({
      currentLabel: '00',
      totalLabel: '00',
      ratio: 0,
      reviewedLabel: '0 / 0 reviewed',
    })
  })

  it('resolves the selected playlist name from the queue store ids', () => {
    const playlists: Playlist[] = [
      { id: 'folder', name: 'House', parentId: null, isFolder: true },
      { id: 'playlist-1', name: 'Banga', parentId: 'folder', isFolder: false },
    ]

    expect(resolveSourcePlaylistName(playlists, 'playlist-1')).toBe('Banga')
    expect(resolveSourcePlaylistName(playlists, null)).toBe('No source selected')
    expect(resolveSourcePlaylistName(playlists, 'missing')).toBe('Unknown playlist')
  })
})
