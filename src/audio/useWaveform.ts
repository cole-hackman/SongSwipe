import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import { loadPeaksForPath, persistPeaks } from '@/audio/peak-store'
import type { BeatMarker, Cue } from '@/lib/types'

type UseWaveformOptions = {
  media: HTMLAudioElement | null
  filePath: string
  cues: Cue[]
  beatgrid?: BeatMarker[]
  barWidth?: number
  normalize?: boolean
  fastMode?: boolean
}

export function useWaveform({
  media,
  filePath,
  cues,
  beatgrid = [],
  barWidth = 2,
  normalize = true,
  fastMode = false,
}: UseWaveformOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const regionsRef = useRef<ReturnType<typeof RegionsPlugin.create> | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current || !media) return

    let cancelled = false

    const regions = RegionsPlugin.create()
    regionsRef.current = regions

    void (async () => {
      const cached = await loadPeaksForPath(filePath)
      if (cancelled || !containerRef.current) return

      const wavesurfer = WaveSurfer.create({
        container: containerRef.current,
        media,
        height: 96,
        waveColor: '#8a8a90',
        progressColor: '#00d4aa',
        cursorColor: '#ededed',
        barWidth: fastMode ? 4 : barWidth,
        barGap: fastMode ? 2 : 1,
        normalize,
        peaks: cached?.peaks,
        duration: cached?.duration,
        plugins: [regions],
      })

      wavesurferRef.current = wavesurfer
      wavesurfer.on('ready', () => {
        setIsReady(true)
        if (!cached && filePath) {
          const peaks = wavesurfer.exportPeaks()
          const duration = wavesurfer.getDuration()
          void persistPeaks(filePath, peaks, duration)
        }
      })
      wavesurfer.on('error', () => {
        // Waveform decode can fail when the file is missing; playback errors are surfaced separately.
      })
    })()

    return () => {
      cancelled = true
      setIsReady(false)
      wavesurferRef.current?.destroy()
      wavesurferRef.current = null
      regionsRef.current = null
    }
  }, [media, filePath, barWidth, normalize, fastMode])

  useEffect(() => {
    const regions = regionsRef.current
    if (!regions || !isReady) return

    regions.clearRegions()
    cues.forEach((cue, index) => {
      regions.addRegion({
        id: `cue-${index}`,
        start: cue.positionSec,
        end: cue.positionSec + 0.05,
        color: 'rgba(245, 166, 35, 0.55)',
        drag: false,
        resize: false,
      })
    })

    beatgrid
      .filter((beat) => beat.beatInBar === 1)
      .forEach((beat, index) => {
        regions.addRegion({
          id: `beat-${index}`,
          start: beat.positionSec,
          end: beat.positionSec + 0.02,
          color: 'rgba(91, 141, 239, 0.35)',
          drag: false,
          resize: false,
        })
      })
  }, [beatgrid, cues, isReady])

  return { containerRef, isReady }
}
