import TinderCard from 'react-tinder-card'
import { TriageTrackCard } from '@/components/triage/TriageTrackCard'
import type { CuePreset } from '@/lib/cue-presets'
import type { BeatMarker, Cue, Track } from '@/lib/types'

type LeanDirection = 'keep' | 'cut' | null

type TriageCardStackProps = {
  beatgrid: BeatMarker[]
  cues: Cue[]
  fastMode: boolean
  leanDirection: LeanDirection
  media: HTMLAudioElement | null
  normalize: boolean
  onCut: () => void
  onKeep: () => void
  onLean: (direction: LeanDirection) => void
  onSeek?: (seconds: number) => void
  presets: CuePreset[]
  track: Track
  waveformBarWidth: number
}

export function TriageCardStack({
  beatgrid,
  cues,
  fastMode,
  leanDirection,
  media,
  normalize,
  onCut,
  onKeep,
  onLean,
  onSeek,
  presets,
  track,
  waveformBarWidth,
}: TriageCardStackProps) {
  return (
    <div className={`triage-deck${leanDirection ? ` is-lean-${leanDirection}` : ''}`}>
      <div className="triage-deck__ghost triage-deck__ghost--cut">CUT</div>
      <div className="triage-deck__ghost triage-deck__ghost--keep">KEEP</div>
      <div className="triage-deck__card triage-deck__card--back2" aria-hidden="true" />
      <div className="triage-deck__card triage-deck__card--back" aria-hidden="true" />
      <TinderCard
        className="triage-deck__swipe"
        key={track.id}
        swipeRequirementType="position"
        onSwipeRequirementFulfilled={(direction) => {
          if (direction === 'right') onLean('keep')
          else if (direction === 'left') onLean('cut')
        }}
        onSwipeRequirementUnfulfilled={() => onLean(null)}
        onSwipe={(direction) => {
          if (direction === 'right') onKeep()
          if (direction === 'left') onCut()
        }}
        preventSwipe={['up', 'down']}
      >
        <div className="triage-deck__card triage-deck__card--front">
          <TriageTrackCard
            beatgrid={beatgrid}
            cues={cues}
            fastMode={fastMode}
            filePath={track.path}
            media={media}
            normalize={normalize}
            onSeek={onSeek}
            presets={presets}
            track={track}
            waveformBarWidth={waveformBarWidth}
          />
        </div>
      </TinderCard>
    </div>
  )
}
