import { useMemo } from 'react'
import type { DuplicateCluster, Track, TrackDecision } from '@/lib/types'
import { computeSessionStats } from '@/lib/session-stats'
import { useDecisionsStore } from '@/store/decisions'

type SessionStatsPanelProps = {
  tracks: Track[]
  clusters: DuplicateCluster[]
}

export function SessionStatsPanel({ tracks, clusters }: SessionStatsPanelProps) {
  const decisions = useDecisionsStore((s) => s.decisions)

  const playlistDecisions = useMemo(() => {
    const ids = new Set(tracks.map((t) => t.id))
    const result: Record<string, TrackDecision> = {}
    for (const [id, d] of Object.entries(decisions)) {
      if (ids.has(id)) {
        result[id] = d
      }
    }
    return result
  }, [tracks, decisions])

  const stats = useMemo(() => computeSessionStats(tracks, playlistDecisions), [tracks, playlistDecisions])

  const decisionCount = Object.keys(playlistDecisions).length
  const totalTracks = tracks.length
  const progressPercent = totalTracks > 0 ? Math.round((decisionCount / totalTracks) * 100) : 0

  const keepPercent = stats.total > 0 ? Math.round((stats.keepCount / stats.total) * 100) : 0
  const cutPercent = stats.total > 0 ? 100 - keepPercent : 0

  // resolved clusters: at least one track in the duplicate cluster has a decision
  const resolvedClusters = useMemo(() => {
    return clusters.filter((cluster) =>
      cluster.trackIds.some((trackId) => trackId in playlistDecisions)
    ).length
  }, [clusters, playlistDecisions])

  if (!totalTracks) {
    return (
      <div className="session-stats">
        <span className="session-stats__title">Session Health</span>
        <div className="top-bar__meta">Load a playlist to see session stats.</div>
      </div>
    )
  }

  return (
    <div className="session-stats">
      <span className="session-stats__title">Session Health</span>
      
      <div className="session-stats__row">
        <span>Reviewed</span>
        <span className="session-stats__value">
          {decisionCount} / {totalTracks} ({progressPercent}%)
        </span>
      </div>
      <div className="session-stats__progress-track" aria-hidden="true">
        <div
          className="session-stats__progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="session-stats__row" style={{ marginTop: '4px' }}>
        <span>Keep / Cut Split</span>
        <span className="session-stats__value">
          {stats.keepCount} Keep · {stats.cutCount} Cut
        </span>
      </div>
      <div className="session-stats__split-track" aria-hidden="true">
        <div
          className="session-stats__split-keep"
          style={{ width: `${keepPercent}%` }}
        />
        <div
          className="session-stats__split-cut"
          style={{ width: `${cutPercent}%` }}
        />
      </div>

      {(stats.avgBpmKeepers !== null || stats.avgBpmCuts !== null) && (
        <div className="session-stats__row">
          <span>Average BPM</span>
          <span className="session-stats__value">
            {stats.avgBpmKeepers !== null ? `${stats.avgBpmKeepers.toFixed(1)} keep` : '—'}
            {' · '}
            {stats.avgBpmCuts !== null ? `${stats.avgBpmCuts.toFixed(1)} cut` : '—'}
          </span>
        </div>
      )}

      {clusters.length > 0 && (
        <div className="session-stats__row">
          <span>Duplicates Addressed</span>
          <span className="session-stats__value">
            {resolvedClusters} / {clusters.length} clusters
          </span>
        </div>
      )}
    </div>
  )
}
