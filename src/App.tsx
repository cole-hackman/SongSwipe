import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AudioPool } from '@/audio/AudioPool'
import { useGamepad } from '@/audio/useGamepad'
import { useMidi } from '@/audio/useMidi'
import { buildCuePresets } from '@/lib/cue-presets'
import { evaluateRules } from '@/lib/batch-rules'
import { resolveKeyAction } from '@/lib/keymap'
import { AuditView } from '@/components/AuditView'
import { CommitDialog } from '@/components/CommitDialog'
import { ColorPicker } from '@/components/ColorPicker'
import { CompareView } from '@/components/CompareView'
import { CueButtons } from '@/components/CueButtons'
import { DestinationPlaylist } from '@/components/DestinationPlaylist'
import { DuplicatesPanel } from '@/components/DuplicatesPanel'
import { HelpOverlay } from '@/components/HelpOverlay'
import { KeymapSettings } from '@/components/KeymapSettings'
import { LibrarySettings } from '@/components/LibrarySettings'
import { ModeSwitcher } from '@/components/ModeSwitcher'
import { NamedSessions } from '@/components/NamedSessions'
import { PerTrackDestination } from '@/components/PerTrackDestination'
import { PlaylistNav } from '@/components/PlaylistNav'
import { RatingControl } from '@/components/RatingControl'
import { RekordboxStatus } from '@/components/RekordboxStatus'
import { RuleSuggestionBanner } from '@/components/RuleSuggestionBanner'
import { SkipPresetButtons } from '@/components/SkipPresetButtons'
import { StatsPanel } from '@/components/StatsPanel'
import { SwipeDeck } from '@/components/SwipeDeck'
import { TrackExtras } from '@/components/TrackExtras'
import { TransportBar } from '@/components/TransportBar'
import { UndoToast } from '@/components/UndoToast'
import { WaveformPlayer } from '@/components/WaveformPlayer'
import { resolvePlaybackUrl } from '@/audio/playback'
import {
  readSession,
  getSidecarStatus,
  readSettings,
  rb,
  writeSession,
  writeSettings,
} from '@/lib/ipc'
import type { BeatMarker, DuplicateCluster, SessionMode } from '@/lib/types'
import { useDecisionsStore } from '@/store/decisions'
import { useQueueStore } from '@/store/queue'
import { useSettingsStore } from '@/store/settings'

type SessionSnapshot = {
  sourcePlaylistId?: string | null
  destinationPlaylistId?: string | null
  cullPlaylistId?: string | null
  currentIndex?: number
  decisions?: Record<string, { keep: boolean; rating?: number; colorId?: number }>
  sessionMode?: SessionMode
}

