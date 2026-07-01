import type { AppSettingsPayload, NamedSessionMeta } from '@/lib/api'

function requireApi() {
  if (!window.api) {
    throw new Error('SongSwipe API is unavailable')
  }
  return window.api
}

export function rb<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  if (!window.api) {
    return Promise.reject(new Error('SongSwipe API is unavailable'))
  }
  return window.api.rb<T>(method, params)
}

export async function ensureSidecarReady() {
  return requireApi().ensureSidecarReady()
}

export async function getSidecarStatus() {
  return requireApi().sidecarStatus()
}

export async function readSettings(): Promise<AppSettingsPayload> {
  return requireApi().readSettings()
}

export async function writeSettings(settings: AppSettingsPayload): Promise<AppSettingsPayload> {
  return requireApi().writeSettings(settings)
}

export async function toMediaUrl(filePath: string): Promise<string> {
  return requireApi().toFileUrl(filePath)
}

export async function fileExists(filePath: string): Promise<boolean> {
  return requireApi().fileExists(filePath)
}

export async function batchFileExists(paths: string[]): Promise<Record<string, boolean>> {
  return requireApi().batchFileExists(paths)
}

export async function getCachedPeaks(filePath: string) {
  return requireApi().getCachedPeaks(filePath)
}

export async function saveCachedPeaks(
  filePath: string,
  peaks: number[][],
  duration: number,
): Promise<void> {
  await requireApi().saveCachedPeaks(filePath, peaks, duration)
}

export async function readSession<T>(): Promise<T | null> {
  return (await requireApi().readSession()) as T | null
}

export async function writeSession(data: unknown): Promise<void> {
  await requireApi().writeSession(data)
}

export async function listNamedSessions(): Promise<NamedSessionMeta[]> {
  return requireApi().listNamedSessions()
}

export async function saveNamedSession(id: string, data: unknown): Promise<void> {
  await requireApi().saveNamedSession(id, data)
}

export async function loadNamedSession<T>(id: string): Promise<T> {
  return (await requireApi().loadNamedSession(id)) as T
}

export async function deleteNamedSession(id: string): Promise<void> {
  await requireApi().deleteNamedSession(id)
}

export async function exportTextFile(
  defaultName: string,
  contents: string,
  filters: Array<{ name: string; extensions: string[] }>,
): Promise<string | null> {
  return requireApi().exportTextFile(defaultName, contents, filters)
}
