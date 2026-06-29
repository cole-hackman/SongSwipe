import { useEffect, useMemo, useRef, useState } from 'react'
import { ComparePlayer } from '@/audio/compare-player'
import { getEffectivePresets } from '@/lib/cue-presets'
import type { Cue, Track, TrackDecision } from '@/lib/types'
import { useDecisionsStore } from '@/store/decisions'
import { useQueueStore } from '@/store/queue'
import { SkipPresetButtons } from '@/components/SkipPresetButtons'
import { TrackCard } from '@/components/TrackCard'
import { WaveformPlayer } from '@/components/WaveformPlayer'
import { useSettingsStore } from '@/store/settings'

type CompareViewProps = {
  tracks: Track[]
}

export function CompareView({ tracks }: CompareViewProps) {
  const cuesByTrackId = useQueueStore((s) => s.cuesByTrackId)
  const waveformBarWidth = useSettingsStore((s) => s.waveformBarWidth)
  const waveformNormalize = useSettingsStore((s) => s.waveformNormalize)
  const waveformFastMode = useSettingsStore((s) => s.waveformFastMode)
  const destinationPlaylistId = useSettingsStore((s) => s.destinationPlaylistId)
  const cutPlaylistId = useSettingsStore((s) => s.cutPlaylistId)
  const decide = useDecisionsStore((s) => s.decide)
  const decisions = useDecisionsStore((s) => s.decisions)
  const cuePlacementMode = useSettingsStore((s) => s.cuePlacementMode)
  const smartCuesByTrackId = useQueueStore((s) => s.smartCuesByTrackId)
  const [indexA, setIndexA] = useState(0)
  const [indexB, setIndexB] = useState(Math.min(1, Math.max(tracks.length - 1, 0)))
  const [playingSlot, setPlayingSlot] = useState<'a' | 'b' | null>(null)
  const playerRef = useRef<ComparePlayer | null>(null)
  const [, forceUpdate] = useState(0)

  const trackA = tracks[indexA] ?? null
  const trackB = tracks[indexB] ?? null
  const cuesA: Cue[] = trackA ? (cuesByTrackId[trackA.id] ?? []) : []
  const cuesB: Cue[] = trackB ? (cuesByTrackId[trackB.id] ?? []) : []

  const presetsA = useMemo(() => {
    return trackA ? getEffectivePresets(trackA, cuesA, smartCuesByTrackId[trackA.id], cuePlacementMode) : []
  }, [trackA, cuesA, smartCuesByTrackId, cuePlacementMode])

  const presetsB = useMemo(() => {
    return trackB ? getEffectivePresets(trackB, cuesB, smartCuesByTrackId[trackB.id], cuePlacementMode) : []
  }, [trackB, cuesB, smartCuesByTrackId, cuePlacementMode])

  useEffect(() => {
    const player = new ComparePlayer()
    playerRef.current = player
    forceUpdate((n) => n + 1)
    return () => player.release()
  }, [])

  useEffect(() => {
    const player = playerRef.current
    if (!player || !trackA?.path) return
    void player.load('a', trackA.path)
  }, [trackA?.id, trackA?.path])

  useEffect(() => {
    const player = playerRef.current
    if (!player || !trackB?.path) return
    void player.load('b', trackB.path)
  }, [trackB?.id, trackB?.path])

  async function togglePlay(slot: 'a' | 'b') {
    const player = playerRef.current
    if (!player) return
    const element = player.active(slot)
    if (element.paused) {
      await player.play(slot)
      setPlayingSlot(slot)
    } else {
      player.pause(slot)
      setPlayingSlot(null)
    }
  }

  function jump(slot: 'a' | 'b', sec: number) {
    const player = playerRef.current
    if (!player) return
    player.seek(slot, sec)
    void player.play(slot)
    setPlayingSlot(slot)
  }

  function decideTrack(track: Track | null, index: number, keep: boolean) {
    if (!track) return
    decide(
      track.id,
      keep
        ? {
            keep: true,
            rating: decisions[track.id]?.rating ?? track.rating,
            colorId: decisions[track.id]?.colorId ?? track.colorId,
            destPlaylistId: decisions[track.id]?.destPlaylistId ?? destinationPlaylistId ?? undefined,
          }
        : {
            keep: false,
            colorId: decisions[track.id]?.colorId ?? track.colorId,
            cutPlaylistId: cutPlaylistId ?? undefined,
          },
      index,
    )
  }

  if (!tracks.length) {
    return <div className="empty-state">Select a playlist to compare tracks.</div>
  }

  const mediaA = playerRef.current?.active('a') ?? null
  const mediaB = playerRef.current?.active('b') ?? null

  return (
    <div className="compare-view">
      <CompareColumn
        label="Track A"
        tracks={tracks}
        index={indexA}
        onIndexChange={setIndexA}
        track={trackA}
        playing={playingSlot === 'a'}
        onTogglePlay={() => void togglePlay('a')}
        cues={cuesA}
        presets={presetsA}
        onJump={(sec) => jump('a', sec)}
        media={mediaA}
        waveformBarWidth={waveformBarWidth}
        waveformNormalize={waveformNormalize}
        waveformFastMode={waveformFastMode}
        decision={trackA ? decisions[trackA.id] : undefined}
        onKeep={() => decideTrack(trackA, indexA, true)}
        onCut={() => decideTrack(trackA, indexA, false)}
      />
      <CompareColumn
        label="Track B"
        tracks={tracks}
        index={indexB}
        onIndexChange={setIndexB}
        track={trackB}
        playing={playingSlot === 'b'}
        onTogglePlay={() => void togglePlay('b')}
        cues={cuesB}
        presets={presetsB}
        onJump={(sec) => jump('b', sec)}
        media={mediaB}
        waveformBarWidth={waveformBarWidth}
        waveformNormalize={waveformNormalize}
        waveformFastMode={waveformFastMode}
        decision={trackB ? decisions[trackB.id] : undefined}
        onKeep={() => decideTrack(trackB, indexB, true)}
        onCut={() => decideTrack(trackB, indexB, false)}
      />
    </div>
  )
}

