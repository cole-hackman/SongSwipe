import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import type { Cue } from '@/lib/types'

type UseWaveformOptions = {
  media: HTMLAudioElement | null
  cues: Cue[]
}

export function useWaveform({ media, cues }: UseWaveformOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const regionsRef = useRef<ReturnType<typeof RegionsPlugin.create> | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current || !media) return

    const regions = RegionsPlugin.create()
    regionsRef.current = regions
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      media,
      height: 96,
      waveColor: '#8a8a90',
      progressColor: '#00d4aa',
      cursorColor: '#ededed',
      barWidth: 2,
      barGap: 1,
      normalize: true,
      plugins: [regions],
    })

    wavesurferRef.current = wavesurfer
    wavesurfer.on('ready', () => setIsReady(true))

    return () => {
      setIsReady(false)
      wavesurfer.destroy()
      wavesurferRef.current = null
      regionsRef.current = null
    }
  }, [media])

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
  }, [cues, isReady])

  return { containerRef, isReady }
}
