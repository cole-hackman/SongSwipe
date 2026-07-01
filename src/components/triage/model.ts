import type { Playlist } from '@/lib/types'

export function formatTriageProgress(currentIndex: number, trackCount: number) {
  if (trackCount <= 0) {
    return {
      currentLabel: '00',
      totalLabel: '00',
      ratio: 0,
      reviewedLabel: '0 / 0 reviewed',
    }
  }

  const current = Math.min(Math.max(currentIndex + 1, 1), trackCount)
  return {
    currentLabel: String(current).padStart(2, '0'),
    totalLabel: String(trackCount).padStart(2, '0'),
    ratio: current / trackCount,
    reviewedLabel: `${current} / ${trackCount} reviewed`,
  }
}

export function resolveSourcePlaylistName(
  playlists: Playlist[],
  sourcePlaylistId: string | null,
) {
  if (!sourcePlaylistId) return 'No source selected'
  return playlists.find((playlist) => playlist.id === sourcePlaylistId)?.name ?? 'Unknown playlist'
}
