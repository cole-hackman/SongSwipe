import { useMemo, useState, useEffect } from 'react'
import { exportTextFile, rb } from '@/lib/ipc'
import type { TrackDecision } from '@/lib/types'
import { ReviewQueue } from '@/components/ReviewQueue'
import { useDecisionsStore } from '@/store/decisions'
import { useSettingsStore } from '@/store/settings'

type CommitDialogProps = {
  open: boolean
  onClose: () => void
}

type PlannedOperation = Record<string, unknown>

type BackupEntry = {
  path: string
  createdAt: string
}

export function CommitDialog({ open, onClose }: CommitDialogProps) {
  const decisions = useDecisionsStore((s) => s.decisions)
  const clearCommitted = useDecisionsStore((s) => s.clearCommitted)
  const destinationPlaylistId = useSettingsStore((s) => s.destinationPlaylistId)
  const cutPlaylistId = useSettingsStore((s) => s.cutPlaylistId)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [dryRun, setDryRun] = useState<PlannedOperation[]>([])
  const [backups, setBackups] = useState<BackupEntry[]>([])

  const summary = useMemo(() => summarize(decisions), [decisions])
  const keepBlocked = Object.entries(decisions).some(
    ([, decision]) => decision.keep && !(decision.destPlaylistId ?? destinationPlaylistId),
  )

  useEffect(() => {
    if (!open) return
    void rb<BackupEntry[]>('list_backups').then(setBackups).catch(() => setBackups([]))
  }, [open])

  if (!open) return null

  function decisionPayload() {
    return Object.entries(decisions).map(([trackId, decision]) => ({ trackId, ...decision }))
  }

  async function runDryRun() {
    setBusy(true)
    setStatus(null)
    try {
      const plan = await rb<{ operations: PlannedOperation[] }>('plan_commit', {
        decisions: decisionPayload(),
        defaultDestId: destinationPlaylistId,
        defaultCutId: cutPlaylistId,
      })
      setDryRun(plan.operations)
      setStatus(`Dry-run: ${plan.operations.length} operation(s) planned.`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Dry-run failed')
    } finally {
      setBusy(false)
    }
  }

  async function exportXml() {
    setBusy(true)
    setStatus(null)
    try {
      const result = await rb<{ xml: string }>('export_commit_xml', {
        decisions: decisionPayload(),
        defaultDestId: destinationPlaylistId,
        defaultCutId: cutPlaylistId,
      })
      const saved = await exportTextFile('songswipe-commit.xml', result.xml, [
        { name: 'XML', extensions: ['xml'] },
      ])
      setStatus(saved ? `XML saved to ${saved}` : 'XML export cancelled.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'XML export failed')
    } finally {
      setBusy(false)
    }
  }

  async function rollback(backupPath: string) {
    if (!window.confirm('Restore this backup over master.db? Rekordbox must be closed.')) return
    setBusy(true)
    setStatus(null)
    try {
      await rb('restore_backup', { backupPath })
      setStatus(`Restored from ${backupPath}`)
      const next = await rb<BackupEntry[]>('list_backups')
      setBackups(next)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Restore failed')
    } finally {
      setBusy(false)
    }
  }

  async function commit() {
    if (keepBlocked) {
      setStatus('Every keep decision needs a destination playlist.')
      return
    }

    if (!window.confirm('Are you absolutely sure you want to write these decisions to the Rekordbox database? This will permanently modify your collection.')) {
      return
    }

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
          if (decision.myTagIds != null) {
            await rb('set_my_tags', { trackId, tagIds: decision.myTagIds })
          }
          if (decision.keep) {
            const destId = decision.destPlaylistId ?? destinationPlaylistId
            if (destId) {
              await rb('add_to_playlist', { playlistId: destId, trackId })
            }
          }
          if (!decision.keep && cutPlaylistId) {
            await rb('add_to_playlist', { playlistId: cutPlaylistId, trackId })
          }
          committed.push(trackId)
        } catch (error) {
          failures.push(
            `${trackId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          )
        }
      }

      await rb('close_db')

      clearCommitted(committed)
      if (failures.length) {
        setStatus(`Committed ${committed.length} tracks. ${failures.length} failed.`)
      } else {
        setStatus(`Committed ${committed.length} tracks successfully.`)
      }
      setReviewing(false)
      setDryRun([])
      const next = await rb<BackupEntry[]>('list_backups')
      setBackups(next)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Commit failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal modal--wide" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>Commit to Rekordbox</h2>
        <p>
          {summary.keepCount} keep, {summary.cutCount} cut, {summary.ratingCount} ratings,{' '}
          {summary.colorCount} colors, {summary.tagCount} tag edits.
        </p>
        {keepBlocked ? (
          <p className="top-bar__meta">
            Select a keep playlist (default or per-track) before committing.
          </p>
        ) : null}
        {reviewing ? <ReviewQueue onClose={() => setReviewing(false)} /> : null}
        {dryRun.length ? (
          <div className="dry-run">
            <h3>Dry-run preview</h3>
            <ul>
              {dryRun.map((op, index) => (
                <li key={`${String(op.type)}-${index}`}>
                  {String(op.type)} — {String(op.trackId)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {backups.length ? (
          <div className="backup-list">
            <h3>Restore backup</h3>
            {backups.slice(0, 3).map((backup) => (
              <button
                key={backup.path}
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => void rollback(backup.path)}
              >
                {backup.createdAt}
              </button>
            ))}
          </div>
        ) : null}
        {status ? <p>{status}</p> : null}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Close
          </button>
          {!reviewing ? (
            <button type="button" className="btn" onClick={() => setReviewing(true)} disabled={busy}>
              Review changes
            </button>
          ) : null}
          <button type="button" className="btn" onClick={() => void runDryRun()} disabled={busy}>
            Dry-run
          </button>
          <button type="button" className="btn" onClick={() => void exportXml()} disabled={busy}>
            Export XML
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void commit()}
            disabled={busy || keepBlocked}
          >
            {busy ? 'Committing…' : 'Commit to Rekordbox'}
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
    cutCount: values.filter((d) => !d.keep).length,
    ratingCount: values.filter((d) => d.rating != null).length,
    colorCount: values.filter((d) => d.colorId != null).length,
    tagCount: values.filter((d) => d.myTagIds != null).length,
  }
}
