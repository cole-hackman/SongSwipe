import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Track, TrackDecision } from '@/lib/types'
import { REKORDBOX_COLORS } from '@/lib/types'
import {
  AUDIT_COLUMN_LABELS,
  DEFAULT_AUDIT_COLUMNS,
  type AuditColumnConfig,
  type AuditColumnId,
} from '@/lib/audit-columns'
import { writeSettings } from '@/lib/ipc'
import { useSettingsStore } from '@/store/settings'
import { useDecisionsStore } from '@/store/decisions'

type AuditViewProps = {
  tracks: Track[]
  decisions: Record<string, TrackDecision>
  onSelectIndex: (index: number) => void
}

type Filter = 'all' | 'decided' | 'undecided'

type ContextMenuState = { x: number; y: number } | null

type AuditBulkBarProps = {
  selectedIds: Set<string>
  onClear: () => void
  onKeep: () => void
  onCut: () => void
  onRating: (rating: number) => void
  onColor: (colorId: number) => void
  onReset: () => void
}

function AuditBulkBar({
  selectedIds,
  onClear,
  onKeep,
  onCut,
  onRating,
  onColor,
  onReset,
}: AuditBulkBarProps) {
  return (
    <div className="audit-bulk-bar">
      <div className="audit-bulk-count">
        <strong>{selectedIds.size}</strong> selected
        <button
          type="button"
          className="audit-bulk-clear"
          onClick={onClear}
          aria-label="Clear selection"
        >
          ×
        </button>
      </div>
      <div className="audit-bulk-divider" />
      <div className="audit-bulk-actions">
        <button type="button" className="btn btn--keep" onClick={onKeep}>
          Keep
        </button>
        <button type="button" className="btn btn--cut" onClick={onCut}>
          Cut
        </button>
        <button type="button" className="btn btn--reset" onClick={onReset}>
          Reset
        </button>
      </div>
      <div className="audit-bulk-divider" />
      <div className="audit-bulk-stars" aria-label="Bulk set rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="audit-bulk-star-btn"
            onClick={() => onRating(star)}
            title={`Set rating to ${star}`}
          >
            ★
          </button>
        ))}
      </div>
      <div className="audit-bulk-divider" />
      <div className="audit-bulk-colors" aria-label="Bulk set color">
        {REKORDBOX_COLORS.map((color) => (
          <button
            key={color.id}
            type="button"
            className="audit-bulk-color-btn"
            style={{ background: color.hex }}
            onClick={() => onColor(color.id)}
            title={`Set color to ${color.label}`}
          />
        ))}
      </div>
    </div>
  )
}

