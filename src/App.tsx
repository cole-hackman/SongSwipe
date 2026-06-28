import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AudioPool } from '@/audio/AudioPool'
import { CommitDialog } from '@/components/CommitDialog'
import { ColorPicker } from '@/components/ColorPicker'
import { CueButtons } from '@/components/CueButtons'
import { DestinationPlaylist } from '@/components/DestinationPlaylist'
import { HelpOverlay } from '@/components/HelpOverlay'
import { PlaylistPicker } from '@/components/PlaylistPicker'
import { RatingControl } from '@/components/RatingControl'
import { SwipeDeck } from '@/components/SwipeDeck'
import { TransportBar } from '@/components/TransportBar'
import { UndoToast } from '@/components/UndoToast'
import { WaveformPlayer } from '@/components/WaveformPlayer'
import { readSession, toMediaUrl, writeSession } from '@/lib/ipc'
import { useDecisionsStore } from '@/store/decisions'
import { useQueueStore } from '@/store/queue'
import { useSettingsStore } from '@/store/settings'

type SessionSnapshot = {
  sourcePlaylistId?: string | null
  destinationPlaylistId?: string | null
  cullPlaylistId?: string | null
  currentIndex?: number
  decisions?: Record<string, { keep: boolean; rating?: number; colorId?: number }>
}

export default function App() {
  const tracks = useQueueStore((s) => s.tracks)
  const cues = useQueueStore((s) => s.cues)
  const currentIndex = useQueueStore((s) => s.currentIndex)
  const error = useQueueStore((s) => s.error)
  const loading = useQueueStore((s) => s.loading)
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
  const setDestinationPlaylistId = useSettingsStore((s) => s.setDestinationPlaylistId)
  const setCullPlaylistId = useSettingsStore((s) => s.setCullPlaylistId)

  const [isPlaying, setIsPlaying] = useState(false)
  const [toast, setToast] = useState('')
  const [commitOpen, setCommitOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const poolRef = useRef<AudioPool | null>(null)
  const track = currentTrack()

  const pool = useMemo(() => {
    const instance = new AudioPool({
      ahead: prefetchAhead,
      behind: prefetchBehind,
      resolveUrl: toMediaUrl,
    })
    poolRef.current = instance
    return instance
  }, [prefetchAhead, prefetchBehind])

  useEffect(() => {
    void (async () => {
      const session = await readSession<SessionSnapshot>()
      if (!session) return
      if (session.destinationPlaylistId) setDestinationPlaylistId(session.destinationPlaylistId)
      if (session.cullPlaylistId) setCullPlaylistId(session.cullPlaylistId)
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
  }, [hydrate, selectPlaylist, setCullPlaylistId, setCurrentIndex, setDestinationPlaylistId])

  useEffect(() => {
    void pool.setTracks(tracks.map((t) => ({ path: t.path })))
  }, [pool, tracks])

  useEffect(() => {
    void pool.setCurrent(currentIndex).then(() => {
      setIsPlaying(false)
    })
  }, [pool, currentIndex])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void writeSession({
        sourcePlaylistId,
        destinationPlaylistId,
        cullPlaylistId,
        currentIndex,
        decisions,
      })
    }, 3000)
    return () => window.clearInterval(timer)
  }, [cullPlaylistId, currentIndex, decisions, destinationPlaylistId, sourcePlaylistId])

  const handleKeep = useCallback(() => {
    if (!track) return
    decide(track.id, {
      keep: true,
      rating: getDecision(track.id)?.rating ?? track.rating,
      colorId: getDecision(track.id)?.colorId ?? track.colorId,
      destPlaylistId: destinationPlaylistId ?? undefined,
    })
    setToast(`Kept ${track.title}`)
    next()
  }, [decide, destinationPlaylistId, getDecision, next, track])

  const handleCull = useCallback(() => {
    if (!track) return
    decide(track.id, {
      keep: false,
      rating: getDecision(track.id)?.rating ?? 0,
      colorId: getDecision(track.id)?.colorId ?? track.colorId,
      cullPlaylistId: cullPlaylistId ?? undefined,
    })
    setToast(`Culled ${track.title}`)
    next()
  }, [cullPlaylistId, decide, getDecision, next, track])

  const togglePlay = useCallback(async () => {
    const active = pool.active()
    if (!active) return
    if (active.paused) {
      await pool.play()
      setIsPlaying(true)
    } else {
      pool.pause()
      setIsPlaying(false)
    }
  }, [pool])

  const jumpToCue = useCallback(
    (positionSec: number) => {
      pool.seek(positionSec)
      void pool.play()
      setIsPlaying(true)
    },
    [pool],
  )

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return

      if (event.key === '?') {
        setHelpOpen(true)
        return
      }
      if (event.key === 'z' && !event.metaKey && !event.ctrlKey) {
        undo()
        setToast('Undid last decision')
        return
      }
      if (event.key === ' ') {
        event.preventDefault()
        void togglePlay()
        return
      }
      if (event.key === 'ArrowRight') {
        handleKeep()
        return
      }
      if (event.key === 'ArrowLeft') {
        handleCull()
        return
      }
      if (event.key >= '1' && event.key <= '8' && !event.shiftKey) {
        const cue = cues[Number(event.key) - 1]
        if (cue) jumpToCue(cue.positionSec)
        return
      }
      if (event.shiftKey && event.key >= '1' && event.key <= '5' && track) {
        patch(track.id, { rating: Number(event.key) })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [cues, handleCull, handleKeep, jumpToCue, patch, togglePlay, track, undo])

  const activeDecision = track ? getDecision(track.id) : undefined
  const rating = activeDecision?.rating ?? track?.rating ?? 0
  const colorId = activeDecision?.colorId ?? track?.colorId ?? 0
  const progressLabel = tracks.length ? `${currentIndex + 1} / ${tracks.length}` : '0 / 0'

  return (
    <div className="app-shell">
      <header className="top-bar">
        <h1>SongSwipe</h1>
        <PlaylistPicker />
        <div className="top-bar__meta">{progressLabel}</div>
        <button type="button" className="btn" onClick={() => setCommitOpen(true)}>
          Commit
        </button>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="main-layout">
        <section className="center-panel">
          {loading ? <div className="empty-state">Loading…</div> : null}
          {!loading && !track ? (
            <div className="empty-state">Select a Rekordbox playlist to start culling.</div>
          ) : null}
          {track ? (
            <>
              <SwipeDeck track={track} onKeep={handleKeep} onCull={handleCull} />
              <WaveformPlayer media={pool.active()} cues={cues} />
            </>
          ) : null}
        </section>

        <aside className="right-rail">
          <DestinationPlaylist />
          {track ? (
            <>
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

      <TransportBar isPlaying={isPlaying} onTogglePlay={() => void togglePlay()}>
        <CueButtons cues={cues} onJump={jumpToCue} />
      </TransportBar>

      <UndoToast message={toast} />
      <CommitDialog open={commitOpen} onClose={() => setCommitOpen(false)} />
      <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
