import { app } from 'electron'
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { SessionData } from './session'

export type NamedSessionMeta = {
  id: string
  name: string
  updatedAt: string
}

export type NamedSessionData = SessionData & { name?: string }

function sessionsDir(): string {
  return path.join(app.getPath('userData'), 'sessions')
}

function sessionFile(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9-_]/g, '-')
  return path.join(sessionsDir(), `${safe}.json`)
}

export async function listNamedSessions(): Promise<NamedSessionMeta[]> {
  await mkdir(sessionsDir(), { recursive: true })
  const files = await readdir(sessionsDir())
  const items: NamedSessionMeta[] = []
  for (const file of files.filter((f) => f.endsWith('.json'))) {
    const raw = await readFile(path.join(sessionsDir(), file), 'utf8')
    const data = JSON.parse(raw) as NamedSessionData
    items.push({
      id: file.replace(/\.json$/, ''),
      name: data.name ?? file,
      updatedAt: data.updatedAt ?? '',
    })
  }
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function saveNamedSession(id: string, data: NamedSessionData): Promise<void> {
  await mkdir(sessionsDir(), { recursive: true })
  await writeFile(
    sessionFile(id),
    JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2),
  )
}

export async function loadNamedSession(id: string): Promise<NamedSessionData | null> {
  try {
    const raw = await readFile(sessionFile(id), 'utf8')
    return JSON.parse(raw) as NamedSessionData
  } catch {
    return null
  }
}

export async function deleteNamedSession(id: string): Promise<void> {
  await unlink(sessionFile(id))
}
