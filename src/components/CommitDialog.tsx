import { useMemo, useState } from 'react'
import { rb } from '@/lib/ipc'
import type { TrackDecision } from '@/lib/types'
import { useDecisionsStore } from '@/store/decisions'
import { useSettingsStore } from '@/store/settings'

type CommitDialogProps = {
  open: boolean
  onClose: () => void
}

export function CommitDialog({ open, onClose }: CommitDialogProps) {
  const decisions = useDecisionsStore((s) => s.decisions)
  const clearCommitted = useDecisionsStore((s) => s.clearCommitted)
  const destinationPlaylistId = useSettingsStore((s) => s.destinationPlaylistId)
  const cullPlaylistId = useSettingsStore((s) => s.cullPlaylistId)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const summary = useMemo(() => summarize(decisions), [decisions])

  if (!open) return null

  async function commit() {
    setBusy(true)
    setStatus(null)
    try {
      const running = await rb<boolean>('is_rekordbox_running')
      if (running) {
        throw new Error('Close Rekordbox before committing changes.')
      }

      const backup = await rb<{ backupPath: string }>('backup_db')
      setStatus(`Backup created: ${backup.backupPath}`)

      const committed: string[] = []
      const failures: string[] = []

      for (const [trackId, decision] of Object.entries(decisions)) {
        try {
          if (decision.rating != null) {
            await rb('set_rating', { trackId, rating: decision.rating })
          }
          if (decision.colorId != null) {
            await rb('set_color', { trackId, colorId: decision.colorId })
          }
          if (decision.keep && destinationPlaylistId) {
            await rb('add_to_playlist', { playlistId: destinationPlaylistId, trackId })
          }
          if (!decision.keep && cullPlaylistId) {
            await rb('add_to_playlist', { playlistId: cullPlaylistId, trackId })
          }
          committed.push(trackId)
        } catch (error) {
          failures.push(
            `${trackId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          )
        }
      }

      clearCommitted(committed)
      if (failures.length) {
        setStatus(`Committed ${committed.length} tracks. ${failures.length} failed.`)
      } else {
        setStatus(`Committed ${committed.length} tracks successfully.`)
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Commit failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>Commit to Rekordbox</h2>
        <p>
          {summary.keepCount} keep, {summary.cullCount} cull, {summary.ratingCount} ratings,{' '}
          {summary.colorCount} colors.
        </p>
        {status ? <p>{status}</p> : null}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Close
          </button>
          <button type="button" className="btn btn--primary" onClick={() => void commit()} disabled={busy}>
            {busy ? 'Committing…' : 'Commit'}
          </button>
        </div>
      </div>
    </div>
  )
}

function summarize(decisions: Record<string, TrackDecision>) {
  const values = Object.values(decisions)
  return {
    keepCount: values.filter((d) => d.keep).length,
    cullCount: values.filter((d) => !d.keep).length,
    ratingCount: values.filter((d) => d.rating != null).length,
    colorCount: values.filter((d) => d.colorId != null).length,
  }
}
