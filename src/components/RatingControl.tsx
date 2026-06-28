import { useDecisionsStore } from '@/store/decisions'

type RatingControlProps = {
  trackId: string
  value: number
}

export function RatingControl({ trackId, value }: RatingControlProps) {
  const patch = useDecisionsStore((s) => s.patch)

  return (
    <div className="panel-block">
      <h2>Rating</h2>
      <div className="rating-row">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-btn ${value >= star ? 'is-active' : ''}`}
            aria-label={`Rate ${star}`}
            onClick={() => patch(trackId, { rating: star })}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )
}
