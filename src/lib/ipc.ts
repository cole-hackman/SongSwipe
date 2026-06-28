import type { AppSettingsPayload, NamedSessionMeta } from '@/lib/api'

export function rb<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  if (!window.api) {
    return Promise.reject(new Error('SongSwipe API is unavailable'))
  }
  return window.api.rb<T>(method, params)
}

export async function ensureSidecarReady() {
  return window.api.ensureSidecarReady()
}

export async function getSidecarStatus() {
  return window.api.sidecarStatus()
}

export async function readSettings(): Promise<AppSettingsPayload> {
  return window.api.readSettings()
}

export async function writeSettings(settings: AppSettingsPayload): Promise<AppSettingsPayload> {
  return window.api.writeSettings(settings)
}

export async function toMediaUrl(filePath: string): Promise<string> {
  return window.api.toFileUrl(filePath)
}

export async function fileExists(filePath: string): Promise<boolean> {
  return window.api.fileExists(filePath)
}

export async function batchFileExists(paths: string[]): Promise<Record<string, boolean>> {
  return window.api.batchFileExists(paths)
}

export async function getCachedPeaks(filePath: string) {
  return window.api.getCachedPeaks(filePath)
}

export async function saveCachedPeaks(
  filePath: string,
  peaks: number[][],
  duration: number,
): Promise<void> {
  await window.api.saveCachedPeaks(filePath, peaks, duration)
}

export async function readSession<T>(): Promise<T | null> {
  return (await window.api.readSession()) as T | null
}

export async function writeSession(data: unknown): Promise<void> {
  await window.api.writeSession(data)
}

export async function listNamedSessions(): Promise<NamedSessionMeta[]> {
  return window.api.listNamedSessions()
}

export async function saveNamedSession(id: string, data: unknown): Promise<void> {
  await window.api.saveNamedSession(id, data)
}

export async function loadNamedSession<T>(id: string): Promise<T | null> {
  return (await window.api.loadNamedSession(id)) as T | null
}

export async function deleteNamedSession(id: string): Promise<void> {
  await window.api.deleteNamedSession(id)
}

export async function exportTextFile(
  defaultName: string,
  contents: string,
  filters: Array<{ name: string; extensions: string[] }>,
): Promise<string | null> {
  return window.api.exportTextFile(defaultName, contents, filters)
}
