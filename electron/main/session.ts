import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type SessionData = {
  sourcePlaylistId?: string | null
  destinationPlaylistId?: string | null
  cullPlaylistId?: string | null
  currentIndex?: number
  decisions?: Record<string, unknown>
  sessionMode?: 'triage' | 'audit' | 'compare'
  updatedAt?: string
}

function sessionPath(): string {
  return path.join(app.getPath('userData'), 'session.json')
}

export async function readSession(): Promise<SessionData | null> {
  try {
    const raw = await readFile(sessionPath(), 'utf8')
    return JSON.parse(raw) as SessionData
  } catch {
    return null
  }
}

export async function writeSession(data: SessionData): Promise<void> {
  const dir = path.dirname(sessionPath())
  await mkdir(dir, { recursive: true })
  await writeFile(sessionPath(), JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2))
}
