import { describe, expect, it } from 'vitest'
import { buildWaveformMarkers } from '@/lib/waveform-markers'
import type { Cue } from '@/lib/types'
import type { CuePreset } from '@/lib/cue-presets'

describe('buildWaveformMarkers', () => {
  it('combines presets and cues and clamps their positions', () => {
    const cues: Cue[] = [
      { name: 'My Cue', type: 1, positionSec: 10 },
    ]
    const presets: CuePreset[] = [
      { id: 'intro', label: 'Intro', positionSec: -5 },
      { id: 'drop', label: 'Drop', positionSec: 250 },
    ]

    const markers = buildWaveformMarkers(cues, presets, 200)

    expect(markers).toHaveLength(3)
    
    // Intro at clamped 0s
    expect(markers[0]).toMatchObject({
      label: 'Intro',
      kind: 'intro',
      positionSec: 0,
    })

    // My Cue at 10s
    expect(markers[1]).toMatchObject({
      label: 'My Cue',
      kind: 'cue',
      positionSec: 10,
    })

    // Drop at clamped 200s
    expect(markers[2]).toMatchObject({
      label: 'Drop',
      kind: 'drop',
      positionSec: 200,
    })
  })

  it('clusters and de-duplicates markers based on KIND_PRIORITY (Intro wins over Drop and Cue)', () => {
    // Cue, Drop and Intro all at 0 seconds
    const cues: Cue[] = [
      { name: 'Cue 1', type: 1, positionSec: 0 },
    ]
    const presets: CuePreset[] = [
      { id: 'intro', label: 'Intro', positionSec: 0 },
      { id: 'drop', label: 'Drop', positionSec: 0 },
    ]

    const markers = buildWaveformMarkers(cues, presets, 200)

    // Only Intro should be kept
    expect(markers).toHaveLength(1)
    expect(markers[0]).toMatchObject({
      label: 'Intro',
      kind: 'intro',
      positionSec: 0,
    })
  })

  it('correctly de-duplicates clustered markers with custom priority (Drop wins over Cue)', () => {
    const cues: Cue[] = [
      { name: 'Cue 1', type: 1, positionSec: 1 },
    ]
    const presets: CuePreset[] = [
      { id: 'drop', label: 'Drop', positionSec: 0 },
    ]

    const markers = buildWaveformMarkers(cues, presets, 200)

    // Only Drop should be kept as it has higher priority (4) than Cue (1)
    expect(markers).toHaveLength(1)
    expect(markers[0]).toMatchObject({
      label: 'Drop',
      kind: 'drop',
      positionSec: 0,
    })
  })

  it('keeps both markers if they are further apart than clusterSeconds', () => {
    const cues: Cue[] = [
      { name: 'Cue 1', type: 1, positionSec: 5 },
    ]
    const presets: CuePreset[] = [
      { id: 'intro', label: 'Intro', positionSec: 0 },
    ]

    const markers = buildWaveformMarkers(cues, presets, 200, 2)

    expect(markers).toHaveLength(2)
  })
})
