import { create } from 'zustand'
import type { Cue, Playlist, Track } from '@/lib/types'
import { rb } from '@/lib/ipc'

type QueueState = {
  playlists: Playlist[]
  tracks: Track[]
  cues: Cue[]
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
    set({ loading: true, error: null, sourcePlaylistId: playlistId })
    try {
      const tracks = await rb<Track[]>('get_tracks', { playlistId })
      set({ tracks, currentIndex: 0, loading: false })
      await get().loadCuesForCurrent()
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
    try {
      const cues = await rb<Cue[]>('get_cues', { trackId: track.id })
      set({ cues })
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