type CompareColumnProps = {
  label: string
  tracks: Track[]
  index: number
  onIndexChange: (index: number) => void
  track: Track | null
  playing: boolean
  onTogglePlay: () => void
  cues: Cue[]
  presets: ReturnType<typeof getEffectivePresets>
  onJump: (sec: number) => void
  media: HTMLAudioElement | null
  waveformBarWidth: number
  waveformNormalize: boolean
  waveformFastMode: boolean
  decision: TrackDecision | undefined
  onKeep: () => void
  onCut: () => void
}

function CompareColumn({
  label,
  tracks,
  index,
  onIndexChange,
  track,
  playing,
  onTogglePlay,
  cues,
  presets,
  onJump,
  media,
  waveformBarWidth,
  waveformNormalize,
  waveformFastMode,
  decision,
  onKeep,
  onCut,
}: CompareColumnProps) {
  const decisionLabel = decision
    ? decision.keep
      ? 'Marked Keep'
      : 'Marked Cut'
    : 'No decision'

  return (
    <section className="compare-column">
      <header className="compare-column__header">
        <h2>{label}</h2>
        <span className={`compare-column__status${decision ? (decision.keep ? ' is-keep' : ' is-cut') : ''}`}>
          {decisionLabel}
        </span>
      </header>
      <div className="select-wrap">
        <select
          className="select select--themed"
          value={index}
          onChange={(e) => onIndexChange(Number(e.target.value))}
        >
          {tracks.map((t, i) => (
            <option key={t.id} value={i}>
              {t.title || 'Untitled'}
            </option>
          ))}
        </select>
      </div>
      {track ? <TrackCard track={track} /> : null}
      {track ? (
        <WaveformPlayer
          media={media}
          filePath={track.path}
          cues={cues}
          durationSec={track.durationSec}
          presets={presets}
          barWidth={waveformBarWidth}
          normalize={waveformNormalize}
          fastMode={waveformFastMode}
          className="compare-waveform"
          height={96}
          onSeek={(sec) => onJump(sec)}
        />
      ) : null}
      <div className="compare-column__transport">
        <button type="button" className="btn compare-column__play" onClick={onTogglePlay}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <SkipPresetButtons presets={presets} onJump={onJump} />
      </div>
      <div className="compare-column__decide">
        <button
          type="button"
          className={`btn btn--cut${decision && !decision.keep ? ' is-active' : ''}`}
          onClick={onCut}
          disabled={!track}
        >
          Cut
        </button>
        <button
          type="button"
          className={`btn btn--keep${decision?.keep ? ' is-active' : ''}`}
          onClick={onKeep}
          disabled={!track}
        >
          Keep
        </button>
      </div>
    </section>
  )
}
