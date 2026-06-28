import { computeSessionStats } from '@/lib/session-stats'
import { REKORDBOX_COLORS } from '@/lib/types'
import { useDecisionsStore } from '@/store/decisions'
import { useQueueStore } from '@/store/queue'

export function StatsPanel() {
  const tracks = useQueueStore((s) => s.tracks)
  const decisions = useDecisionsStore((s) => s.decisions)
  const stats = computeSessionStats(tracks, decisions)

  if (!stats.total) {
    return (
      <div className="panel-block stats-panel">
        <h2>Session stats</h2>
        <p className="top-bar__meta">No decisions yet.</p>
      </div>
    )
  }

  return (
    <div className="panel-block stats-panel">
      <h2>Session stats</h2>
      <p>
        {stats.keepCount} keep · {stats.cullCount} cull · {(stats.keepRatio * 100).toFixed(0)}%
        keep rate
      </p>
      {stats.avgBpmKeepers != null ? (
        <p className="top-bar__meta">Avg BPM keepers: {stats.avgBpmKeepers.toFixed(1)}</p>
      ) : null}
      <ul className="stats-panel__colors">
        {Object.entries(stats.colorCounts).map(([colorId, count]) => (
          <li key={colorId}>
            {REKORDBOX_COLORS.find((c) => c.id === Number(colorId))?.label ?? 'None'}: {count}
          </li>
        ))}
      </ul>
    </div>
  )
}
