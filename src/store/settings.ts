import { create } from 'zustand'

type SettingsState = {
  prefetchAhead: number
  prefetchBehind: number
  destinationPlaylistId: string | null
  cullPlaylistId: string | null
  dbPathOverride: string | null
  setDestinationPlaylistId: (id: string | null) => void
  setCullPlaylistId: (id: string | null) => void
  setDbPathOverride: (path: string | null) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  prefetchAhead: 5,
  prefetchBehind: 2,
  destinationPlaylistId: null,
  cullPlaylistId: null,
  dbPathOverride: null,
  setDestinationPlaylistId: (id) => set({ destinationPlaylistId: id }),
  setCullPlaylistId: (id) => set({ cullPlaylistId: id }),
  setDbPathOverride: (path) => set({ dbPathOverride: path }),
}))
