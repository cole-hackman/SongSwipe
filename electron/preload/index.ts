import { contextBridge, ipcRenderer } from 'electron'

export type SongSwipeApi = {
  rb: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>
  fileExists: (filePath: string) => Promise<boolean>
  toFileUrl: (filePath: string) => Promise<string>
  revealInFinder: (filePath: string) => Promise<void>
  readSession: () => Promise<unknown>
  writeSession: (data: unknown) => Promise<void>
}

const api: SongSwipeApi = {
  rb: (method, params = {}) => ipcRenderer.invoke('rb:call', method, params),
  fileExists: (filePath) => ipcRenderer.invoke('fs:exists', filePath),
  toFileUrl: (filePath) => ipcRenderer.invoke('fs:toFileUrl', filePath),
  revealInFinder: (filePath) => ipcRenderer.invoke('fs:reveal', filePath),
  readSession: () => ipcRenderer.invoke('session:read'),
  writeSession: (data) => ipcRenderer.invoke('session:write', data),
}

contextBridge.exposeInMainWorld('api', api)
