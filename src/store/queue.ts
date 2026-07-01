import { create } from 'zustand'
import type { Cue, Playlist, Track, TrackMembership } from '@/lib/types'
import { batchFileExists, rb } from '@/lib/ipc'
import { useSettingsStore } from '@/store/settings'

type BundleTrack = Track & { cues?: Cue[] }

async function enrichPlaylist(tracks: Track[]) {
  const { destinationPlaylistId, cutPlaylistId } = useSettingsStore.getState()
  const playlistIds = [destinationPlaylistId, cutPlaylistId].filter(Boolean) as string[]
  const paths = tracks.map((t) => t.path).filter(Boolean)

  const [existsMap, membership] = await Promise.all([
    paths.length ? batchFileExists(paths) : Promise.resolve({} as Record<string, boolean>),
    playlistIds.length
      ? rb<Record<string, string[]>>('get_playlist_membership', { playlistIds })
      : Promise.resolve({} as Record<string, string[]>),
  ])

  const missingPaths = paths.filter((p) => !existsMap[p])
  const destSet = new Set(membership[destinationPlaylistId ?? ''] ?? [])
  const cutSet = new Set(membership[cutPlaylistId ?? ''] ?? [])
  const membershipByTrackId: Record<string, TrackMembership> = {}
  for (const t of tracks) {
    membershipByTrackId[t.id] = { inDest: destSet.has(t.id), inCut: cutSet.has(t.id) }
  }
  useQueueStore.setState({ missingPaths, membershipByTrackId })
}

type QueueState = {
  playlists: Playlist[]
  tracks: Track[]
  cues: Cue[]
  cuesByTrackId: Record<string, Cue[]>
  smartCuesByTrackId: Record<string, Cue[]>
  missingPaths: string[]
  membershipByTrackId: Record<string, TrackMembership>
  currentIndex: number
  loading: boolean
  error: string | null
  sourcePlaylistId: string | null
  loadPlaylists: () => Promise<void>
  selectPlaylist: (playlistId: string) => Promise<void>
  loadCuesForCurrent: () => Promise<void>
  setCurrentIndex: (index: number) => void
  next: () => void
  previous: () => void
  currentTrack: () => Track | null
}

export const useQueueStore = create<QueueState>((set, get) => ({
  playlists: [],
  tracks: [],
  cues: [],
  cuesByTrackId: {},
  smartCuesByTrackId: {},
  missingPaths: [],
  membershipByTrackId: {},
  currentIndex: 0,
  loading: false,
  error: null,
  sourcePlaylistId: null,

  async loadPlaylists() {
    set({ loading: true, error: null })
    try {
      const playlists = await rb<Playlist[]>('get_playlists')
      set({ playlists, loading: false })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load playlists',
      })
    }
  },

  async selectPlaylist(playlistId) {
    set({
      loading: true,
      error: null,
      sourcePlaylistId: playlistId,
      cuesByTrackId: {},
      missingPaths: [],
      membershipByTrackId: {},
    })
    try {
      const bundle = await rb<{ tracks: BundleTrack[] }>('get_playlist_bundle', {
        playlistId,
        includeCues: true,
      })
      const cuesByTrackId: Record<string, Cue[]> = {}
      const tracks: Track[] = []
      for (const { cues, ...track } of bundle.tracks) {
        tracks.push(track)
        if (cues?.length) cuesByTrackId[track.id] = cues
      }
      const firstId = tracks[0]?.id
      set({
        tracks,
        currentIndex: 0,
        cuesByTrackId,
        cues: firstId ? (cuesByTrackId[firstId] ?? []) : [],
        loading: false,
      })
      void enrichPlaylist(tracks)
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load tracks',
      })
    }
  },

  async loadCuesForCurrent() {
    const track = get().currentTrack()
    if (!track) {
      set({ cues: [] })
      return
    }
    const cached = get().cuesByTrackId[track.id]
    if (cached) {
      set({ cues: cached })
      return
    }
    try {
      const cues = await rb<Cue[]>('get_cues', { trackId: track.id })
      set({ cues, cuesByTrackId: { ...get().cuesByTrackId, [track.id]: cues } })
    } catch {
      set({ cues: [] })
    }
  },

  setCurrentIndex(index) {
    const { tracks } = get()
    const nextIndex = Math.max(0, Math.min(index, Math.max(tracks.length - 1, 0)))
    set({ currentIndex: nextIndex })
    void get().loadCuesForCurrent()
  },

  next() {
    const { currentIndex, tracks } = get()
    if (currentIndex < tracks.length - 1) {
      get().setCurrentIndex(currentIndex + 1)
    }
  },

  previous() {
    const { currentIndex } = get()
    if (currentIndex > 0) {
      get().setCurrentIndex(currentIndex - 1)
    }
  },

  currentTrack() {
    const { tracks, currentIndex } = get()
    return tracks[currentIndex] ?? null
  },
}))
