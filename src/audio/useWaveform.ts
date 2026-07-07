import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import { loadPeaksForPath, persistPeaks } from '@/audio/peak-store'
import type { BeatMarker } from '@/lib/types'
import type { WaveformMarker } from '@/lib/waveform-markers'

type UseWaveformOptions = {
  media: HTMLAudioElement | null
  filePath: string
  markers: WaveformMarker[]
  beatgrid?: BeatMarker[]
  barWidth?: number
  normalize?: boolean
  fastMode?: boolean
  height?: number
  onSeek?: (seconds: number) => void
}

export function useWaveform({
  media,
  filePath,
  markers,
  beatgrid = [],
  barWidth = 2,
  normalize = true,
  fastMode = false,
  height = 96,
  onSeek,
}: UseWaveformOptions) {
  const onSeekRef = useRef(onSeek)
  useEffect(() => {
    onSeekRef.current = onSeek
  }, [onSeek])

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
        height,
        waveColor: '#3d4d5a',
        progressColor: '#3b9eef',
        cursorColor: '#e8edf0',
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
      wavesurfer.on('interaction', () => {
        onSeekRef.current?.(wavesurfer.getCurrentTime())
      })
      regions.on('region-clicked', (region, event) => {
        event.stopPropagation()
        wavesurfer.setTime(region.start)
        onSeekRef.current?.(region.start)
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

    beatgrid
      .filter((beat) => beat.beatInBar === 1)
      .forEach((beat, index) => {
        regions.addRegion({
          id: `beat-${index}`,
          start: beat.positionSec,
          end: beat.positionSec + 0.02,
          color: 'rgba(91, 141, 239, 0.18)',
          drag: false,
          resize: false,
        })
      })

    markers.forEach((marker) => {
      regions.addRegion({
        id: marker.id,
        start: marker.positionSec,
        end: marker.positionSec + 0.04,
        color: hexToRgba(marker.color, 0.95),
        drag: false,
        resize: false,
      })
    })
  }, [beatgrid, markers, isReady])

  return { containerRef, isReady }
}

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
