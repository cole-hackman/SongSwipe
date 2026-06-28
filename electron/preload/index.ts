import { contextBridge, ipcRenderer } from 'electron'

export type SidecarStatusPayload = {
  state: 'starting' | 'ready' | 'error'
  error?: string
  stderr?: string
}

export type BatchRulePayload = {
  id: string
  enabled: boolean
  field: 'bpm' | 'rating' | 'key'
  op: 'lt' | 'gt' | 'eq' | 'empty'
  value?: string | number
  action: 'suggest_keep' | 'suggest_cull'
}

export type AppSettingsPayload = {
  dbPathOverride?: string | null
  zeroRatingOnCull?: boolean
  prefetchAhead?: number
  prefetchBehind?: number
  autoPlay?: boolean
  waveformBarWidth?: number
  waveformNormalize?: boolean
  waveformFastMode?: boolean
  batchRules?: BatchRulePayload[]
  sessionMode?: 'triage' | 'audit' | 'compare'
  keymap?: Record<string, string>
  gamepadEnabled?: boolean
  midiEnabled?: boolean
}

export type NamedSessionMeta = {
  id: string
  name: string
  updatedAt: string
}

export type SongSwipeApi = {
  rb: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>
  fileExists: (filePath: string) => Promise<boolean>
  batchFileExists: (paths: string[]) => Promise<Record<string, boolean>>
  getCachedPeaks: (filePath: string) => Promise<{
    filePath: string
    duration: number
    peaks: number[][]
    updatedAt: string
  } | null>
  saveCachedPeaks: (filePath: string, peaks: number[][], duration: number) => Promise<void>
  toFileUrl: (filePath: string) => Promise<string>
  revealInFinder: (filePath: string) => Promise<void>
  readSession: () => Promise<unknown>
  writeSession: (data: unknown) => Promise<void>
  listNamedSessions: () => Promise<NamedSessionMeta[]>
  saveNamedSession: (id: string, data: unknown) => Promise<void>
  loadNamedSession: (id: string) => Promise<unknown>
  deleteNamedSession: (id: string) => Promise<void>
  exportTextFile: (
    defaultName: string,
    contents: string,
    filters: Array<{ name: string; extensions: string[] }>,
  ) => Promise<string | null>
  sidecarStatus: () => Promise<SidecarStatusPayload>
  ensureSidecarReady: () => Promise<SidecarStatusPayload>
  readSettings: () => Promise<AppSettingsPayload>
  writeSettings: (settings: AppSettingsPayload) => Promise<AppSettingsPayload>
  getDbPath: () => Promise<string | null>
}

const api: SongSwipeApi = {
  rb: (method, params = {}) => ipcRenderer.invoke('rb:call', method, params),
  fileExists: (filePath) => ipcRenderer.invoke('fs:exists', filePath),
  batchFileExists: (paths) => ipcRenderer.invoke('fs:batchExists', paths),
  getCachedPeaks: (filePath) => ipcRenderer.invoke('peaks:get', filePath),
  saveCachedPeaks: (filePath, peaks, duration) =>
    ipcRenderer.invoke('peaks:save', filePath, peaks, duration),
  toFileUrl: (filePath) => ipcRenderer.invoke('fs:toFileUrl', filePath),
  revealInFinder: (filePath) => ipcRenderer.invoke('fs:reveal', filePath),
  readSession: () => ipcRenderer.invoke('session:read'),
  writeSession: (data) => ipcRenderer.invoke('session:write', data),
  listNamedSessions: () => ipcRenderer.invoke('sessions:list'),
  saveNamedSession: (id, data) => ipcRenderer.invoke('sessions:save', id, data),
  loadNamedSession: (id) => ipcRenderer.invoke('sessions:load', id),
  deleteNamedSession: (id) => ipcRenderer.invoke('sessions:delete', id),
  exportTextFile: (defaultName, contents, filters) =>
    ipcRenderer.invoke('export:textFile', defaultName, contents, filters),
  sidecarStatus: () => ipcRenderer.invoke('sidecar:status'),
  ensureSidecarReady: () => ipcRenderer.invoke('sidecar:ensureReady'),
  readSettings: () => ipcRenderer.invoke('settings:read'),
  writeSettings: (settings) => ipcRenderer.invoke('settings:write', settings),
  getDbPath: () => ipcRenderer.invoke('settings:getDbPath'),
}

contextBridge.exposeInMainWorld('api', api)
