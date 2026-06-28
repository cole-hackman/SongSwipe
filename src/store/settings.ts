import { create } from 'zustand'
import { DEFAULT_KEYMAP, type KeyAction } from '@/lib/keymap'
import type { BatchRule, SessionMode } from '@/lib/types'
import type { AppSettingsPayload } from '@/lib/api'

type SettingsState = {
  prefetchAhead: number
  prefetchBehind: number
  destinationPlaylistId: string | null
  cullPlaylistId: string | null
  dbPathOverride: string | null
  zeroRatingOnCull: boolean
  autoPlay: boolean
  waveformBarWidth: number
  waveformNormalize: boolean
  waveformFastMode: boolean
  batchRules: BatchRule[]
  sessionMode: SessionMode
  keymap: Record<KeyAction, string>
  gamepadEnabled: boolean
  midiEnabled: boolean
  setDestinationPlaylistId: (id: string | null) => void
  setCullPlaylistId: (id: string | null) => void
  setDbPathOverride: (path: string | null) => void
  setZeroRatingOnCull: (value: boolean) => void
  setPrefetchAhead: (value: number) => void
  setPrefetchBehind: (value: number) => void
  setAutoPlay: (value: boolean) => void
  setWaveformBarWidth: (value: number) => void
  setWaveformNormalize: (value: boolean) => void
  setWaveformFastMode: (value: boolean) => void
  setBatchRules: (rules: BatchRule[]) => void
  setSessionMode: (mode: SessionMode) => void
  setKeymap: (keymap: Record<KeyAction, string>) => void
  setGamepadEnabled: (value: boolean) => void
  setMidiEnabled: (value: boolean) => void
  hydrate: (settings: AppSettingsPayload) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  prefetchAhead: 5,
  prefetchBehind: 2,
  destinationPlaylistId: null,
  cullPlaylistId: null,
  dbPathOverride: null,
  zeroRatingOnCull: false,
  autoPlay: false,
  waveformBarWidth: 2,
  waveformNormalize: true,
  waveformFastMode: false,
  batchRules: [],
  sessionMode: 'triage',
  keymap: { ...DEFAULT_KEYMAP },
  gamepadEnabled: false,
  midiEnabled: false,
  setDestinationPlaylistId: (id) => set({ destinationPlaylistId: id }),
  setCullPlaylistId: (id) => set({ cullPlaylistId: id }),
  setDbPathOverride: (path) => set({ dbPathOverride: path }),
  setZeroRatingOnCull: (value) => set({ zeroRatingOnCull: value }),
  setPrefetchAhead: (value) => set({ prefetchAhead: Math.max(0, value) }),
  setPrefetchBehind: (value) => set({ prefetchBehind: Math.max(0, value) }),
  setAutoPlay: (value) => set({ autoPlay: value }),
  setWaveformBarWidth: (value) => set({ waveformBarWidth: Math.max(1, Math.min(6, value)) }),
  setWaveformNormalize: (value) => set({ waveformNormalize: value }),
  setWaveformFastMode: (value) => set({ waveformFastMode: value }),
  setBatchRules: (rules) => set({ batchRules: rules }),
  setSessionMode: (mode) => set({ sessionMode: mode }),
  setKeymap: (keymap) => set({ keymap }),
  setGamepadEnabled: (value) => set({ gamepadEnabled: value }),
  setMidiEnabled: (value) => set({ midiEnabled: value }),
  hydrate: (settings) =>
    set({
      dbPathOverride: settings.dbPathOverride ?? null,
      zeroRatingOnCull: settings.zeroRatingOnCull ?? false,
      prefetchAhead: settings.prefetchAhead ?? 5,
      prefetchBehind: settings.prefetchBehind ?? 2,
      autoPlay: settings.autoPlay ?? false,
      waveformBarWidth: settings.waveformBarWidth ?? 2,
      waveformNormalize: settings.waveformNormalize ?? true,
      waveformFastMode: settings.waveformFastMode ?? false,
      batchRules: (settings.batchRules as BatchRule[] | undefined) ?? [],
      sessionMode: settings.sessionMode ?? 'triage',
      keymap: settings.keymap ?? { ...DEFAULT_KEYMAP },
      gamepadEnabled: settings.gamepadEnabled ?? false,
      midiEnabled: settings.midiEnabled ?? false,
    }),
}))

