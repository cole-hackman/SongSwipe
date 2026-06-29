import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AudioPool } from '@/audio/AudioPool'
import { resolvePlaybackUrl } from '@/audio/playback'
import { useGamepad } from '@/audio/useGamepad'
import { useMidi } from '@/audio/useMidi'
import { AuditView } from '@/components/AuditView'
import { CommitDialog } from '@/components/CommitDialog'
import { CompareView } from '@/components/CompareView'
import { HelpOverlay } from '@/components/HelpOverlay'
import { RuleSuggestionBanner } from '@/components/RuleSuggestionBanner'
import { SkipPresetButtons } from '@/components/SkipPresetButtons'
import { TransportBar } from '@/components/TransportBar'
import { TriageCardStack } from '@/components/triage/TriageCardStack'
import { SettingsDrawer } from '@/components/triage/SettingsDrawer'
import { TriageTopBar } from '@/components/triage/TriageTopBar'
import { TriageView } from '@/components/triage/TriageView'
import { UndoToast } from '@/components/UndoToast'
import { evaluateRules } from '@/lib/batch-rules'
import { getEffectivePresets } from '@/lib/cue-presets'
import {
  ensureSidecarReady,
  getSidecarStatus,
  rb,
  readSession,
  readSettings,
  writeSession,
  writeSettings,
} from '@/lib/ipc'
import { resolveKeyAction } from '@/lib/keymap'
import type { BeatMarker, DuplicateCluster, SessionMode, TrackDecision } from '@/lib/types'
import { useDecisionsStore } from '@/store/decisions'
import { useQueueStore } from '@/store/queue'
import { useSettingsStore } from '@/store/settings'

type SessionSnapshot = {
  sourcePlaylistId?: string | null
  destinationPlaylistId?: string | null
  cutPlaylistId?: string | null
  currentIndex?: number
  decisions?: Record<string, TrackDecision>
  sessionMode?: SessionMode
}

