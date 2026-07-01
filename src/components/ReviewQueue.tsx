import { REKORDBOX_COLORS, type TrackDecision } from '@/lib/types'
import { useDecisionsStore } from '@/store/decisions'
import { useQueueStore } from '@/store/queue'
import { useSettingsStore } from '@/store/settings'

type ReviewQueueProps = {
  onClose?: () => void
}

export function ReviewQueue({ onClose }: ReviewQueueProps) {
  const decisions = useDecisionsStore((s) => s.decisions)
  const updateDecision = useDecisionsStore((s) => s.updateDecision)
  const removeDecision = useDecisionsStore((s) => s.removeDecision)
  const tracks = useQueueStore((s) => s.tracks)
  const playlists = useQueueStore((s) => s.playlists)
  const destinationPlaylistId = useSettingsStore((s) => s.destinationPlaylistId)

  const trackById = new Map(tracks.map((t) => [t.id, t]))
  const leafPlaylists = playlists.filter((p) => !p.isFolder && !p.isSmart)
  const entries = Object.entries(decisions)

  if (!entries.length) {
    return <p className="top-bar__meta">No pending decisions to review.</p>
  }

  return (
    <div className="review-queue">
      <table className="audit-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Artist</th>
            <th>Action</th>
            <th>Rating</th>
            <th>Color</th>
            <th>Keep playlist</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {entries.map(([trackId, decision]) => {
            const track = trackById.get(trackId)
            return (
              <tr key={trackId}>
                <td>{track?.title ?? trackId}</td>
                <td>{track?.artist ?? '—'}</td>
                <td>
                  <select
                    className="select"
                    value={decision.keep ? 'keep' : 'cut'}
                    onChange={(e) =>
                      updateDecision(trackId, { keep: e.target.value === 'keep' })
                    }
                  >
                    <option value="keep">Keep</option>
                    <option value="cut">Cut</option>
                  </select>
                </td>
                <td>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={5}
                    value={decision.rating ?? track?.rating ?? 0}
                    onChange={(e) =>
                      updateDecision(trackId, { rating: Number(e.target.value) })
                    }
                  />
                </td>
                <td>
                  <select
                    className="select"
                    value={decision.colorId ?? track?.colorId ?? 0}
                    onChange={(e) =>
                      updateDecision(trackId, { colorId: Number(e.target.value) })
                    }
                  >
                    {REKORDBOX_COLORS.map((color) => (
                      <option key={color.id} value={color.id}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  {decision.keep ? (
                    <select
                      className="select"
                      value={decision.destPlaylistId ?? destinationPlaylistId ?? ''}
                      onChange={(e) =>
                        updateDecision(trackId, {
                          destPlaylistId: e.target.value || undefined,
                        })
                      }
                    >
                      <option value="">Default</option>
                      {leafPlaylists.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <button type="button" className="btn" onClick={() => removeDecision(trackId)}>
                    Remove
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {onClose ? (
        <button type="button" className="btn" onClick={onClose}>
          Back
        </button>
      ) : null}
    </div>
  )
}
