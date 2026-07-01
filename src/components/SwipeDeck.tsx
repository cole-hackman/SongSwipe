import TinderCard from 'react-tinder-card'
import { TrackCard } from '@/components/TrackCard'
import type { Track } from '@/lib/types'

type SwipeDeckProps = {
  track: Track
  onKeep: () => void
  onCut: () => void
}

export function SwipeDeck({ track, onKeep, onCut }: SwipeDeckProps) {
  return (
    <div className="swipe-area">
      <TinderCard
        key={track.id}
        onSwipe={(direction) => {
          if (direction === 'right') onKeep()
          if (direction === 'left') onCut()
        }}
        preventSwipe={['up', 'down']}
      >
        <TrackCard track={track} />
      </TinderCard>
    </div>
  )
}