export default function App() {
  const tracks = useQueueStore((s) => s.tracks)
  const cues = useQueueStore((s) => s.cues)
  const currentIndex = useQueueStore((s) => s.currentIndex)
  const error = useQueueStore((s) => s.error)
  const loading = useQueueStore((s) => s.loading)
  const missingPaths = useQueueStore((s) => s.missingPaths)
  const sourcePlaylistId = useQueueStore((s) => s.sourcePlaylistId)
  const currentTrack = useQueueStore((s) => s.currentTrack)
  const next = useQueueStore((s) => s.next)
  const setCurrentIndex = useQueueStore((s) => s.setCurrentIndex)
  const selectPlaylist = useQueueStore((s) => s.selectPlaylist)

  const hydrate = useDecisionsStore((s) => s.hydrate)
  const decide = useDecisionsStore((s) => s.decide)
  const patch = useDecisionsStore((s) => s.patch)
  const undo = useDecisionsStore((s) => s.undo)
  const getDecision = useDecisionsStore((s) => s.getForTrack)
  const decisions = useDecisionsStore((s) => s.decisions)

  const prefetchAhead = useSettingsStore((s) => s.prefetchAhead)
  const prefetchBehind = useSettingsStore((s) => s.prefetchBehind)
  const destinationPlaylistId = useSettingsStore((s) => s.destinationPlaylistId)
  const cullPlaylistId = useSettingsStore((s) => s.cullPlaylistId)
  const autoPlay = useSettingsStore((s) => s.autoPlay)
  const batchRules = useSettingsStore((s) => s.batchRules)
  const sessionMode = useSettingsStore((s) => s.sessionMode)
  const waveformBarWidth = useSettingsStore((s) => s.waveformBarWidth)
  const waveformNormalize = useSettingsStore((s) => s.waveformNormalize)
  const waveformFastMode = useSettingsStore((s) => s.waveformFastMode)
  const keymap = useSettingsStore((s) => s.keymap)
  const gamepadEnabled = useSettingsStore((s) => s.gamepadEnabled)
  const midiEnabled = useSettingsStore((s) => s.midiEnabled)
  const setDestinationPlaylistId = useSettingsStore((s) => s.setDestinationPlaylistId)
  const setCullPlaylistId = useSettingsStore((s) => s.setCullPlaylistId)
  const setSessionMode = useSettingsStore((s) => s.setSessionMode)
  const hydrateSettings = useSettingsStore((s) => s.hydrate)
  const zeroRatingOnCull = useSettingsStore((s) => s.zeroRatingOnCull)

  const [isPlaying, setIsPlaying] = useState(false)
  const [toast, setToast] = useState('')
  const [commitOpen, setCommitOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [sidecarError, setSidecarError] = useState<string | null>(null)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [playbackSec, setPlaybackSec] = useState(0)
  const [playbackDuration, setPlaybackDuration] = useState(0)
  const [dismissedRuleTrackIds, setDismissedRuleTrackIds] = useState<Set<string>>(new Set())
  const [beatgrid, setBeatgrid] = useState<BeatMarker[]>([])
  const [duplicateClusters, setDuplicateClusters] = useState<DuplicateCluster[]>([])

  const poolRef = useRef<AudioPool | null>(null)
  const track = currentTrack()

  const trackPathsKey = useMemo(() => tracks.map((t) => t.path).join('\0'), [tracks])

  const pool = useMemo(() => {
    const instance = new AudioPool({
      ahead: prefetchAhead,
      behind: prefetchBehind,
      resolveUrl: resolvePlaybackUrl,
    })
    poolRef.current = instance
    return instance
  }, [prefetchAhead, prefetchBehind])

  const cuePresets = useMemo(
    () => (track ? buildCuePresets(track, cues) : []),
    [track, cues],
  )

  const activeRule = useMemo(() => {
    if (!track || dismissedRuleTrackIds.has(track.id)) return null
    return evaluateRules(track, batchRules)
  }, [track, batchRules, dismissedRuleTrackIds])

  useEffect(() => {
    void (async () => {
      const settings = await readSettings()
      hydrateSettings(settings)
    })()
  }, [hydrateSettings])

  useEffect(() => {
    void (async () => {
      const status = await getSidecarStatus()
      if (status.state === 'error') {
        setSidecarError(formatSidecarError(status.error, status.stderr))
      }
    })()
  }, [])

  useEffect(() => {
    void (async () => {
      const session = await readSession<SessionSnapshot>()
      if (!session) return
      if (session.destinationPlaylistId) setDestinationPlaylistId(session.destinationPlaylistId)
      if (session.cullPlaylistId) setCullPlaylistId(session.cullPlaylistId)
      if (session.sessionMode) setSessionMode(session.sessionMode)
      if (session.sourcePlaylistId) {
        await selectPlaylist(session.sourcePlaylistId)
        if (typeof session.currentIndex === 'number') {
          setCurrentIndex(session.currentIndex)
        }
      }
      if (session.decisions) {
        hydrate(session.decisions)
      }
    })()
  }, [
    hydrate,
    selectPlaylist,
    setCullPlaylistId,
    setCurrentIndex,
    setDestinationPlaylistId,
    setSessionMode,
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
        tracks.map((t) => ({ path: t.path })),
        currentIndex,
      )
      .catch(() => {
        // Preparation errors surface when the user presses play.
      })
  }, [pool, trackPathsKey, loading])

  useEffect(() => {
    if (loading || !tracks.length) return
    void pool.setCurrent(currentIndex).then(() => setIsPlaying(false))
  }, [pool, currentIndex, loading, tracks.length])

  useEffect(() => {
    return () => {
      poolRef.current?.releaseAll()
    }
  }, [])

  useEffect(() => {
    if (!autoPlay || loading || !track) return
    void pool.play(currentIndex).then(
      () => setIsPlaying(true),
      (error: unknown) => {
        setIsPlaying(false)
        setAudioError(error instanceof Error ? error.message : 'Playback failed')
      },
    )
  }, [autoPlay, currentIndex, loading, pool, track?.id])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void writeSession({
        sourcePlaylistId,
        destinationPlaylistId,
        cullPlaylistId,
        currentIndex,
        decisions,
        sessionMode,
      })
    }, 3000)
    return () => window.clearInterval(timer)
  }, [cullPlaylistId, currentIndex, decisions, destinationPlaylistId, sessionMode, sourcePlaylistId])

  useEffect(() => {
    if (!track) {
      setBeatgrid([])
      return
    }
    void rb<BeatMarker[]>('get_beatgrid', { trackId: track.id })
      .then(setBeatgrid)
      .catch(() => setBeatgrid([]))
  }, [track?.id])

  useEffect(() => {
    if (!sourcePlaylistId) {
      setDuplicateClusters([])
      return
    }
    void rb<DuplicateCluster[]>('find_duplicates', { playlistId: sourcePlaylistId })
      .then(setDuplicateClusters)
      .catch(() => setDuplicateClusters([]))
  }, [sourcePlaylistId])

  useEffect(() => {
    const element = pool.active()
    if (!element) return
    const onTimeUpdate = () => {
      setPlaybackSec(element.currentTime)
      if (Number.isFinite(element.duration) && element.duration > 0) {
        setPlaybackDuration(element.duration)
      }
    }
    element.addEventListener('timeupdate', onTimeUpdate)
    onTimeUpdate()
    return () => element.removeEventListener('timeupdate', onTimeUpdate)
  }, [pool, currentIndex, track?.id])

  useEffect(() => {
    setPlaybackSec(0)
    setPlaybackDuration(track?.durationSec ?? 0)
  }, [track?.id, track?.durationSec])

  const handleUndo = useCallback(() => {
    const entry = undo()
    if (!entry) return
    const idx = tracks.findIndex((t) => t.id === entry.trackId)
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

  const handleCull = useCallback(() => {
    if (!track) return
    const existing = getDecision(track.id)
    decide(
      track.id,
      {
        keep: false,
        ...(existing?.rating != null
          ? { rating: existing.rating }
          : zeroRatingOnCull
            ? { rating: 0 }
            : {}),
        ...(existing?.colorId != null ? { colorId: existing.colorId } : { colorId: track.colorId }),
        cullPlaylistId: cullPlaylistId ?? undefined,
      },
      currentIndex,
    )
    setToast(`Culled ${track.title}`)
    next()
  }, [cullPlaylistId, currentIndex, decide, getDecision, next, track, zeroRatingOnCull])

  const togglePlay = useCallback(async () => {
    try {
      const active = await pool.ensureReady(currentIndex)
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
          await pool.ensureReady(currentIndex)
          pool.seek(positionSec)
          await pool.play(currentIndex)
          setIsPlaying(true)
          setAudioError(null)
        } catch (error) {
          setIsPlaying(false)
          setAudioError(error instanceof Error ? error.message : 'Playback failed')
        }
      })()
    },
    [currentIndex, pool],
  )

  const handleModeChange = useCallback(
    (mode: SessionMode) => {
      setSessionMode(mode)
      void writeSettings({ sessionMode: mode })
    },
    [setSessionMode],
  )

  const handleInputAction = useCallback(
    (action: 'keep' | 'cull' | 'play') => {
      if (action === 'keep') handleKeep()
      if (action === 'cull') handleCull()
      if (action === 'play') void togglePlay()
    },
    [handleCull, handleKeep, togglePlay],
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
      const idx = tracks.findIndex((t) => t.id === trackId)
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
        handleKeep()
        return
      }
      if (action === 'cull') {
        event.preventDefault()
        handleCull()
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
  }, [cues, handleCull, handleKeep, handleUndo, jumpToCue, keymap, patch, sessionMode, togglePlay, track])

  const activeDecision = track ? getDecision(track.id) : undefined
  const rating = activeDecision?.rating ?? track?.rating ?? 0
  const colorId = activeDecision?.colorId ?? track?.colorId ?? 0
  const progressLabel = tracks.length ? `${currentIndex + 1} / ${tracks.length}` : '0 / 0'

  return (
    <div className="app-shell">
      <header className="top-bar">
        <h1>SongSwipe</h1>
        <ModeSwitcher mode={sessionMode} onChange={handleModeChange} />
        <RekordboxStatus />
        <div className="top-bar__meta">{progressLabel}</div>
        <button type="button" className="btn" onClick={() => setCommitOpen(true)}>
          Commit
        </button>
      </header>

      {sidecarError ? <div className="error-banner">{sidecarError}</div> : null}
      {error ? <div className="error-banner">{formatLibraryError(error)}</div> : null}
      {missingPaths.length > 0 ? (
        <div className="error-banner">{missingPaths.length} track file(s) missing in this playlist.</div>
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
            else handleCull()
          }}
          onDismiss={() => {
            if (track) {
              setDismissedRuleTrackIds((prev) => new Set(prev).add(track.id))
            }
          }}
        />
      ) : null}

      <div className="main-layout">
        <PlaylistNav />
        <section className="center-panel">
          {loading ? <div className="empty-state">Loading…</div> : null}
          {!loading && !tracks.length ? (
            <div className="empty-state">Select a Rekordbox playlist to start culling.</div>
          ) : null}

          {sessionMode === 'triage' && track ? (
            <>
              <SwipeDeck track={track} onKeep={handleKeep} onCull={handleCull} />
              <WaveformPlayer
                media={pool.active()}
                filePath={track.path}
                cues={cues}
                beatgrid={beatgrid}
                barWidth={waveformBarWidth}
                normalize={waveformNormalize}
                fastMode={waveformFastMode}
              />
            </>
          ) : null}

          {sessionMode === 'audit' && tracks.length ? (
            <AuditView tracks={tracks} decisions={decisions} onSelectIndex={handleAuditSelect} />
          ) : null}

          {sessionMode === 'compare' ? <CompareView tracks={tracks} /> : null}
        </section>

        <aside className="right-rail">
          <DestinationPlaylist />
          <StatsPanel />
          <NamedSessions />
          <DuplicatesPanel
            clusters={duplicateClusters}
            tracks={tracks}
            onSelectTrack={handleDuplicateSelect}
          />
          <LibrarySettings />
          <KeymapSettings />
          {track && sessionMode === 'triage' ? (
            <>
              <TrackExtras track={track} />
              <PerTrackDestination trackId={track.id} />
              <RatingControl trackId={track.id} value={rating} />
              <ColorPicker trackId={track.id} value={colorId} />
              <div className="panel-block">
                <h2>Actions</h2>
                <div className="action-row">
                  <button type="button" className="btn btn--cull" onClick={handleCull}>
                    Cull
                  </button>
                  <button type="button" className="btn btn--keep" onClick={handleKeep}>
                    Keep
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </aside>
      </div>

      {sessionMode === 'triage' ? (
        <TransportBar
          isPlaying={isPlaying}
          currentSec={playbackSec}
          durationSec={playbackDuration || track?.durationSec || 0}
          onTogglePlay={() => void togglePlay()}
          onSeek={(seconds) => {
            pool.seek(seconds)
            setPlaybackSec(seconds)
          }}
        >
          <CueButtons cues={cues} onJump={jumpToCue} />
          <SkipPresetButtons presets={cuePresets} onJump={jumpToCue} />
        </TransportBar>
      ) : null}

      <UndoToast message={toast} onDismiss={dismissToast} />
      <CommitDialog open={commitOpen} onClose={() => setCommitOpen(false)} />
      <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
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
    return `Rekordbox library unavailable. Ensure Rekordbox 7 is installed, quit Rekordbox while SongSwipe reads the library, or set SONGSWIPE_DB_PATH to your master.db copy. ${message}`
  }
  return message
}
