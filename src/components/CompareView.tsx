import { useEffect, useMemo, useRef, useState } from 'react'
import { ComparePlayer } from '@/audio/compare-player'
import { buildCuePresets } from '@/lib/cue-presets'
import type { Cue, Track } from '@/lib/types'
import { useQueueStore } from '@/store/queue'
import { CueButtons } from '@/components/CueButtons'
import { SkipPresetButtons } from '@/components/SkipPresetButtons'
import { TrackCard } from '@/components/TrackCard'

type CompareViewProps = {
  tracks: Track[]
}

export function CompareView({ tracks }: CompareViewProps) {
  const cuesByTrackId = useQueueStore((s) => s.cuesByTrackId)
  const [indexA, setIndexA] = useState(0)
  const [indexB, setIndexB] = useState(Math.min(1, Math.max(tracks.length - 1, 0)))
  const [playingSlot, setPlayingSlot] = useState<'a' | 'b' | null>(null)
  const playerRef = useRef<ComparePlayer | null>(null)

  const trackA = tracks[indexA] ?? null
  const trackB = tracks[indexB] ?? null
  const cuesA: Cue[] = trackA ? (cuesByTrackId[trackA.id] ?? []) : []
  const cuesB: Cue[] = trackB ? (cuesByTrackId[trackB.id] ?? []) : []

  const presetsA = useMemo(() => (trackA ? buildCuePresets(trackA, cuesA) : []), [trackA, cuesA])
  const presetsB = useMemo(() => (trackB ? buildCuePresets(trackB, cuesB) : []), [trackB, cuesB])

  useEffect(() => {
    const player = new ComparePlayer()
    playerRef.current = player
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

  if (!tracks.length) {
    return <div className="empty-state">Select a playlist to compare tracks.</div>
  }

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
  presets: ReturnType<typeof buildCuePresets>
  onJump: (sec: number) => void
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
}: CompareColumnProps) {
  return (
    <section className="compare-column">
      <h2>{label}</h2>
      <select className="select" value={index} onChange={(e) => onIndexChange(Number(e.target.value))}>
        {tracks.map((t, i) => (
          <option key={t.id} value={i}>
            {t.title || 'Untitled'}
          </option>
        ))}
      </select>
      {track ? <TrackCard track={track} /> : null}
      <button type="button" className="btn" onClick={onTogglePlay}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <CueButtons cues={cues} onJump={onJump} />
      <SkipPresetButtons presets={presets} onJump={onJump} />
    </section>
  )
}
