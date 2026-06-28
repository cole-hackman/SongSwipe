import type { DuplicateCluster, Track } from '@/lib/types'

export function DuplicatesPanel({
  clusters,
  tracks,
  onSelectTrack,
}: {
  clusters: DuplicateCluster[]
  tracks: Track[]
  onSelectTrack: (trackId: string) => void
}) {
  if (!clusters.length) return null
  const byId = new Map(tracks.map((t) => [t.id, t]))

  return (
    <div className="panel-block">
      <h2>Duplicates ({clusters.length})</h2>
      {clusters.map((cluster) => (
        <div key={cluster.key} className="duplicate-cluster">
          <p className="top-bar__meta">
            {cluster.reason}: {cluster.key}
          </p>
          {cluster.trackIds.map((id) => (
            <button key={id} type="button" className="btn" onClick={() => onSelectTrack(id)}>
              {byId.get(id)?.title ?? id}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
