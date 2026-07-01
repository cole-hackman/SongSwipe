import type { ReactNode } from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { useDecisionsStore } from '@/store/decisions'
import { useQueueStore } from '@/store/queue'
import { useSettingsStore } from '@/store/settings'

const selectPlaylist = vi.fn(async () => {})
const loadPlaylists = vi.fn(async () => {})
const setCurrentIndex = vi.fn()

vi.mock('@/audio/AudioPool', () => ({
  AudioPool: class {
    setTracks = vi.fn(async () => {})
    setCurrent = vi.fn(async () => {})
    play = vi.fn(async () => {})
    pause = vi.fn(async () => {})
    resume = vi.fn(async () => {})
    releaseAll = vi.fn()
    active() {
      return null
    }
    seek() {}
    currentTime() {
      return 0
    }
    duration() {
      return 0
    }
  },
}))

vi.mock('@/audio/playback', () => ({
  resolvePlaybackUrl: vi.fn(async () => null),
}))

vi.mock('@/audio/useGamepad', () => ({
  useGamepad: vi.fn(),
}))

vi.mock('@/audio/useMidi', () => ({
  useMidi: vi.fn(),
}))

vi.mock('@/components/AuditView', () => ({
  AuditView: () => <div />,
}))

vi.mock('@/components/CommitDialog', () => ({
  CommitDialog: () => <div />,
}))

vi.mock('@/components/CompareView', () => ({
  CompareView: () => <div />,
}))

vi.mock('@/components/CueButtons', () => ({
  CueButtons: () => <div />,
}))

vi.mock('@/components/DestinationPlaylist', () => ({
  DestinationPlaylist: () => <div />,
}))

vi.mock('@/components/DuplicatesPanel', () => ({
  DuplicatesPanel: () => <div />,
}))

vi.mock('@/components/HelpOverlay', () => ({
  HelpOverlay: () => <div />,
}))

vi.mock('@/components/KeymapSettings', () => ({
  KeymapSettings: () => <div />,
}))

vi.mock('@/components/LibrarySettings', () => ({
  LibrarySettings: () => <div />,
}))

vi.mock('@/components/NamedSessions', () => ({
  NamedSessions: () => <div />,
}))

vi.mock('@/components/PlaylistNav', () => ({
  PlaylistNav: () => <div data-testid="playlist-nav" />,
}))

vi.mock('@/components/RuleSuggestionBanner', () => ({
  RuleSuggestionBanner: () => <div />,
}))

vi.mock('@/components/SkipPresetButtons', () => ({
  SkipPresetButtons: () => <div />,
}))

vi.mock('@/components/StatsPanel', () => ({
  StatsPanel: () => <div />,
}))

vi.mock('@/components/TransportBar', () => ({
  TransportBar: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/triage/TriageTopBar', () => ({
  TriageTopBar: () => <div />,
}))

vi.mock('@/components/triage/TriageView', () => ({
  TriageView: () => <div />,
}))

vi.mock('@/components/UndoToast', () => ({
  UndoToast: () => <div />,
}))

vi.mock('@/lib/batch-rules', () => ({
  evaluateRules: vi.fn(() => null),
}))

vi.mock('@/lib/cue-presets', () => ({
  buildCuePresets: vi.fn(() => []),
}))

vi.mock('@/lib/ipc', () => ({
  ensureSidecarReady: vi.fn(async () => ({ state: 'ready' })),
  getSidecarStatus: vi.fn(async () => ({ state: 'ready' })),
  rb: vi.fn(async () => []),
  readSession: vi.fn(async () => ({ sourcePlaylistId: 'playlist-1', currentIndex: 2 })),
  readSettings: vi.fn(async () => ({})),
  writeSession: vi.fn(async () => undefined),
  writeSettings: vi.fn(async () => undefined),
}))

describe('App bootstrap', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    loadPlaylists.mockClear()
    selectPlaylist.mockClear()
    setCurrentIndex.mockClear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

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
      loadPlaylists,
      selectPlaylist,
      setCurrentIndex,
      currentTrack: () => null,
      next: vi.fn(),
    })

    useDecisionsStore.setState({
      decisions: {},
      history: [],
    })

    useSettingsStore.setState({
      destinationPlaylistId: null,
      cutPlaylistId: null,
      sessionMode: 'triage',
      autoPlay: false,
      waveformBarWidth: 2,
      waveformNormalize: true,
      waveformFastMode: false,
      batchRules: [],
      gamepadEnabled: false,
      midiEnabled: false,
    })
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('loads playlists when the sidecar becomes ready and restores the last source playlist', async () => {
    await act(async () => {
      root.render(<App />)
    })

    await vi.waitFor(() => expect(loadPlaylists).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(selectPlaylist).toHaveBeenCalledWith('playlist-1'))
    expect(setCurrentIndex).toHaveBeenCalledWith(2)
  })
})