export function AuditView({ tracks, decisions, onSelectIndex }: AuditViewProps) {
  const columns = useSettingsStore((state) => state.auditColumns)
  const setAuditColumns = useSettingsStore((state) => state.setAuditColumns)
  const [filter, setFilter] = useState<Filter>('all')
  const [menu, setMenu] = useState<ContextMenuState>(null)
  const [dragId, setDragId] = useState<AuditColumnId | null>(null)
  const [dragOverId, setDragOverId] = useState<AuditColumnId | null>(null)
  const columnsRef = useRef(columns)
  columnsRef.current = columns

  const patch = useDecisionsStore((state) => state.patch)
  const removeDecision = useDecisionsStore((state) => state.removeDecision)
  const destinationPlaylistId = useSettingsStore((state) => state.destinationPlaylistId)
  const cutPlaylistId = useSettingsStore((state) => state.cutPlaylistId)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const lastClickedRef = useRef<number | null>(null)

  useEffect(() => {
    setSelectedIds(new Set())
    lastClickedRef.current = null
  }, [tracks, filter])

  const rows = useMemo(() => {
    return tracks
      .map((track, index) => ({ track, index, decision: decisions[track.id] }))
      .filter(({ decision }) => {
        if (filter === 'decided') return Boolean(decision)
        if (filter === 'undecided') return !decision
        return true
      })
  }, [tracks, decisions, filter])

  const allVisibleSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.track.id))

  const onToggleAll = useCallback(() => {
    if (allVisibleSelected) {
      const next = new Set(selectedIds)
      for (const row of rows) {
        next.delete(row.track.id)
      }
      setSelectedIds(next)
    } else {
      const next = new Set(selectedIds)
      for (const row of rows) {
        next.add(row.track.id)
      }
      setSelectedIds(next)
    }
  }, [allVisibleSelected, rows, selectedIds])

  const onToggleRow = useCallback((trackId: string, index: number, event: React.MouseEvent<HTMLInputElement>) => {
    event.stopPropagation()
    const shiftKey = event.shiftKey
    const next = new Set(selectedIds)

    if (shiftKey && lastClickedRef.current !== null) {
      const start = Math.min(lastClickedRef.current, index)
      const end = Math.max(lastClickedRef.current, index)
      const targetState = !selectedIds.has(trackId)
      for (let i = start; i <= end; i++) {
        const row = rows[i]
        if (row) {
          if (targetState) {
            next.add(row.track.id)
          } else {
            next.delete(row.track.id)
          }
        }
      }
    } else {
      if (next.has(trackId)) {
        next.delete(trackId)
      } else {
        next.add(trackId)
      }
    }
    
    setSelectedIds(next)
    lastClickedRef.current = index
  }, [selectedIds, rows])

  const handleBulkKeep = useCallback(() => {
    selectedIds.forEach((id) => {
      patch(id, {
        keep: true,
        destPlaylistId: decisions[id]?.destPlaylistId ?? destinationPlaylistId ?? undefined,
      })
    })
  }, [selectedIds, patch, decisions, destinationPlaylistId])

  const handleBulkCut = useCallback(() => {
    selectedIds.forEach((id) => {
      patch(id, {
        keep: false,
        cutPlaylistId: decisions[id]?.cutPlaylistId ?? cutPlaylistId ?? undefined,
      })
    })
  }, [selectedIds, patch, decisions, cutPlaylistId])

  const handleBulkRating = useCallback((rating: number) => {
    selectedIds.forEach((id) => {
      patch(id, { rating, keep: decisions[id]?.keep ?? true })
    })
  }, [selectedIds, patch, decisions])

  const handleBulkColor = useCallback((colorId: number) => {
    selectedIds.forEach((id) => {
      patch(id, { colorId, keep: decisions[id]?.keep ?? true })
    })
  }, [selectedIds, patch, decisions])

  const handleBulkReset = useCallback(() => {
    selectedIds.forEach((id) => {
      removeDecision(id)
    })
  }, [selectedIds, removeDecision])

  const visibleColumns = useMemo(() => columns.filter((column) => column.visible), [columns])

  const persistColumns = useCallback(
    (next: AuditColumnConfig[]) => {
      setAuditColumns(next)
      void writeSettings({ auditColumns: next })
    },
    [setAuditColumns],
  )

  useEffect(() => {
    if (!menu) return
    function onClick() {
      setMenu(null)
    }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onClick)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onClick)
    }
  }, [menu])

  function startResize(id: AuditColumnId, event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    const startColumn = columnsRef.current.find((column) => column.id === id)
    if (!startColumn) return
    const startX = event.clientX
    const startWidth = startColumn.width

    function onMove(moveEvent: MouseEvent) {
      const delta = moveEvent.clientX - startX
      const width = Math.max(40, Math.min(800, startWidth + delta))
      setAuditColumns(
        columnsRef.current.map((column) => (column.id === id ? { ...column, width } : column)),
      )
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      void writeSettings({ auditColumns: columnsRef.current })
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function onHeaderContextMenu(event: React.MouseEvent) {
    event.preventDefault()
    setMenu({ x: event.clientX, y: event.clientY })
  }

  function toggleVisible(id: AuditColumnId) {
    const visibleCount = columns.filter((c) => c.visible).length
    const next = columns.map((column) => {
      if (column.id !== id) return column
      if (column.visible && visibleCount <= 1) return column
      return { ...column, visible: !column.visible }
    })
    persistColumns(next)
  }

  function resetColumns() {
    persistColumns([...DEFAULT_AUDIT_COLUMNS])
    setMenu(null)
  }

  function onDragStart(id: AuditColumnId) {
    setDragId(id)
  }

  function onDragOver(id: AuditColumnId, event: React.DragEvent) {
    if (!dragId || dragId === id) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverId(id)
  }

  function onDrop(targetId: AuditColumnId, event: React.DragEvent) {
    event.preventDefault()
    if (!dragId || dragId === targetId) {
      setDragId(null)
      setDragOverId(null)
      return
    }
    const sourceIdx = columns.findIndex((c) => c.id === dragId)
    const targetIdx = columns.findIndex((c) => c.id === targetId)
    if (sourceIdx < 0 || targetIdx < 0) return
    const next = [...columns]
    const [moved] = next.splice(sourceIdx, 1)
    next.splice(targetIdx, 0, moved)
    persistColumns(next)
    setDragId(null)
    setDragOverId(null)
  }

  function onDragEnd() {
    setDragId(null)
    setDragOverId(null)
  }

  return (
    <div className="audit-view">
      <div className="audit-view__toolbar">
        {selectedIds.size > 0 && (
          <AuditBulkBar
            selectedIds={selectedIds}
            onClear={() => setSelectedIds(new Set())}
            onKeep={handleBulkKeep}
            onCut={handleBulkCut}
            onRating={handleBulkRating}
            onColor={handleBulkColor}
            onReset={handleBulkReset}
          />
        )}
        <div className="audit-filter-pill" role="group" aria-label="Filter tracks">
          {(['all', 'decided', 'undecided'] as Filter[]).map((value) => (
            <button
              key={value}
              type="button"
              className={`audit-filter-pill__btn${filter === value ? ' is-active' : ''}`}
              onClick={() => setFilter(value)}
            >
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
        <span className="top-bar__meta audit-view__hint">
          Right-click a column header for visibility · drag headers to reorder · drag the edge to resize.
        </span>
      </div>
      <table className="audit-table">
        <colgroup>
          <col style={{ width: 36 }} />
          {visibleColumns.map((column) => (
            <col key={column.id} style={{ width: column.width }} />
          ))}
        </colgroup>
        <thead onContextMenu={onHeaderContextMenu}>
          <tr>
            <th className="audit-th--check">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={onToggleAll}
              />
            </th>
            {visibleColumns.map((column) => (
              <th
                key={column.id}
                className={`audit-th${dragOverId === column.id ? ' is-drag-over' : ''}${dragId === column.id ? ' is-dragging' : ''}`}
                draggable
                onDragStart={() => onDragStart(column.id)}
                onDragOver={(event) => onDragOver(column.id, event)}
                onDrop={(event) => onDrop(column.id, event)}
                onDragEnd={onDragEnd}
              >
                <span className="audit-th__label">{AUDIT_COLUMN_LABELS[column.id]}</span>
                <span
                  className="audit-th__resize"
                  onMouseDown={(event) => startResize(column.id, event)}
                  aria-hidden="true"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ track, index, decision }, rowIndex) => (
            <tr key={track.id} onClick={() => onSelectIndex(index)}>
              <td className="audit-td--check" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(track.id)}
                  onClick={(e) => onToggleRow(track.id, rowIndex, e)}
                  onChange={() => {}}
                />
              </td>
              {visibleColumns.map((column) => (
                <td key={column.id} className={`audit-td audit-td--${column.id}`}>
                  {renderCell(column.id, track, index, decision)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {menu ? (
        <div
          className="audit-menu"
          style={{ top: menu.y, left: menu.x }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="audit-menu__title">Columns</div>
          {columns.map((column) => (
            <label key={column.id} className="audit-menu__item">
              <input
                type="checkbox"
                checked={column.visible}
                onChange={() => toggleVisible(column.id)}
              />
              <span>{AUDIT_COLUMN_LABELS[column.id]}</span>
            </label>
          ))}
          <button type="button" className="audit-menu__reset" onClick={resetColumns}>
            Reset to defaults
          </button>
        </div>
      ) : null}
    </div>
  )
}

function renderCell(
  id: AuditColumnId,
  track: Track,
  index: number,
  decision: TrackDecision | undefined,
): React.ReactNode {
  switch (id) {
    case 'index':
      return index + 1
    case 'title':
      return track.title || 'Untitled'
    case 'artist':
      return track.artist || 'Unknown'
    case 'album':
      return track.album || '—'
    case 'bpm':
      return track.bpm != null ? track.bpm.toFixed(1) : '—'
    case 'key':
      return track.key || '—'
    case 'duration':
      return formatDuration(track.durationSec)
    case 'rating':
      return renderRating(decision?.rating ?? track.rating)
    case 'color': {
      const colorId = decision?.colorId ?? track.colorId
      const color = REKORDBOX_COLORS.find((entry) => entry.id === colorId)
      if (!color || color.id === 0) return '—'
      return (
        <span className="audit-color-dot" style={{ background: color.hex }} title={color.label} />
      )
    }
    case 'decision':
      if (!decision) return '—'
      return (
        <span className={`audit-chip audit-chip--${decision.keep ? 'keep' : 'cut'}`}>
          {decision.keep ? 'Keep' : 'Cut'}
        </span>
      )
    case 'comment':
      return track.comment ? <span className="audit-clip">{track.comment}</span> : '—'
    case 'playCount':
      return track.playCount ?? 0
    case 'dateAdded':
      return formatDate(track.dateAdded)
    case 'lastPlayed':
      return formatDate(track.lastPlayed)
    case 'fileType': {
      const ext = track.path.split('.').pop()
      return ext ? `.${ext.toLowerCase()}` : '—'
    }
  }
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString()
}

function renderRating(rating: number): React.ReactNode {
  const filled = Math.max(0, Math.min(5, Math.round(rating)))
  return (
    <span className="audit-stars" aria-label={`${filled} of 5`}>
      {'★'.repeat(filled)}
      {'☆'.repeat(5 - filled)}
    </span>
  )
}