export default function App() {
  const playlists = useQueueStore((state) => state.playlists)
  const tracks = useQueueStore((state) => state.tracks)
  const cues = useQueueStore((state) => state.cues)
  const currentIndex = useQueueStore((state) => state.currentIndex)
  const error = useQueueStore((state) => state.error)
  const loading = useQueueStore((state) => state.loading)
  const missingPaths = useQueueStore((state) => state.missingPaths)
  const sourcePlaylistId = useQueueStore((state) => state.sourcePlaylistId)
  const smartCuesByTrackId = useQueueStore((state) => state.smartCuesByTrackId)
  const currentTrack = useQueueStore((state) => state.currentTrack)
  const next = useQueueStore((state) => state.next)
  const setCurrentIndex = useQueueStore((state) => state.setCurrentIndex)
  const loadPlaylists = useQueueStore((state) => state.loadPlaylists)
  const selectPlaylist = useQueueStore((state) => state.selectPlaylist)

  const hydrate = useDecisionsStore((state) => state.hydrate)
  const decide = useDecisionsStore((state) => state.decide)
  const patch = useDecisionsStore((state) => state.patch)
  const undo = useDecisionsStore((state) => state.undo)
  const getDecision = useDecisionsStore((state) => state.getForTrack)
  const decisions = useDecisionsStore((state) => state.decisions)

  const prefetchAhead = useSettingsStore((state) => state.prefetchAhead)
  const prefetchBehind = useSettingsStore((state) => state.prefetchBehind)
  const destinationPlaylistId = useSettingsStore((state) => state.destinationPlaylistId)
  const cutPlaylistId = useSettingsStore((state) => state.cutPlaylistId)
  const autoPlay = useSettingsStore((state) => state.autoPlay)
  const batchRules = useSettingsStore((state) => state.batchRules)
  const sessionMode = useSettingsStore((state) => state.sessionMode)
  const cuePlacementMode = useSettingsStore((state) => state.cuePlacementMode)
  const waveformBarWidth = useSettingsStore((state) => state.waveformBarWidth)
  const waveformNormalize = useSettingsStore((state) => state.waveformNormalize)
  const waveformFastMode = useSettingsStore((state) => state.waveformFastMode)
  const keymap = useSettingsStore((state) => state.keymap)
  const gamepadEnabled = useSettingsStore((state) => state.gamepadEnabled)
  const midiEnabled = useSettingsStore((state) => state.midiEnabled)
  const setDestinationPlaylistId = useSettingsStore((state) => state.setDestinationPlaylistId)
  const setCutPlaylistId = useSettingsStore((state) => state.setCutPlaylistId)
  const setSessionMode = useSettingsStore((state) => state.setSessionMode)
  const hydrateSettings = useSettingsStore((state) => state.hydrate)
  const zeroRatingOnCut = useSettingsStore((state) => state.zeroRatingOnCut)

  const [isPlaying, setIsPlaying] = useState(false)
  const [toast, setToast] = useState('')
  const [commitOpen, setCommitOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [sidecarError, setSidecarError] = useState<string | null>(null)
  const [sidecarReady, setSidecarReady] = useState<boolean | null>(null)
  const [duplicateClusters, setDuplicateClusters] = useState<DuplicateCluster[]>([])
  const [beatgrid, setBeatgrid] = useState<BeatMarker[]>([])
  const [playbackSec, setPlaybackSec] = useState(0)
  const [playbackDuration, setPlaybackDuration] = useState(0)
  const [activeElement, setActiveElement] = useState<HTMLAudioElement | null>(null)
  const [dismissedRuleTrackIds, setDismissedRuleTrackIds] = useState<Set<string>>(new Set())
  const [leanDirection, setLeanDirection] = useState<'keep' | 'cut' | null>(null)
  const [missingPathsDismissed, setMissingPathsDismissed] = useState<string | null>(null)

  const track = currentTrack()
  const poolRef = useRef<AudioPool | null>(null)
  const trackPathsKey = useMemo(() => tracks.map((item) => item.path).join('|'), [tracks])
  const pool = useMemo(() => {
    if (poolRef.current) return poolRef.current
    const instance = new AudioPool({
      ahead: prefetchAhead,
      behind: prefetchBehind,
      resolveUrl: resolvePlaybackUrl,
    })
    poolRef.current = instance
    return instance
  }, [prefetchAhead, prefetchBehind])

  const cuePresets = useMemo(() => {
    return track ? getEffectivePresets(track, cues, smartCuesByTrackId[track.id], cuePlacementMode) : []
  }, [track, cues, smartCuesByTrackId, cuePlacementMode])
  const activeRule = useMemo(() => {
    if (!track || dismissedRuleTrackIds.has(track.id)) return null
    return evaluateRules(track, batchRules)
  }, [track, batchRules, dismissedRuleTrackIds])

  useEffect(() => {
    void (async () => {
      try {
        const settings = await readSettings()
        hydrateSettings(settings)
      } catch {
        // Browser-only preview does not have the Electron preload bridge.
      }
    })()
  }, [hydrateSettings])

  useEffect(() => {
    void (async () => {
      try {
        const readyStatus = await ensureSidecarReady()
        if (readyStatus.state === 'error') {
          const detail = await getSidecarStatus().catch(() => readyStatus)
          setSidecarReady(false)
          setSidecarError(formatSidecarError(detail.error, detail.stderr))
          return
        }

        setSidecarReady(true)
        setSidecarError(null)
      } catch {
        // Browser-only preview does not have the Electron preload bridge.
      }
    })()
  }, [])

  useEffect(() => {
    if (sidecarReady !== true) return
    void loadPlaylists()
  }, [loadPlaylists, sidecarReady])

  useEffect(() => {
    if (sidecarReady == null) return

    void (async () => {
      try {
        const session = await readSession<SessionSnapshot>()
        if (!session) return

        if (session.destinationPlaylistId) setDestinationPlaylistId(session.destinationPlaylistId)
        if (session.cutPlaylistId) setCutPlaylistId(session.cutPlaylistId)
        if (session.sessionMode) setSessionMode(session.sessionMode)
        if (sidecarReady && session.sourcePlaylistId) {
          await selectPlaylist(session.sourcePlaylistId)
          if (typeof session.currentIndex === 'number') {
            setCurrentIndex(session.currentIndex)
          }
        }
        if (session.decisions) {
          hydrate(session.decisions)
        }
      } catch {
        // Browser-only preview does not have the Electron preload bridge.
      }
    })()
  }, [
    hydrate,
    selectPlaylist,
    setCutPlaylistId,
    setCurrentIndex,
    setDestinationPlaylistId,
    setSessionMode,
    sidecarReady,
  ])

  const dismissToast = useCallback(() => setToast(''), [])

  useEffect(() => {
    setAudioError(null)
    setIsPlaying(false)
  }, [track?.id])

  useEffect(() => {
    if (loading || !tracks.length) return
    void pool
      .setTracks(
        tracks.map((item) => ({ path: item.path })),
        currentIndex,
      )
      .catch(() => {
        // Preparation errors surface when the user presses play.
      })
  }, [pool, trackPathsKey, loading, tracks, currentIndex])

  useEffect(() => {
    if (loading || !tracks.length) return
    void pool.setCurrent(currentIndex).then(() => {
      setIsPlaying(false)
      setActiveElement(pool.active())
    })
  }, [pool, currentIndex, loading, tracks.length])

  useEffect(() => {
    return () => {
      poolRef.current?.releaseAll()
    }
  }, [])

  useEffect(() => {
    setActiveElement(pool.active())
  }, [track?.id])

  useEffect(() => {
    if (!autoPlay || loading || !track) return
    void pool.play(currentIndex).then(
      () => {
        setIsPlaying(true)
        setActiveElement(pool.active())
      },
      (error: unknown) => {
        setIsPlaying(false)
        setAudioError(error instanceof Error ? error.message : 'Playback failed')
      },
    )
  }, [autoPlay, currentIndex, loading, pool, track?.id, track])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void writeSession({
        sourcePlaylistId,
        destinationPlaylistId,
        cutPlaylistId,
        currentIndex,
        decisions,
        sessionMode,
      })
    }, 3000)

    return () => window.clearInterval(timer)
  }, [cutPlaylistId, currentIndex, decisions, destinationPlaylistId, sessionMode, sourcePlaylistId])

  useEffect(() => {
    if (sidecarReady !== true) {
      setBeatgrid([])
      return
    }
    if (!track) {
      setBeatgrid([])
      return
    }

    void rb<BeatMarker[]>('get_beatgrid', { trackId: track.id })
      .then(setBeatgrid)
      .catch(() => setBeatgrid([]))
  }, [sidecarReady, track?.id, track])

  useEffect(() => {
    if (sidecarReady !== true) {
      setDuplicateClusters([])
      return
    }
    if (!sourcePlaylistId) {
      setDuplicateClusters([])
      return
    }

    void rb<DuplicateCluster[]>('find_duplicates', { playlistId: sourcePlaylistId })
      .then(setDuplicateClusters)
      .catch(() => setDuplicateClusters([]))
  }, [sidecarReady, sourcePlaylistId])

  const analyzingTrackIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (cuePlacementMode !== 'smart' || !tracks.length) return

    const prefetchLimit = Math.min(currentIndex + 5, tracks.length)
    for (let i = currentIndex; i < prefetchLimit; i++) {
      const t = tracks[i]
      if (!t) continue
      if (!smartCuesByTrackId[t.id] && !analyzingTrackIds.current.has(t.id)) {
        analyzingTrackIds.current.add(t.id)
        void (async (track) => {
          try {
            const onsets = await rb<number[]>('analyze_track_cues', { trackPath: track.path })
            const mappedCues = onsets.map((time, idx) => ({
              name: `Cue ${idx + 1}`,
              type: 0,
              positionSec: time,
            }))
            useQueueStore.setState((s) => ({
              smartCuesByTrackId: {
                ...s.smartCuesByTrackId,
                [track.id]: mappedCues,
              },
            }))
          } catch (e) {
            console.error('Error pre-fetching smart cues:', e)
          } finally {
            analyzingTrackIds.current.delete(track.id)
          }
        })(t)
      }
    }
  }, [tracks, currentIndex, cuePlacementMode, smartCuesByTrackId])

  useEffect(() => {
    if (!activeElement) return

    const onTimeUpdate = () => {
      setPlaybackSec(activeElement.currentTime)
      if (Number.isFinite(activeElement.duration) && activeElement.duration > 0) {
        setPlaybackDuration(activeElement.duration)
      }
    }

    activeElement.addEventListener('timeupdate', onTimeUpdate)
    activeElement.addEventListener('durationchange', onTimeUpdate)
    onTimeUpdate()
    return () => {
      activeElement.removeEventListener('timeupdate', onTimeUpdate)
      activeElement.removeEventListener('durationchange', onTimeUpdate)
    }
  }, [activeElement])

  useEffect(() => {
    setPlaybackSec(0)
    setPlaybackDuration(track?.durationSec ?? 0)
  }, [track?.id, track?.durationSec, track])

  const handleUndo = useCallback(() => {
    const entry = undo()
    if (!entry) return
    const idx = tracks.findIndex((item) => item.id === entry.trackId)
    setCurrentIndex(idx >= 0 ? idx : entry.queueIndex)
    setToast('Undid last decision')
  }, [setCurrentIndex, tracks, undo])

  const handleKeep = useCallback(() => {
    if (!track) return
    decide(
      track.id,
      {
        keep: true,
        rating: getDecision(track.id)?.rating ?? track.rating,
        colorId: getDecision(track.id)?.colorId ?? track.colorId,
        destPlaylistId: getDecision(track.id)?.destPlaylistId ?? destinationPlaylistId ?? undefined,
      },
      currentIndex,
    )
    setToast(`Kept ${track.title}`)
    next()
  }, [currentIndex, decide, destinationPlaylistId, getDecision, next, track])

  const handleCut = useCallback(() => {
    if (!track) return
    const existing = getDecision(track.id)
    decide(
      track.id,
      {
        keep: false,
        ...(existing?.rating != null
          ? { rating: existing.rating }
          : zeroRatingOnCut
            ? { rating: 0 }
            : {}),
        ...(existing?.colorId != null ? { colorId: existing.colorId } : { colorId: track.colorId }),
        cutPlaylistId: cutPlaylistId ?? undefined,
      },
      currentIndex,
    )
    setToast(`Cut ${track.title}`)
    next()
  }, [cutPlaylistId, currentIndex, decide, getDecision, next, track, zeroRatingOnCut])

  const leanKeep = useCallback(() => {
    setLeanDirection('keep')
    handleKeep()
  }, [handleKeep])

  const leanCut = useCallback(() => {
    setLeanDirection('cut')
    handleCut()
  }, [handleCut])

  const seekTo = useCallback(
    (seconds: number) => {
      const safe = Math.max(0, seconds)
      pool.seek(safe)
      const element = pool.active()
      setPlaybackSec(element ? element.currentTime : safe)
    },
    [pool],
  )

  const togglePlay = useCallback(async () => {
    try {
      const active = await pool.ensureReady(currentIndex)
      setActiveElement(active)
      if (active.paused) {
        await pool.play(currentIndex)
        setIsPlaying(true)
        setAudioError(null)
      } else {
        pool.pause()
        setIsPlaying(false)
      }
    } catch (error) {
      setIsPlaying(false)
      setAudioError(error instanceof Error ? error.message : 'Playback failed')
    }
  }, [currentIndex, pool])

  const jumpToCue = useCallback(
    (positionSec: number) => {
      void (async () => {
        try {
          const active = await pool.ensureReady(currentIndex)
          setActiveElement(active)
          seekTo(positionSec)
          await pool.play(currentIndex)
          setIsPlaying(true)
          setAudioError(null)
        } catch (error) {
          setIsPlaying(false)
          setAudioError(error instanceof Error ? error.message : 'Playback failed')
        }
      })()
    },
    [currentIndex, pool, seekTo],
  )

  const handleModeChange = useCallback(
    (mode: SessionMode) => {
      setSessionMode(mode)
      void writeSettings({ sessionMode: mode })
    },
    [setSessionMode],
  )

  const handleInputAction = useCallback(
    (action: 'keep' | 'cut' | 'play') => {
      if (action === 'keep') leanKeep()
      if (action === 'cut') leanCut()
      if (action === 'play') void togglePlay()
    },
    [leanCut, leanKeep, togglePlay],
  )

  const handleAuditSelect = useCallback(
    (index: number) => {
      setCurrentIndex(index)
      void pool.play(index).then(
        () => setIsPlaying(true),
        (error: unknown) => {
          setIsPlaying(false)
          setAudioError(error instanceof Error ? error.message : 'Playback failed')
        },
      )
    },
    [pool, setCurrentIndex],
  )

  const handleDuplicateSelect = useCallback(
    (trackId: string) => {
      const idx = tracks.findIndex((item) => item.id === trackId)
      if (idx >= 0) setCurrentIndex(idx)
    },
    [setCurrentIndex, tracks],
  )

  useGamepad(gamepadEnabled && sessionMode === 'triage', handleInputAction)
  useMidi(midiEnabled && sessionMode === 'triage', handleInputAction)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return

      const action = resolveKeyAction(event, keymap)
      if (!action) return

      if (action === 'help') {
        setHelpOpen(true)
        return
      }

      if (action === 'undo') {
        if (event.metaKey || event.ctrlKey) return
        handleUndo()
        return
      }

      if (action === 'play') {
        event.preventDefault()
        void togglePlay()
        return
      }

      if (sessionMode !== 'triage') return

      if (action === 'keep') {
        event.preventDefault()
        leanKeep()
        return
      }

      if (action === 'cut') {
        event.preventDefault()
        leanCut()
        return
      }

      if (action.startsWith('cue')) {
        const index = Number(action.replace('cue', '')) - 1
        const cue = cues[index]
        if (cue) jumpToCue(cue.positionSec)
        return
      }

      if (action.startsWith('rate') && track) {
        patch(track.id, { rating: Number(action.replace('rate', '')) })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [cues, handleUndo, jumpToCue, keymap, leanCut, leanKeep, patch, sessionMode, togglePlay, track])

  const activeDecision = track ? getDecision(track.id) : undefined
  const rating = activeDecision?.rating ?? track?.rating ?? 0
  const colorId = activeDecision?.colorId ?? track?.colorId ?? 0

  return (
    <div className="app-shell">
      <TriageTopBar
        currentIndex={currentIndex}
        mode={sessionMode}
        onCommit={() => setCommitOpen(true)}
        onModeChange={handleModeChange}
        onOpenSettings={() => setSettingsOpen(true)}
        playlists={playlists}
        sourcePlaylistId={sourcePlaylistId}
        trackCount={tracks.length}
      />

      {sidecarError ? <div className="error-banner">{sidecarError}</div> : null}
      {error ? <div className="error-banner">{formatLibraryError(error)}</div> : null}
      {missingPaths.length > 0 && missingPathsDismissed !== missingPaths.join('|') ? (
        <div className="error-banner error-banner--dismissible">
          <span>{missingPaths.length} track file(s) missing in playlist.</span>
          <button
            type="button"
            className="error-banner__dismiss"
            aria-label="Dismiss missing-files notice"
            onClick={() => setMissingPathsDismissed(missingPaths.join('|'))}
          >
            ×
          </button>
        </div>
      ) : null}
      {audioError ? (
        <div className="error-banner error-banner--dismissible">
          <span>{audioError}</span>
          <button
            type="button"
            className="error-banner__dismiss"
            aria-label="Dismiss playback error"
            onClick={() => setAudioError(null)}
          >
            ×
          </button>
        </div>
      ) : null}

      {activeRule && sessionMode === 'triage' ? (
        <RuleSuggestionBanner
          rule={activeRule}
          onAccept={() => {
            if (activeRule.action === 'suggest_keep') handleKeep()
            else handleCut()
          }}
          onDismiss={() => {
            if (track) {
              setDismissedRuleTrackIds((previous) => new Set(previous).add(track.id))
            }
          }}
        />
      ) : null}

      <TriageView
        clusters={duplicateClusters}
        colorId={colorId}
        keymap={keymap}
        leanDirection={leanDirection}
        showKeyboardHint={sessionMode === 'triage'}
        onLeanChange={setLeanDirection}
        onCut={leanCut}
        onKeep={leanKeep}
        onOpenHelp={() => setHelpOpen(true)}
        onSelectTrack={handleDuplicateSelect}
        rating={rating}
        track={track}
        tracks={tracks}
        centerContent={
          loading ? (
            <div className="empty-state">Loading…</div>
          ) : !tracks.length ? (
            <div className="empty-state">Select a Rekordbox playlist to start cutting.</div>
          ) : sessionMode === 'triage' ? (
            track ? (
              <TriageCardStack
                beatgrid={beatgrid}
                cues={cues}
                fastMode={waveformFastMode}
                leanDirection={leanDirection}
                media={pool.active()}
                normalize={waveformNormalize}
                onCut={leanCut}
                onKeep={leanKeep}
                onLean={setLeanDirection}
                onSeek={seekTo}
                presets={cuePresets}
                track={track}
                waveformBarWidth={waveformBarWidth}
              />
            ) : null
          ) : sessionMode === 'audit' ? (
            <AuditView tracks={tracks} decisions={decisions} onSelectIndex={handleAuditSelect} />
          ) : sessionMode === 'compare' ? (
            <CompareView tracks={tracks} />
          ) : null
        }
      />

      {sessionMode !== 'compare' ? (
        <TransportBar
          isPlaying={isPlaying}
          currentSec={playbackSec}
          durationSec={playbackDuration || track?.durationSec || 0}
          onTogglePlay={() => void togglePlay()}
          onSeek={seekTo}
        >
          <SkipPresetButtons presets={cuePresets} onJump={jumpToCue} />
        </TransportBar>
      ) : null}

      <UndoToast message={toast} onDismiss={dismissToast} />
      <CommitDialog open={commitOpen} onClose={() => setCommitOpen(false)} />
      <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

function formatSidecarError(error?: string, stderr?: string): string {
  const detail = (stderr || error || '').trim()
  if (/No module named|pyrekordbox|ENOENT|not found/i.test(detail)) {
    return `Rekordbox sidecar failed to start. Run: python3 -m venv .venv && .venv/bin/pip install -r sidecar/requirements.txt. ${detail}`
  }
  return `Rekordbox sidecar failed to start. ${detail || 'Unknown error'}`
}

function formatLibraryError(message: string): string {
  if (/master\.db|SONGSWIPE_DB_PATH|unlock|sqlcipher/i.test(message)) {
    return `Rekordbox library unavailable. Ensure Rekordbox 7 is installed, quit Rekordbox while SongSwipe reads the library, or set SONGSWIPE_DB_PATH to a master.db copy. ${message}`
  }
  return message
}
