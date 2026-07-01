import { useEffect, useState } from 'react'
import {
  deleteNamedSession,
  exportTextFile,
  listNamedSessions,
  loadNamedSession,
  saveNamedSession,
} from '@/lib/ipc'
import type { NamedSessionMeta } from '@/lib/api'
import { buildSessionReportCsv, buildSessionReportJson } from '@/lib/session-report'
import type { TrackDecision } from '@/lib/types'
import { useDecisionsStore } from '@/store/decisions'
import { useQueueStore } from '@/store/queue'
import { useSettingsStore } from '@/store/settings'

type NamedSessionSnapshot = {
  name?: string
  sourcePlaylistId?: string | null
  destinationPlaylistId?: string | null
  cutPlaylistId?: string | null
  currentIndex?: number
  decisions?: Record<string, TrackDecision>
  sessionMode?: string
}

export function NamedSessions() {
  const [sessions, setSessions] = useState<NamedSessionMeta[]>([])
  const [name, setName] = useState('')
  const decisions = useDecisionsStore((s) => s.decisions)
  const hydrate = useDecisionsStore((s) => s.hydrate)
  const tracks = useQueueStore((s) => s.tracks)
  const sourcePlaylistId = useQueueStore((s) => s.sourcePlaylistId)
  const currentIndex = useQueueStore((s) => s.currentIndex)
  const selectPlaylist = useQueueStore((s) => s.selectPlaylist)
  const setCurrentIndex = useQueueStore((s) => s.setCurrentIndex)
  const destinationPlaylistId = useSettingsStore((s) => s.destinationPlaylistId)
  const cutPlaylistId = useSettingsStore((s) => s.cutPlaylistId)
  const sessionMode = useSettingsStore((s) => s.sessionMode)
  const setDestinationPlaylistId = useSettingsStore((s) => s.setDestinationPlaylistId)
  const setCutPlaylistId = useSettingsStore((s) => s.setCutPlaylistId)
  const setSessionMode = useSettingsStore((s) => s.setSessionMode)

  useEffect(() => {
    void listNamedSessions().then(setSessions)
  }, [])

  async function refreshSessions() {
    setSessions(await listNamedSessions())
  }

  async function save() {
    const id = slugify(name)
    if (!id) return
    await saveNamedSession(id, {
      name,
      sourcePlaylistId,
      destinationPlaylistId,
      cutPlaylistId,
      currentIndex,
      decisions,
      sessionMode,
    })
    await refreshSessions()
    setName('')
  }

  async function load(id: string) {
    const data = await loadNamedSession<NamedSessionSnapshot>(id)
    if (!data) return
    if (data.destinationPlaylistId) setDestinationPlaylistId(data.destinationPlaylistId)
    if (data.cutPlaylistId) setCutPlaylistId(data.cutPlaylistId)
    if (data.sessionMode) setSessionMode(data.sessionMode as 'triage' | 'audit' | 'compare')
    if (data.sourcePlaylistId) await selectPlaylist(data.sourcePlaylistId)
    if (typeof data.currentIndex === 'number') setCurrentIndex(data.currentIndex)
    if (data.decisions) hydrate(data.decisions)
  }

  async function remove(id: string) {
    await deleteNamedSession(id)
    await refreshSessions()
  }

  async function exportCsv() {
    await exportTextFile('songswipe-session.csv', buildSessionReportCsv(tracks, decisions), [
      { name: 'CSV', extensions: ['csv'] },
    ])
  }

  async function exportJson() {
    await exportTextFile('songswipe-session.json', buildSessionReportJson(tracks, decisions), [
      { name: 'JSON', extensions: ['json'] },
    ])
  }

  return (
    <div className="panel-block">
      <h2>Named sessions</h2>
      <input
        className="input"
        value={name}
        placeholder="Friday crate dig"
        onChange={(e) => setName(e.target.value)}
      />
      <button type="button" className="btn" onClick={() => void save()}>
        Save
      </button>
      <div className="action-row">
        <button type="button" className="btn" onClick={() => void exportCsv()}>
          Export CSV
        </button>
        <button type="button" className="btn" onClick={() => void exportJson()}>
          Export JSON
        </button>
      </div>
      <ul className="named-sessions__list">
        {sessions.map((session) => (
          <li key={session.id} className="named-sessions__item">
            <button type="button" className="btn" onClick={() => void load(session.id)}>
              {session.name}
            </button>
            <button type="button" className="btn" onClick={() => void remove(session.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
